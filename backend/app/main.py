"""FastAPI application entrypoint."""

from datetime import date, datetime
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Path, Query, status
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import db


class NotificationResponse(BaseModel):
    proposal_num: int
    friend_request_num: int
    new_chat_num: int


class ProposalParticipantResponse(BaseModel):
    user_id: int
    status: str
    display_name: str
    icon_asset_url: str | None = None


class ProposalResponse(BaseModel):
    id: int
    title: str | None = None
    event_date: date | None = None
    location: str | None = None
    creator_id: int
    created_at: datetime
    deadline_at: datetime | None = None
    participants: List[ProposalParticipantResponse]


class ChatMessageRequest(BaseModel):
    body: str | None = None
    image: str | None = None

    @model_validator(mode="after")
    def ensure_payload(self) -> "ChatMessageRequest":
        if not (self.body or self.image):
            raise ValueError("Each message requires either body text or image data.")
        return self


class ChatMessagesPayload(BaseModel):
    user_id: int
    messages: List[ChatMessageRequest]

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id(cls, value: int | str) -> int:
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("user_id must be an integer.") from exc

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, value: List[ChatMessageRequest]) -> List[ChatMessageRequest]:
        if not value:
            raise ValueError("messages must contain at least one entry.")
        return value


class ChatMessageResponse(BaseModel):
    id: int
    chat_id: int
    user_id: int
    body: str | None = None
    image_url: str | None = None
    posted_at: datetime


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(title="ng_2512 backend")

    @app.get("/health", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get(
        "/api/notification",
        response_model=NotificationResponse,
        tags=["notification"],
    )
    def get_notification(
        user_id: int = Query(..., description="User identifier"),
        session: Session = Depends(db.get_session),
    ) -> NotificationResponse:
        try:
            proposal_count = db.count_pending_proposal_invites(session, user_id)
            friend_request_count = db.count_pending_friend_requests(session, user_id)
            new_chat_count = db.count_recent_incoming_messages(session, user_id)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

        return NotificationResponse(
            proposal_num=proposal_count,
            friend_request_num=friend_request_count,
            new_chat_num=new_chat_count,
        )

    @app.get(
        "/api/proposal",
        response_model=list[ProposalResponse],
        tags=["proposal"],
    )
    def list_proposals(
        user_id: int = Query(..., description="User identifier"),
        session: Session = Depends(db.get_session),
    ) -> list[ProposalResponse]:
        try:
            proposals = db.fetch_active_proposals(session, user_id)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

        return [
            ProposalResponse(
                id=proposal.id,
                title=proposal.title,
                event_date=proposal.event_date,
                location=proposal.location,
                creator_id=proposal.creator_id,
                created_at=proposal.created_at,
                deadline_at=proposal.deadline_at,
                participants=[
                    ProposalParticipantResponse(
                        user_id=participant.user_id,
                        status=participant.status,
                        display_name=participant.display_name,
                        icon_asset_url=participant.icon_asset_url,
                    )
                    for participant in proposal.participants
                ],
            )
            for proposal in proposals
        ]

    @app.post(
        "/api/chat/{group_id}",
        response_model=list[ChatMessageResponse],
        tags=["chat"],
        status_code=status.HTTP_201_CREATED,
    )
    def post_chat_messages(
        group_id: int = Path(..., description="Chat group identifier"),
        payload: ChatMessagesPayload = ...,
        session: Session = Depends(db.get_session),
    ) -> list[ChatMessageResponse]:
        try:
            created = db.create_chat_messages(
                session,
                chat_id=group_id,
                sender_id=payload.user_id,
                messages=[
                    db.NewChatMessage(body=msg.body, image=msg.image)
                    for msg in payload.messages
                ],
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

        return [
            ChatMessageResponse(
                id=message.id,
                chat_id=message.chat_id,
                user_id=message.sender_id,
                body=message.body,
                image_url=message.image_url,
                posted_at=message.posted_at,
            )
            for message in created
        ]

    return app


app = create_app()
