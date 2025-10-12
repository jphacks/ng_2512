"""Database session management and query helpers."""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
import secrets
from pathlib import Path
from typing import Iterable, Iterator, List, Sequence

import numpy as np
from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    delete,
    func,
    or_,
    select,
)
from sqlalchemy.engine import make_url
from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from . import ai_service
from .config import DATABASE_ECHO, DATABASE_URL


class Base(DeclarativeBase):
    """Base class for ORM models."""


def _create_engine(url: str):
    url_obj = make_url(url)
    engine_kwargs = {"echo": DATABASE_ECHO, "future": True}
    if url_obj.get_backend_name() == "sqlite":
        database_path = url_obj.database or ""
        if database_path and database_path != ":memory:":
            db_file = Path(database_path)
            db_file.parent.mkdir(parents=True, exist_ok=True)
            if os.getenv("BACKEND_TEST_USE_REAL_DB", "").lower() in {
                "1",
                "true",
                "yes",
                "on",
            }:
                db_file.unlink(missing_ok=True)
    elif url_obj.get_backend_name() == "mysql" and url_obj.drivername.endswith(
        "+pymysql"
    ):
        connect_args = dict(engine_kwargs.get("connect_args") or {})
        ssl_args = dict(connect_args.get("ssl") or {})
        ssl_args.setdefault("ssl", {})
        connect_args["ssl"] = ssl_args
        engine_kwargs["connect_args"] = connect_args
    return create_engine(url, **engine_kwargs)


engine = _create_engine(DATABASE_URL)
_SQLITE_TEST_RESET = engine.url.get_backend_name() == "sqlite" and os.getenv(
    "BACKEND_TEST_USE_REAL_DB", ""
).lower() in {"1", "true", "yes", "on"}

try:
    ALBUM_PHOTOS_AVAILABLE = inspect(engine).has_table("album_photos")
except Exception:  # pragma: no cover - inspector may fail during init
    ALBUM_PHOTOS_AVAILABLE = False


class _ResettingSession(Session):
    """Session subclass that resets SQLite state between tests."""

    _needs_reset = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if _SQLITE_TEST_RESET and _ResettingSession._needs_reset:
            bind = self.get_bind()
            if bind is not None:
                Base.metadata.drop_all(bind=bind)
                Base.metadata.create_all(bind=bind)
            _ResettingSession._needs_reset = False

    def close(self):
        try:
            super().close()
        finally:
            if _SQLITE_TEST_RESET:
                _ResettingSession._needs_reset = True


SessionLocal = sessionmaker(
    bind=engine,
    class_=_ResettingSession,
    autoflush=False,
    expire_on_commit=False,
)


# --- ORM table definitions -------------------------------------------------


class Proposal(Base):
    """ORM representation of the proposals table."""

    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    creator_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ProposalParticipant(Base):
    """ORM representation of the proposal_participants table."""

    __tablename__ = "proposal_participants"

    proposal_id: Mapped[int] = mapped_column(
        ForeignKey("proposals.id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String(length=32))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserFriendship(Base):
    """ORM representation of the user_friendships table."""

    __tablename__ = "user_friendships"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    friend_user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String(length=32))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ChatGroup(Base):
    """ORM representation of the chat_groupes table."""

    __tablename__ = "chat_groupes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    icon_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ChatMember(Base):
    """ORM representation of the chat_members table."""

    __tablename__ = "chat_members"

    chat_groupe_id: Mapped[int] = mapped_column(
        ForeignKey("chat_groupes.id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_viewed_message_id: Mapped[int] = mapped_column(Integer)


class ChatMessage(Base):
    """ORM representation of the chat_messages table."""

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    chat_id: Mapped[int] = mapped_column(Integer)
    sender_id: Mapped[int] = mapped_column(Integer)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class User(Base):
    """ORM representation of the users table."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    assets_id: Mapped[str] = mapped_column(String(length=128))
    account_id: Mapped[str] = mapped_column(String(length=128))
    display_name: Mapped[str] = mapped_column(String(length=255))
    icon_asset_url: Mapped[str | None] = mapped_column(String(length=2048), nullable=True)
    face_asset_url: Mapped[str | None] = mapped_column(String(length=2048), nullable=True)
    profile_text: Mapped[str | None] = mapped_column(Text, nullable=True)


class Asset(Base):
    """ORM representation of the assets table."""

    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(Integer)
    content_type: Mapped[str] = mapped_column(String(length=255))
    storage_key: Mapped[str] = mapped_column(String(length=1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Album(Base):
    """ORM representation of the albums table."""

    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    creator_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlbumSharedUser(Base):
    """ORM representation of the album_shared_users table."""

    __tablename__ = "album_shared_users"

    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str | None] = mapped_column(String(length=64), nullable=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AlbumPhoto(Base):
    """ORM representation of the album_photos table."""

    __tablename__ = "album_photos"

    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id"), primary_key=True)
    photo_url: Mapped[str] = mapped_column(String(length=512), primary_key=True)
    id: Mapped[int] = mapped_column(Integer, nullable=False)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class VLMObservation(Base):
    """ORM representation of the vlm_observations table."""

    __tablename__ = "vlm_observations"

    observation_id: Mapped[str] = mapped_column(String, primary_key=True)
    asset_id: Mapped[str | None] = mapped_column(String(length=64), nullable=True)
    observation_hash: Mapped[str] = mapped_column(String(length=255))
    model_version: Mapped[str] = mapped_column(String(length=255))
    prompt_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    initiator_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    schedule_candidates: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    member_candidates: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extra_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


# --- Data transfer helpers -------------------------------------------------


@dataclass
class ProposalParticipantData:
    """Serializable participant payload."""

    user_id: int
    status: str
    display_name: str | None
    icon_asset_url: str | None


@dataclass
class ProposalData:
    """Serializable proposal payload."""

    id: int
    title: str | None
    event_date: date | None
    location: str | None
    creator_id: int
    created_at: datetime
    deadline_at: datetime | None
    participants: List[ProposalParticipantData] = field(default_factory=list)


@dataclass
class ChatMessageData:
    """Serializable chat message payload."""

    id: int
    chat_id: int
    sender_id: int
    sender_name: str
    sender_icon_url: str | None
    body: str | None
    image_url: str | None
    posted_at: datetime


@dataclass
class NewChatMessage:
    """Input payload for creating a chat message."""

    body: str | None = None
    image: str | None = None


@dataclass
class ChatGroupSummary:
    """Summary information for a chat group."""

    chat_groupe_id: int
    title: str
    icon_url: str | None
    last_message: str | None
    last_message_date: datetime | None
    new_chat_num: int


@dataclass
class AlbumSummary:
    """Summary information for an album."""

    album_id: int
    title: str
    last_uploaded_image_url: str | None
    image_num: int
    shared_user_num: int


@dataclass
class AlbumPhotoData:
    """Album photo payload."""

    image_id: int
    image_url: str
    uploaded_at: datetime


@dataclass
class AIProposalSuggestion:
    """AI proposal suggestion payload."""

    title: str
    event_date: datetime
    location: str | None
    participant_ids: List[int]


# --- Session utilities -----------------------------------------------------


def get_session() -> Iterator[Session]:
    """FastAPI dependency that yields a SQLAlchemy session."""
    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# --- Notification helpers --------------------------------------------------


def count_pending_proposal_invites(session: Session, user_id: int) -> int:
    """Return the number of proposals awaiting the given user's response."""
    stmt = (
        select(func.count())
        .select_from(ProposalParticipant)
        .where(ProposalParticipant.user_id == user_id)
        .where(ProposalParticipant.status.in_(("invited", "pending")))
    )
    return session.scalar(stmt) or 0


def count_pending_friend_requests(session: Session, user_id: int) -> int:
    """Return the number of pending friend requests directed to the user."""
    stmt = (
        select(func.count())
        .select_from(UserFriendship)
        .where(UserFriendship.friend_user_id == user_id)
        .where(UserFriendship.status == "requested")
    )
    return session.scalar(stmt) or 0


def count_unread_messages(session: Session, user_id: int) -> int:
    """Return the total number of unread chat messages for the user."""
    memberships = session.execute(
        select(ChatMember.chat_groupe_id, ChatMember.last_viewed_message_id)
        .where(ChatMember.user_id == user_id)
    ).all()

    total = 0
    for chat_id, last_viewed in memberships:
        stmt = (
            select(func.count())
            .select_from(ChatMessage)
            .where(ChatMessage.chat_id == chat_id)
            .where(ChatMessage.sender_id != user_id)
        )
        if last_viewed is not None:
            stmt = stmt.where(ChatMessage.id > last_viewed)
        total += session.scalar(stmt) or 0
    return total


# --- Proposal queries ------------------------------------------------------


def fetch_active_proposals(session: Session, user_id: int) -> list[ProposalData]:
    """Return active proposals for the specified user."""
    now = datetime.now(timezone.utc)
    eligible_proposals = (
        select(Proposal.id)
        .join(ProposalParticipant, Proposal.id == ProposalParticipant.proposal_id)
        .where(ProposalParticipant.user_id == user_id)
        .where(ProposalParticipant.status.in_(("invited", "pending")))
        .where(or_(Proposal.deadline_at.is_(None), Proposal.deadline_at > now))
        .distinct()
    ).subquery()

    rows = session.execute(
        select(Proposal, ProposalParticipant, User)
        .join(ProposalParticipant, Proposal.id == ProposalParticipant.proposal_id)
        .join(User, ProposalParticipant.user_id == User.id)
        .where(Proposal.id.in_(select(eligible_proposals.c.id)))
        .order_by(Proposal.created_at.desc(), ProposalParticipant.user_id.asc())
    ).all()

    proposals: dict[int, ProposalData] = {}
    for proposal_obj, participant_obj, user_obj in rows:
        data = proposals.get(proposal_obj.id)
        if data is None:
            data = ProposalData(
                id=proposal_obj.id,
                title=proposal_obj.title or "",
                event_date=proposal_obj.event_date,
                location=proposal_obj.location,
                creator_id=proposal_obj.creator_id,
                created_at=proposal_obj.created_at,
                deadline_at=proposal_obj.deadline_at,
            )
            proposals[proposal_obj.id] = data

        data.participants.append(
            ProposalParticipantData(
                user_id=user_obj.id,
                status=participant_obj.status,
                display_name=user_obj.display_name or "",
                icon_asset_url=getattr(user_obj, "icon_asset_url", None),
            )
        )

    return list(proposals.values())


def create_proposal(
    session: Session,
    *,
    user_id: int,
    title: str,
    event_date: datetime,
    location: str | None,
    participant_ids: Sequence[int],
) -> int:
    """Create a proposal and participant rows."""
    now = datetime.now(timezone.utc)
    proposal = Proposal(
        title=title,
        event_date=event_date.date(),
        location=location,
        creator_id=user_id,
        created_at=now,
        deadline_at=None,
    )
    session.add(proposal)
    session.flush()

    participant_set = {pid for pid in participant_ids if pid != user_id}

    # Creator is considered accepted by default
    session.merge(
        ProposalParticipant(
            proposal_id=proposal.id,
            user_id=user_id,
            status="accepted",
            updated_at=now,
        )
    )

    for participant_id in participant_set:
        session.merge(
            ProposalParticipant(
                proposal_id=proposal.id,
                user_id=participant_id,
                status="invited",
                updated_at=now,
            )
        )

    session.commit()
    return proposal.id


def _parse_datetime(value: object, fallback: datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
    return fallback


def _parse_participants(raw: object) -> list[int]:
    if isinstance(raw, list):
        result: list[int] = []
        for item in raw:
            try:
                result.append(int(item))
            except (TypeError, ValueError):
                continue
        return result
    if isinstance(raw, dict):
        return _parse_participants(list(raw.values()))
    return []


def fetch_ai_proposal_suggestion(session: Session, user_id: int) -> AIProposalSuggestion:
    """Return the latest AI proposal suggestion for the user."""
    observation = session.execute(
        select(VLMObservation)
        .where(VLMObservation.initiator_user_id == user_id)
        .order_by(VLMObservation.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    fallback_date = datetime.now(timezone.utc) + timedelta(days=3)

    if observation and observation.schedule_candidates:
        if isinstance(observation.schedule_candidates, list):
            candidate = observation.schedule_candidates[0] if observation.schedule_candidates else {}
        elif isinstance(observation.schedule_candidates, dict):
            candidate = next(iter(observation.schedule_candidates.values()), {})
        else:
            candidate = {}
        title = candidate.get("title") or "New Gathering"
        location = candidate.get("location")
        event_date = _parse_datetime(candidate.get("event_date"), fallback_date)
        participant_ids = _parse_participants(observation.member_candidates)
    else:
        title = "Friendly Meetup"
        location = "Local Cafe"
        event_date = fallback_date
        participant_ids = []

    if not participant_ids:
        participant_ids = [user_id]

    return AIProposalSuggestion(
        title=title,
        event_date=event_date,
        location=location,
        participant_ids=participant_ids,
    )


# --- Chat queries ----------------------------------------------------------


def fetch_chat_groups(session: Session, user_id: int) -> list[ChatGroupSummary]:
    """Return chat groups for the user with unread counts."""
    memberships = session.execute(
        select(ChatGroup, ChatMember)
        .join(ChatMember, ChatGroup.id == ChatMember.chat_groupe_id)
        .where(ChatMember.user_id == user_id)
    ).all()

    summaries: list[ChatGroupSummary] = []
    for group, membership in memberships:
        last_message = session.execute(
            select(ChatMessage)
            .where(ChatMessage.chat_id == group.id)
            .order_by(ChatMessage.id.desc())
            .limit(1)
        ).scalar_one_or_none()

        unread_stmt = (
            select(func.count())
            .select_from(ChatMessage)
            .where(ChatMessage.chat_id == group.id)
            .where(ChatMessage.sender_id != user_id)
        )
        if membership.last_viewed_message_id is not None:
            unread_stmt = unread_stmt.where(
                ChatMessage.id > membership.last_viewed_message_id
            )
        unread = session.scalar(unread_stmt) or 0

        if last_message:
            if last_message.body:
                last_content = last_message.body
            elif last_message.image_url:
                last_content = "[image]"
            else:
                last_content = ""
            last_date = last_message.posted_at
        else:
            last_content = ""
            last_date = None

        summaries.append(
            ChatGroupSummary(
                chat_groupe_id=group.id,
                title=group.title,
                icon_url=group.icon_url,
                last_message=last_content,
                last_message_date=last_date,
                new_chat_num=unread,
            )
        )

    summaries.sort(
        key=lambda item: item.last_message_date or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return summaries


def create_chat_group(
    session: Session,
    *,
    title: str,
    member_ids: Sequence[int],
    icon_url: str | None = None,
) -> int:
    """Create a chat group and attach members."""
    now = datetime.now(timezone.utc)
    group = ChatGroup(title=title, icon_url=icon_url, created_at=now)
    session.add(group)
    session.flush()

    inserted_members: set[int] = set()
    for member_id in member_ids:
        if member_id in inserted_members:
            continue
        session.merge(
            ChatMember(
                chat_groupe_id=group.id,
                user_id=member_id,
                last_viewed_message_id=0,
            )
        )
        inserted_members.add(member_id)

    session.commit()
    return group.id


def fetch_chat_messages(
    session: Session,
    *,
    chat_id: int,
    oldest_chat_id: int | None,
    limit: int = 20,
) -> list[ChatMessageData]:
    """Return chat messages ordered from newest to oldest."""
    stmt = (
        select(ChatMessage, User)
        .join(User, ChatMessage.sender_id == User.id)
        .where(ChatMessage.chat_id == chat_id)
    )
    if oldest_chat_id is not None:
        stmt = stmt.where(ChatMessage.id < oldest_chat_id)

    rows = session.execute(
        stmt.order_by(ChatMessage.id.desc()).limit(limit)
    ).all()

    messages: list[ChatMessageData] = []
    for message, user_obj in rows:
        messages.append(
            ChatMessageData(
                id=message.id,
                chat_id=message.chat_id,
                sender_id=message.sender_id,
                sender_name=user_obj.display_name or "",
                sender_icon_url=getattr(user_obj, "icon_asset_url", None),
                body=message.body,
                image_url=message.image_url,
                posted_at=message.posted_at,
            )
        )

    messages.reverse()
    return messages


def create_chat_messages(
    session: Session,
    chat_id: int,
    sender_id: int,
    messages: Iterable[NewChatMessage],
) -> list[ChatMessageData]:
    """Persist chat messages and return the created records."""
    created: list[ChatMessageData] = []
    last_message_id: int | None = None

    for payload in messages:
        if not payload.body and not payload.image:
            raise ValueError("Each message requires either body or image content.")

        posted_at = datetime.now(timezone.utc)
        message = ChatMessage(
            chat_id=chat_id,
            sender_id=sender_id,
            body=payload.body,
            image_url=payload.image,
            posted_at=posted_at,
        )
        session.add(message)
        session.flush()

        user_obj = session.get(User, sender_id)

        created.append(
            ChatMessageData(
                id=message.id,
                chat_id=message.chat_id,
                sender_id=message.sender_id,
                sender_name=user_obj.display_name if user_obj else "",
                sender_icon_url=getattr(user_obj, "icon_asset_url", None) if user_obj else None,
                body=message.body,
                image_url=message.image_url,
                posted_at=message.posted_at,
            )
        )
        last_message_id = message.id

    if last_message_id is not None:
        membership = session.get(ChatMember, (chat_id, sender_id))
        if membership is None:
            session.add(
                ChatMember(
                    chat_groupe_id=chat_id,
                    user_id=sender_id,
                    last_viewed_message_id=last_message_id or 0,
                )
            )
        else:
            membership.last_viewed_message_id = last_message_id

    session.commit()
    return created


def add_chat_member(session: Session, chat_id: int, user_id: int) -> None:
    """Add a user to a chat group if not already a member."""
    existing = session.get(ChatMember, (chat_id, user_id))
    if existing is None:
        session.add(
            ChatMember(
                chat_groupe_id=chat_id,
                user_id=user_id,
                last_viewed_message_id=0,
            )
        )
        session.commit()


# --- Album queries ---------------------------------------------------------


def _assert_album_support() -> None:
    if not ALBUM_PHOTOS_AVAILABLE:
        raise RuntimeError("Album photo support is not available on this database.")


def _generate_album_photo_id() -> int:
    """Return a positive pseudo-random identifier suitable for BIGINT columns."""
    value = secrets.randbits(63)
    while value == 0:
        value = secrets.randbits(63)
    return value


def fetch_albums(
    session: Session,
    *,
    user_id: int,
    oldest_album_id: int | None,
    limit: int = 10,
) -> list[AlbumSummary]:
    """Return accessible albums for the user."""
    _assert_album_support()
    albums_stmt = (
        select(Album)
        .outerjoin(AlbumSharedUser, Album.id == AlbumSharedUser.album_id)
        .where(
            or_(
                Album.creator_id == user_id,
                AlbumSharedUser.user_id == user_id,
            )
        )
        .distinct()
    )
    if oldest_album_id is not None:
        albums_stmt = albums_stmt.where(Album.id < oldest_album_id)

    albums = session.execute(
        albums_stmt.order_by(Album.created_at.desc()).limit(limit)
    ).scalars().all()

    summaries: list[AlbumSummary] = []
    for album in albums:
        last_photo = session.execute(
            select(AlbumPhoto)
            .where(AlbumPhoto.album_id == album.id)
            .order_by(AlbumPhoto.uploaded_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        image_count = session.scalar(
            select(func.count()).where(AlbumPhoto.album_id == album.id)
        ) or 0
        shared_count = session.scalar(
            select(func.count()).where(AlbumSharedUser.album_id == album.id)
        ) or 0

        summaries.append(
            AlbumSummary(
                album_id=album.id,
                title=album.title,
                last_uploaded_image_url=last_photo.photo_url if last_photo else None,
                image_num=image_count,
                shared_user_num=shared_count,
            )
        )

    return summaries


def create_album(session: Session, *, user_id: int, title: str) -> int:
    """Create an album and return its identifier."""
    _assert_album_support()
    now = datetime.now(timezone.utc)
    album = Album(title=title, creator_id=user_id, created_at=now)
    session.add(album)
    session.flush()

    session.add(
        AlbumSharedUser(
            album_id=album.id,
            user_id=user_id,
            role="owner",
            added_at=now,
        )
    )
    session.commit()
    return album.id


def fetch_album_photos(
    session: Session,
    *,
    album_id: int,
    user_id: int,
    oldest_image_id: int | None,
    limit: int = 30,
) -> tuple[bool, list[AlbumPhotoData]]:
    """Return album photos with newest first along with ownership."""
    _assert_album_support()
    album = session.get(Album, album_id)
    if album is None:
        raise ValueError("Album not found.")

    stmt = select(AlbumPhoto).where(AlbumPhoto.album_id == album_id)
    if oldest_image_id is not None:
        stmt = stmt.where(AlbumPhoto.id < oldest_image_id)

    photos = session.execute(
        stmt.order_by(AlbumPhoto.id.desc()).limit(limit)
    ).scalars().all()

    data = [
        AlbumPhotoData(
            image_id=photo.id,
            image_url=photo.photo_url,
            uploaded_at=photo.uploaded_at,
        )
        for photo in photos
    ]

    return album.creator_id == user_id, data


def add_album_photos(
    session: Session,
    *,
    album_id: int,
    photo_urls: Sequence[str],
) -> list[AlbumPhotoData]:
    """Insert new album photos and return their metadata."""
    _assert_album_support()
    now = datetime.now(timezone.utc)
    created: list[AlbumPhotoData] = []
    for url in photo_urls:
        photo = AlbumPhoto(
            id=_generate_album_photo_id(),
            album_id=album_id,
            photo_url=url,
            captured_at=None,
            uploaded_at=now,
        )
        session.add(photo)
        session.flush()
        created.append(
            AlbumPhotoData(
                image_id=photo.id,
                image_url=photo.photo_url,
                uploaded_at=photo.uploaded_at,
            )
        )

    session.commit()
    return created


def update_album(
    session: Session,
    *,
    album_id: int,
    title: str,
    shared_user_ids: Sequence[int],
) -> None:
    """Update album metadata and membership."""
    _assert_album_support()
    album = session.get(Album, album_id)
    if album is None:
        raise ValueError("Album not found.")

    album.title = title

    current_users = {
        user_id
        for user_id in session.execute(
            select(AlbumSharedUser.user_id).where(AlbumSharedUser.album_id == album_id)
        ).scalars()
    }

    desired_users = set(shared_user_ids) | {album.creator_id}

    # Add missing users
    now = datetime.now(timezone.utc)
    for user_id in desired_users - current_users:
        session.add(
            AlbumSharedUser(
                album_id=album_id,
                user_id=user_id,
                role="viewer",
                added_at=now,
            )
        )

    # Remove users no longer shared (but never remove creator)
    for user_id in current_users - desired_users:
        session.execute(
            delete(AlbumSharedUser).where(
                AlbumSharedUser.album_id == album_id,
                AlbumSharedUser.user_id == user_id,
            )
        )

    session.commit()


def _initialize_sqlite_schema() -> None:
    """Ensure SQLite databases used in tests have the expected schema."""
    if engine.url.get_backend_name() != "sqlite":
        return
    Base.metadata.create_all(bind=engine)
    global ALBUM_PHOTOS_AVAILABLE
    ALBUM_PHOTOS_AVAILABLE = True


_initialize_sqlite_schema()


# --- Face Matching queries --------------------------------------------------

def _cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Calculates the cosine similarity between two vectors."""
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))


async def find_user_by_face_embedding(
    session: Session,
    target_embedding: list[float],
    confidence_threshold: float = 0.8,
) -> tuple[User | None, float]:
    """Finds the user with the most similar face embedding."""
    all_users = session.execute(select(User).where(User.face_asset_url.isnot(None))).scalars().all()
    if not all_users:
        return None, 0.0

    # Fetch all embeddings in parallel
    tasks = [ai_service.generate_embedding_from_url(user.face_asset_url) for user in all_users if user.face_asset_url]
    user_embeddings = await asyncio.gather(*tasks)

    best_match_user = None
    highest_similarity = -1.0
    target_vector = np.array(target_embedding)

    for user, embedding in zip(all_users, user_embeddings):
        if embedding is None:
            continue

        similarity = _cosine_similarity(target_vector, np.array(embedding))
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match_user = user

    if best_match_user and highest_similarity >= confidence_threshold:
        return best_match_user, highest_similarity
    else:
        return None, 0.0


# --- User queries ----------------------------------------------------------

def create_user(
    session: Session,
    *,
    account_id: str,
    display_name: str,
    icon_image: str | None,
    face_image: str,
    profile_text: str | None,
) -> int:
    """Create or update a user and return the user ID."""
    user = session.execute(
        select(User).where(User.account_id == account_id)
    ).scalar_one_or_none()

    if user:
        # Update existing user
        user.display_name = display_name
        user.profile_text = profile_text
        if icon_image:
            user.icon_asset_url = icon_image
        if face_image:
            user.face_asset_url = face_image
    else:
        # Create new user
        user = User(
            account_id=account_id,
            display_name=display_name,
            icon_asset_url=icon_image,
            face_asset_url=face_image,
            profile_text=profile_text,
            assets_id="",  # This might need a better default
        )
        session.add(user)

    session.commit()
    return user.id


def update_user(
    session: Session,
    *,
    user_id: int,
    account_id: str,
    display_name: str,
    icon_image: str | None,
    face_image: str | None,
    profile_text: str | None,
) -> None:
    """Update a user's profile."""
    user = session.get(User, user_id)
    if not user:
        raise ValueError("User not found.")

    user.account_id = account_id
    user.display_name = display_name
    user.profile_text = profile_text
    if icon_image:
        user.icon_asset_url = icon_image
    if face_image:
        user.face_asset_url = face_image

    session.commit()
