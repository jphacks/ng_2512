import importlib
import os
import sys
import tempfile
import typing
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy.util import typing as sa_typing


def _load_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip()


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

_load_env()

DB_FILE = Path(tempfile.gettempdir()) / "backend_test.sqlite"
_ORIG_EVAL_EXPRESSION = sa_typing.eval_expression


def _patched_eval_expression(expression, module_name, *, locals_=None, in_class=None):
    if isinstance(expression, str) and "|" in expression:
        parts = [part.strip() for part in expression.split("|") if part.strip()]
        if parts:
            updated_locals = dict(locals_ or {})
            updated_locals.setdefault("typing", typing)
            if "None" in parts and len(parts) == 2:
                # Simplify common Optional[...] case
                non_none = next(part for part in parts if part != "None")
                expression = f"typing.Optional[{non_none}]"
            else:
                expression = f"typing.Union[{', '.join(parts)}]"
            locals_ = updated_locals
    return _ORIG_EVAL_EXPRESSION(expression, module_name, locals_=locals_, in_class=in_class)


sa_typing.eval_expression = _patched_eval_expression

db = None


def _load_db_module(db_url: str):
    os.environ["DATABASE_URL"] = db_url
    os.environ["DATABASE_ECHO"] = "0"
    config_module = importlib.import_module("backend.app.config")
    importlib.reload(config_module)
    db_module = importlib.import_module("backend.app.db")
    db_module = importlib.reload(db_module)
    db_module.Proposal.__table__.c.deadline_at.nullable = True
    db_module.UserFriendship.__table__.c.responded_at.nullable = True
    db_module.Base.metadata.create_all(bind=db_module.engine)
    return db_module


db = _load_db_module(f"sqlite:///{DB_FILE}")


@pytest.fixture
def session():
    global db
    db_path = Path(tempfile.gettempdir()) / f"backend_test_{uuid.uuid4().hex}.sqlite"
    db = _load_db_module(f"sqlite:///{db_path}")
    session_obj = db.SessionLocal()
    try:
        yield session_obj
    finally:
        session_obj.close()
        db.engine.dispose()
        if db_path.exists():
            db_path.unlink()


def _create_user(
    session,
    user_id: int,
    name: str,
    icon_key: typing.Optional[str] = None,
) -> None:
    asset_id = None
    if icon_key is not None:
        asset_id = f"asset-{user_id}"
        session.add(db.Asset(id=asset_id, storage_key=icon_key))
    session.add(db.User(id=user_id, display_name=name, icon_asset_id=asset_id))
    session.commit()


def test_notification_and_proposal_queries(session):
    _create_user(session, 1, "Alice", "icon://alice")
    _create_user(session, 2, "Bob")

    now = datetime.now(timezone.utc)
    session.add(
        db.UserFriendship(
            user_id=1,
            friend_user_id=2,
            status="pending",
            requested_at=now,
            responded_at=now,
        )
    )
    session.commit()

    proposal_id = db.create_proposal(
        session,
        user_id=1,
        title="Picnic",
        event_date=now,
        location="Central Park",
        participant_ids=[1, 2],
    )

    invite_count = db.count_pending_proposal_invites(session, user_id=2)
    assert invite_count == 1

    friend_requests = db.count_pending_friend_requests(session, user_id=2)
    assert friend_requests == 1

    proposals = db.fetch_active_proposals(session, user_id=2)
    assert len(proposals) == 1
    assert proposals[0].id == proposal_id
    participants = {p.user_id: p for p in proposals[0].participants}
    assert participants[1].status == "accepted"
    assert participants[2].status == "invited"


def test_ai_proposal_suggestion(session):
    now = datetime.now(timezone.utc)
    session.add(
        db.VLMObservation(
            observation_id="obs-1",
            initiator_user_id=1,
            schedule_candidates=[
                {
                    "title": "Dinner",
                    "location": "Diner",
                    "event_date": (now + timedelta(days=1)).isoformat(),
                }
            ],
            member_candidates=[2, 3],
            extra_metadata=None,
            created_at=now,
        )
    )
    session.commit()

    suggestion = db.fetch_ai_proposal_suggestion(session, user_id=1)
    assert suggestion.title == "Dinner"
    assert suggestion.location == "Diner"
    assert suggestion.participant_ids == [2, 3]


def test_chat_workflow(session):
    _create_user(session, 1, "Alice", "icon://alice")
    _create_user(session, 2, "Bob", "icon://bob")

    group_id = db.create_chat_group(session, title="General", member_ids=[1, 2])

    with pytest.raises(ValueError):
        db.create_chat_messages(
            session,
            chat_id=group_id,
            sender_id=1,
            messages=[db.NewChatMessage()],
        )

    created = db.create_chat_messages(
        session,
        chat_id=group_id,
        sender_id=1,
        messages=[
            db.NewChatMessage(body="Hello"),
            db.NewChatMessage(image="https://example.com/image.png"),
        ],
    )
    assert len(created) == 2
    assert created[0].body == "Hello"
    assert created[1].image_url is not None

    member = session.get(db.ChatMember, (group_id, 2))
    member.last_viewed_message_id = created[0].id
    session.commit()

    messages = db.fetch_chat_messages(session, chat_id=group_id, oldest_chat_id=None)
    assert len(messages) == 2
    assert messages[0].body == "Hello"

    summaries = db.fetch_chat_groups(session, user_id=2)
    assert len(summaries) == 1
    assert summaries[0].new_chat_num == 1
    assert summaries[0].last_message == "[image]"

    unread = db.count_unread_messages(session, user_id=2)
    assert unread == 1

    db.add_chat_member(session, chat_id=group_id, user_id=3)
    assert session.get(db.ChatMember, (group_id, 3)) is not None


def test_album_flow(session):
    _create_user(session, 1, "Alice")
    _create_user(session, 2, "Bob")

    album_id = db.create_album(session, user_id=1, title="Trip")

    added = db.add_album_photos(
        session,
        album_id=album_id,
        photo_urls=["https://example.com/a.jpg", "https://example.com/b.jpg"],
    )
    assert len(added) == 2

    db.update_album(session, album_id=album_id, title="Trip Updated", shared_user_ids=[2])

    is_creator, photos = db.fetch_album_photos(
        session,
        album_id=album_id,
        user_id=1,
        oldest_image_id=None,
    )
    assert is_creator is True
    assert len(photos) == 2

    summaries = db.fetch_albums(session, user_id=2, oldest_album_id=None)
    assert len(summaries) == 1
    assert summaries[0].title == "Trip Updated"
    assert summaries[0].shared_user_num == 2
    assert summaries[0].last_uploaded_image_url in {
        "https://example.com/a.jpg",
        "https://example.com/b.jpg",
    }

    is_creator_view, shared_photos = db.fetch_album_photos(
        session,
        album_id=album_id,
        user_id=2,
        oldest_image_id=None,
    )
    assert is_creator_view is False
    assert len(shared_photos) == 2


def test_get_session_context_manager(session):
    generator = db.get_session()
    session_obj = next(generator)
    assert session_obj.bind == db.engine
    generator.close()
