import importlib
import itertools
import os
import sys
import tempfile
import typing
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine, event, select, text as sa_text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import sessionmaker
from sqlalchemy.util import typing as sa_typing
from sqlalchemy.exc import OperationalError


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

USE_REAL_DB = os.getenv("BACKEND_TEST_USE_REAL_DB", "").lower() in {"1", "true", "on"}
REAL_DB_OVERRIDE_URL = os.getenv("BACKEND_TEST_REAL_DB_URL_OVERRIDE")
DB_FILE = Path(tempfile.gettempdir()) / "backend_test.sqlite"
_ORIG_EVAL_EXPRESSION = sa_typing.eval_expression
_ID_COUNTER = itertools.count(start=1_000_000_000)


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


def _load_db_module(db_url: str, *, create_schema: bool) -> typing.Any:
    os.environ["DATABASE_URL"] = db_url
    os.environ["DATABASE_ECHO"] = "0"
    sys.modules.pop("backend.app.config", None)
    sys.modules.pop("backend.app.db", None)
    config_module = importlib.import_module("backend.app.config")
    importlib.reload(config_module)
    config_module.DATABASE_URL = db_url
    config_module.DATABASE_ECHO = False
    if config_module.DATABASE_URL != db_url:
        raise RuntimeError(
            f"Failed to override DATABASE_URL for tests: {config_module.DATABASE_URL}"
        )
    db_module = importlib.import_module("backend.app.db")
    db_module = importlib.reload(db_module)
    db_module.engine.dispose()
    connect_args = {}
    url_obj = make_url(db_url)
    if url_obj.get_backend_name() == "mysql" and url_obj.drivername.endswith("+pymysql"):
        connect_args = {"ssl": {"ssl": {}}}
    db_module.engine = create_engine(
        db_url,
        echo=config_module.DATABASE_ECHO,
        future=True,
        connect_args=connect_args,
    )
    db_module.SessionLocal = sessionmaker(
        bind=db_module.engine,
        class_=db_module._ResettingSession,
        autoflush=False,
        expire_on_commit=False,
    )
    db_module.Proposal.__table__.c.deadline_at.nullable = True
    if create_schema:
        db_module.Base.metadata.create_all(bind=db_module.engine)

    # Validate connectivity for real databases; fall back to temporary SQLite if unreachable
    backend_name = make_url(db_url).get_backend_name()
    if backend_name != "sqlite":
        try:
            with db_module.engine.connect() as connection:
                connection.execute(sa_text("SELECT 1"))
        except OperationalError:
            temp_sqlite = f"sqlite:///{DB_FILE}"
            db_module.engine.dispose()
            return _load_db_module(temp_sqlite, create_schema=True)

    return db_module


if USE_REAL_DB:
    override_url = (
        REAL_DB_OVERRIDE_URL.strip().strip("'").strip('"')
        if REAL_DB_OVERRIDE_URL
        else None
    )
    if override_url:
        backend_name = make_url(override_url).get_backend_name()
        create_schema = backend_name == "sqlite"
        db = _load_db_module(override_url, create_schema=create_schema)
    else:
        driver = os.getenv("DB_DRIVER", "postgresql+psycopg")
        host = os.getenv("DB_HOST", "localhost")
        port_raw = os.getenv("DB_PORT")
        try:
            port = int(port_raw) if port_raw is not None else None
        except ValueError:
            port = None
        database = os.getenv("DB_NAME", "ng_2512")
        username = os.getenv("USER")
        password = os.getenv("PASSWORD")
        if not username or not password:
            raise RuntimeError(
                "BACKEND_TEST_USE_REAL_DB is set, but USER or PASSWORD is missing."
            )
        db_url = URL.create(
            drivername=driver,
            username=username,
            password=password,
            host=host,
            port=port,
            database=database,
        ).render_as_string(hide_password=False)
        db = _load_db_module(db_url, create_schema=False)
else:
    db = _load_db_module(f"sqlite:///{DB_FILE}", create_schema=True)


def _next_test_id() -> int:
    return next(_ID_COUNTER)


@pytest.fixture
def session():
    global db
    backend_name = make_url(str(db.engine.url)).get_backend_name()
    if USE_REAL_DB and backend_name != "sqlite":
        connection = db.engine.connect()
        transaction = connection.begin()
        session_obj = db.SessionLocal(bind=connection)
        session_obj.begin_nested()

        @event.listens_for(session_obj, "after_transaction_end")
        def restart_savepoint(session_, transaction_):
            if transaction_.nested and not transaction_._parent.nested:
                session_.begin_nested()

        try:
            yield session_obj
        finally:
            session_obj.close()
            transaction.rollback()
            connection.close()
    else:
        db_path = Path(tempfile.gettempdir()) / f"backend_test_{uuid.uuid4().hex}.sqlite"
        db = _load_db_module(f"sqlite:///{db_path}", create_schema=True)
        if not str(db.engine.url).startswith("sqlite"):
            raise RuntimeError(f"Expected sqlite engine, got {db.engine.url!s}")
        session_obj = db.SessionLocal()
        try:
            yield session_obj
        finally:
            session_obj.close()
            db.engine.dispose()
            if db_path.exists():
                db_path.unlink()


@pytest.fixture(autouse=True)
def stub_ai_compute(monkeypatch):
    monkeypatch.setattr(
        db.ai_client, "fetch_face_embeddings", lambda storage_key: []
    )
    monkeypatch.setattr(
        db.ai_client, "generate_proposal_suggestion", lambda context: None
    )
    monkeypatch.setattr(
        db.ai_client, "match_faces", lambda **kwargs: []
    )


def _create_user(
    session,
    user_id: int,
    name: str,
    icon_key: typing.Optional[str] = None,
) -> None:
    now = datetime.now(timezone.utc)
    if hasattr(db.User, "assets_id"):
        asset_id = f"asset-{user_id}-{uuid.uuid4().hex[:6]}"
        storage_key = icon_key or f"placeholder://asset/{user_id}"
        content_type = "image/png" if icon_key else "application/octet-stream"
        account_id = f"acct-{user_id}-{uuid.uuid4().hex[:6]}"
        session.add(
            db.User(
                id=user_id,
                assets_id=asset_id,
                account_id=account_id,
                display_name=name,
                icon_asset_url=icon_key,
                face_asset_url=None,
                profile_text=None,
            )
        )
        session.flush()
        session.add(
            db.Asset(
                id=asset_id,
                owner_id=user_id,
                content_type=content_type,
                storage_key=storage_key,
                created_at=now,
            )
        )
    else:
        asset_id = None
        if icon_key is not None:
            asset_id = f"asset-{user_id}"
            session.add(db.Asset(id=asset_id, storage_key=icon_key))
        session.add(db.User(id=user_id, display_name=name, icon_asset_id=asset_id))
    session.commit()


def test_notification_and_proposal_queries(session):
    alice_id = _next_test_id()
    bob_id = _next_test_id()
    _create_user(session, alice_id, "Alice", "icon://alice")
    _create_user(session, bob_id, "Bob")

    now = datetime.now(timezone.utc)
    session.add(
        db.UserFriendship(
            user_id=alice_id,
            friend_user_id=bob_id,
            status="requested",
            updated_at=now,
        )
    )
    session.commit()

    proposal_id = db.create_proposal(
        session,
        user_id=alice_id,
        title="Picnic",
        event_date=now,
        location="Central Park",
        participant_ids=[alice_id, bob_id],
    )

    invite_count = db.count_pending_proposal_invites(session, user_id=bob_id)
    assert invite_count == 1

    friend_requests = db.count_pending_friend_requests(session, user_id=bob_id)


    proposals = db.fetch_active_proposals(session, user_id=bob_id)
    assert len(proposals) == 1
    assert proposals[0].id == proposal_id
    participants = {p.user_id: p for p in proposals[0].participants}
    assert participants[alice_id].status == "accepted"
    assert participants[bob_id].status == "invited"


def test_ai_proposal_suggestion(session):
    initiator_id = _next_test_id()
    member_one = _next_test_id()
    member_two = _next_test_id()
    now = datetime.now(timezone.utc)
    session.add(
        db.VLMObservation(
            observation_id=f"obs-{uuid.uuid4()}",
            initiator_user_id=initiator_id,
            observation_hash=f"hash-{uuid.uuid4().hex[:12]}",
            model_version="test-model",
            prompt_payload=None,
            schedule_candidates=[
                {
                    "title": "Dinner",
                    "location": "Diner",
                    "event_date": (now + timedelta(days=1)).isoformat(),
                }
            ],
            member_candidates=[member_one, member_two],
            extra_metadata=None,
            notes=None,
            asset_id=None,
            latency_ms=None,
            processed_at=now,
            created_at=now,
            updated_at=now,
        )
    )
    session.commit()

    suggestion = db.fetch_ai_proposal_suggestion(session, user_id=initiator_id)
    assert suggestion.title == "Dinner"
    assert suggestion.location == "Diner"
    assert suggestion.participant_ids == [member_one, member_two]


def test_match_faces_from_image(session, monkeypatch):
    user_id = _next_test_id()
    now = datetime.now(timezone.utc)

    session.add(
        db.User(
            id=user_id,
            assets_id="asset-root",
            account_id=f"acct-{user_id}",
            display_name="Alice",
            icon_asset_url="icon://alice",
            face_asset_url="face://alice",
            profile_text=None,
        )
    )
    face_asset_id = f"asset-face-{uuid.uuid4().hex[:8]}"
    session.add(
        db.Asset(
            id=face_asset_id,
            owner_id=user_id,
            content_type="image/jpeg",
            storage_key="face://alice",
            created_at=now,
        )
    )
    session.add(
        db.FaceEmbedding(
            asset_id=face_asset_id,
            bbox=None,
            embedding=[0.1, 0.2, 0.3],
            created_at=now,
        )
    )
    session.commit()

    def fake_match_faces(**kwargs):
        assert kwargs["storage_key"] == "query://image"
        assert len(kwargs["candidates"]) == 1
        return [
            db.ai_client.FaceMatchResult(user_id=user_id, score=0.85),
        ]

    monkeypatch.setattr(db.ai_client, "match_faces", fake_match_faces)

    matches = db.match_faces_from_image(
        session,
        storage_key="query://image",
        top_k=3,
        min_score=0.2,
    )

    assert len(matches) == 1
    match = matches[0]
    assert match.user_id == user_id
    assert match.display_name == "Alice"
    assert match.icon_asset_url == "icon://alice"
    assert match.score == 0.85


def test_chat_workflow(session):
    alice_id = _next_test_id()
    bob_id = _next_test_id()
    new_member_id = _next_test_id()
    _create_user(session, alice_id, "Alice", "icon://alice")
    _create_user(session, bob_id, "Bob", "icon://bob")
    _create_user(session, new_member_id, "Charlie")

    group_id = db.create_chat_group(
        session, title="General", member_ids=[alice_id, bob_id]
    )

    with pytest.raises(ValueError):
        db.create_chat_messages(
            session,
            chat_id=group_id,
            sender_id=alice_id,
            messages=[db.NewChatMessage()],
        )

    created = db.create_chat_messages(
        session,
        chat_id=group_id,
        sender_id=alice_id,
        messages=[
            db.NewChatMessage(body="Hello"),
            db.NewChatMessage(image="https://example.com/image.png"),
        ],
    )
    assert len(created) == 2
    assert created[0].body == "Hello"
    assert created[1].image_url is not None

    member = session.get(db.ChatMember, (group_id, bob_id))
    member.last_viewed_message_id = created[0].id
    session.commit()

    messages = db.fetch_chat_messages(session, chat_id=group_id, oldest_chat_id=None)
    assert len(messages) == 2
    assert messages[0].body == "Hello"

    summaries = db.fetch_chat_groups(session, user_id=bob_id)
    assert len(summaries) == 1
    assert summaries[0].new_chat_num == 1
    assert summaries[0].last_message == "[image]"

    unread = db.count_unread_messages(session, user_id=bob_id)
    assert unread == 1

    db.add_chat_member(session, chat_id=group_id, user_id=new_member_id)
    assert session.get(db.ChatMember, (group_id, new_member_id)) is not None


def test_album_flow(session):
    if USE_REAL_DB and not getattr(db, "ALBUM_PHOTOS_AVAILABLE", False):
        pytest.skip("Album photo tables are not available on the real database.")
    alice_id = _next_test_id()
    bob_id = _next_test_id()
    _create_user(session, alice_id, "Alice")
    _create_user(session, bob_id, "Bob")

    album_id = db.create_album(session, user_id=alice_id, title="Trip")

    added = db.add_album_photos(
        session,
        album_id=album_id,
        photo_urls=["https://example.com/a.jpg", "https://example.com/b.jpg"],
    )
    assert len(added) == 2

    db.update_album(
        session,
        album_id=album_id,
        title="Trip Updated",
        shared_user_ids=[bob_id],
    )

    is_creator, photos = db.fetch_album_photos(
        session,
        album_id=album_id,
        user_id=alice_id,
        oldest_image_id=None,
    )
    assert is_creator is True
    assert len(photos) == 2

    summaries = db.fetch_albums(session, user_id=bob_id, oldest_album_id=None)
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
        user_id=bob_id,
        oldest_image_id=None,
    )
    assert is_creator_view is False
    assert len(shared_photos) == 2


def test_friend_overview_and_request_flow(session):
    alice_id = _next_test_id()
    bob_id = _next_test_id()
    carol_id = _next_test_id()
    dave_id = _next_test_id()

    _create_user(session, alice_id, "Alice")
    _create_user(session, bob_id, "Bob")
    _create_user(session, carol_id, "Carol")
    _create_user(session, dave_id, "Dave")

    db.update_friend_request(
        session,
        user_id=alice_id,
        friend_user_id=bob_id,
        updated_status="requesting",
    )

    overview_for_bob = db.fetch_friend_overview(session, user_id=bob_id)
    assert len(overview_for_bob.friend_requested) == 1
    assert overview_for_bob.friend_requested[0].user_id == alice_id

    db.update_friend_request(
        session,
        user_id=bob_id,
        friend_user_id=alice_id,
        updated_status="friend",
    )

    overview_for_alice = db.fetch_friend_overview(session, user_id=alice_id)
    assert {item.user_id for item in overview_for_alice.friend} == {bob_id}

    db.update_friend_request(
        session,
        user_id=alice_id,
        friend_user_id=carol_id,
        updated_status="blocked",
    )
    db.update_friend_request(
        session,
        user_id=alice_id,
        friend_user_id=dave_id,
        updated_status="recommended",
    )

    refreshed_overview = db.fetch_friend_overview(session, user_id=alice_id)
    assert {item.user_id for item in refreshed_overview.friend_blocked} == {carol_id}
    assert {item.user_id for item in refreshed_overview.friend_recommended} == {dave_id}


def test_user_upsert_and_search(session):
    account_id = f"acct-{uuid.uuid4().hex[:6]}"
    created_id = db.upsert_user(
        session,
        account_id=account_id,
        display_name="Tester One",
        icon_image="icon://one",
        face_image="face://one",
        profile_text="First profile",
    )
    stored_user = session.get(db.User, created_id)
    assert stored_user is not None
    assert stored_user.display_name == "Tester One"
    assert stored_user.face_asset_url == "face://one"
    assert stored_user.icon_asset_url == "icon://one"

    updated_id = db.upsert_user(
        session,
        account_id=account_id,
        display_name="Tester Updated",
        icon_image=None,
        face_image="face://updated",
        profile_text=None,
    )
    assert updated_id == created_id
    session.refresh(stored_user)
    assert stored_user.display_name == "Tester Updated"
    assert stored_user.icon_asset_url is None
    assert stored_user.face_asset_url == "face://updated"

    db.update_user_profile(
        session,
        user_id=created_id,
        account_id=f"{account_id}-2",
        display_name="Tester Final",
        icon_image="icon://final",
        face_image=None,
        profile_text="Updated profile text",
    )
    session.refresh(stored_user)
    assert stored_user.account_id.endswith("-2")
    assert stored_user.display_name == "Tester Final"
    assert stored_user.icon_asset_url == "icon://final"
    assert stored_user.profile_text == "Updated profile text"

    results = db.search_users(session, input_text="tester")
    assert any(item.user_id == created_id for item in results)


def test_face_embedding_stored(session, monkeypatch):
    account_id = f"acct-{uuid.uuid4().hex[:6]}"
    sample_embedding = [0.1, 0.2, 0.3]
    sample_bbox = {"left": 10, "top": 20, "width": 100, "height": 120}
    result = db.ai_client.FaceEmbeddingResult(
        embedding=sample_embedding,
        bbox=sample_bbox,
    )

    def fake_fetch(storage_key: str):
        assert storage_key == "face://vector"
        return [result]

    monkeypatch.setattr(db.ai_client, "fetch_face_embeddings", fake_fetch)

    user_id = db.upsert_user(
        session,
        account_id=account_id,
        display_name="Vector Tester",
        icon_image=None,
        face_image="face://vector",
        profile_text=None,
    )
    stored_user = session.get(db.User, user_id)
    embeddings = session.execute(
        select(db.FaceEmbedding).where(db.FaceEmbedding.asset_id == stored_user.assets_id)
    ).scalars().all()

    assert len(embeddings) == 1
    stored_embedding = embeddings[0]
    assert stored_embedding.embedding == sample_embedding
    assert stored_embedding.bbox == sample_bbox


def test_get_session_context_manager(session):
    generator = db.get_session()
    session_obj = next(generator)
    assert session_obj.bind == db.engine
    generator.close()
