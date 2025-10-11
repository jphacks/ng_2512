"""Database session management and query helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Iterator, List

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    func,
    or_,
    select,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .config import DATABASE_ECHO, DATABASE_URL


class Base(DeclarativeBase):
    """Base class for ORM models."""


engine = create_engine(DATABASE_URL, echo=DATABASE_ECHO, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Proposal(Base):
    """ORM representation of the proposals table."""

    __tablename__ = "proposals"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date)
    location: Mapped[str | None] = mapped_column(String)
    creator_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


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
    requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


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
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    icon_asset_id: Mapped[str | None] = mapped_column(String, nullable=True)


class Asset(Base):
    """ORM representation of the assets table."""

    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(primary_key=True)
    storage_key: Mapped[str | None] = mapped_column(String, nullable=True)


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
    body: str | None
    image_url: str | None
    posted_at: datetime


@dataclass
class NewChatMessage:
    """Input payload for creating a chat message."""

    body: str | None = None
    image: str | None = None


def get_session() -> Iterator[Session]:
    """FastAPI dependency that yields a SQLAlchemy session."""
    session: Session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


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
        select(func.cou+
        nt())
        .select_from(UserFriendship)
        .where(UserFriendship.friend_user_id == user_id)
        .where(UserFriendship.status == "pending")
    )
    return session.scalar(stmt) or 0


def count_recent_incoming_messages(session: Session, user_id: int, *, hours: int = 24) -> int:
    """Return the number of chat messages from others within the recent window."""
    threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
    stmt = (
        select(func.count())
        .select_from(ChatMessage)
        .where(ChatMessage.sender_id != user_id)
        .where(ChatMessage.posted_at >= threshold)
    )
    return session.scalar(stmt) or 0


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
        select(Proposal, ProposalParticipant, User, Asset)
        .join(ProposalParticipant, Proposal.id == ProposalParticipant.proposal_id)
        .join(User, ProposalParticipant.user_id == User.id)
        .outerjoin(Asset, User.icon_asset_id == Asset.id)
        .where(Proposal.id.in_(select(eligible_proposals.c.id)))
        .order_by(Proposal.created_at.desc(), ProposalParticipant.user_id.asc())
    ).all()

    proposals: dict[int, ProposalData] = {}
    for proposal_obj, participant_obj, user_obj, asset_obj in rows:
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
                icon_asset_url=(asset_obj.storage_key if asset_obj else None),
            )
        )

    return list(proposals.values())


def create_chat_messages(
    session: Session,
    chat_id: int,
    sender_id: int,
    messages: Iterable[NewChatMessage],
) -> list[ChatMessageData]:
    """Persist chat messages and return the created records."""
    created: list[ChatMessageData] = []

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

        created.append(
            ChatMessageData(
                id=message.id,
                chat_id=message.chat_id,
                sender_id=message.sender_id,
                body=message.body,
                image_url=message.image_url,
                posted_at=message.posted_at,
            )
        )

    session.commit()
    return created
