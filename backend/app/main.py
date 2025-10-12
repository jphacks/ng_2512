"""FastAPI application entrypoint implementing the JSON API described in api.md."""

from __future__ import annotations

from datetime import date, datetime
from typing import List

from fastapi import Body, Depends, FastAPI, HTTPException, Path, Query, status, UploadFile, File
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import ai_service, db, storage


# --- Pydantic schemas ------------------------------------------------------


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


class CreateProposalRequest(BaseModel):
    user_id: int
    title: str
    event_date: datetime
    location: str | None = None
    participant_ids: List[int] = Field(default_factory=list)

    @field_validator("participant_ids", mode="before")
    @classmethod
    def convert_participants(cls, value: object) -> List[int]:
        if value is None:
            return []
        if isinstance(value, list):
            result: list[int] = []
            for item in value:
                try:
                    result.append(int(item))
                except (TypeError, ValueError) as exc:  # pragma: no cover - validation
                    raise ValueError("participant_ids must contain integers.") from exc
            return result
        raise ValueError("participant_ids must be a list of identifiers.")


class AIProposalResponse(BaseModel):
    title: str
    event_date: datetime
    location: str | None = None
    participant_ids: List[int]


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
    chat_id: int
    sender_id: int
    sender_name: str
    sender_icon_url: str | None = None
    body: str | None = None
    image_url: str | None = None
    posted_at: datetime

    @field_validator("posted_at", mode="before")
    @classmethod
    def ensure_datetime(cls, value: datetime | str) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(value)


class ChatSummaryResponse(BaseModel):
    chat_groupe_id: int
    title: str
    icon_url: str | None = None
    last_message: str | None = None
    last_message_date: datetime | None = None
    new_chat_num: str


class ChatGroupCreateRequest(BaseModel):
    title: str
    member_ids: List[int]

    @field_validator("member_ids", mode="before")
    @classmethod
    def convert_members(cls, value: object) -> List[int]:
        if not isinstance(value, list):
            raise ValueError("member_ids must be a list.")
        members: list[int] = []
        for item in value:
            try:
                members.append(int(item))
            except (TypeError, ValueError) as exc:
                raise ValueError("member_ids must contain integers.") from exc
        if not members:
            raise ValueError("member_ids must not be empty.")
        return members


class ChatMemberInviteRequest(BaseModel):
    invite_user_id: int


class AlbumListItem(BaseModel):
    albam_id: int
    title: str
    last_uploaded_image_url: str | None = None
    image_num: int
    shared_user_num: int


class AlbumCreateRequest(BaseModel):
    user_id: int
    title: str


class AlbumPhotoResponse(BaseModel):
    is_creator: bool
    image_id: int
    image_url: str


class AlbumPhotoUploadRequest(BaseModel):
    photo: List[str]

    @field_validator("photo")
    @classmethod
    def validate_photos(cls, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("photo must contain at least one entry.")
        return value


class AlbumUpdateRequest(BaseModel):
    title: str
    shared_user_ids: List[int]

    @field_validator("shared_user_ids", mode="before")
    @classmethod
    def convert_shared_users(cls, value: object) -> List[int]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("shared_user_ids must be a list.")
        users: list[int] = []
        for item in value:
            try:
                users.append(int(item))
            except (TypeError, ValueError) as exc:
                raise ValueError("shared_user_ids must contain integers.") from exc
        return users


# --- FastAPI factory -------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(title="ng_2512 backend")

    @app.get("/health", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    # Notifications ---------------------------------------------------------

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
            new_chat_count = db.count_unread_messages(session, user_id)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return NotificationResponse(
            proposal_num=proposal_count,
            friend_request_num=friend_request_count,
            new_chat_num=new_chat_count,
        )

    # Proposals -------------------------------------------------------------

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
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

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
        "/api/proposal",
        status_code=status.HTTP_201_CREATED,
        tags=["proposal"],
    )
    def create_proposal(
        payload: CreateProposalRequest,
        session: Session = Depends(db.get_session),
    ) -> dict[str, int]:
        try:
            proposal_id = db.create_proposal(
                session,
                user_id=payload.user_id,
                title=payload.title,
                event_date=payload.event_date,
                location=payload.location,
                participant_ids=payload.participant_ids,
            )
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return {"proposal_id": proposal_id}

    @app.get(
        "/api/proposal/ai",
        response_model=AIProposalResponse,
        tags=["proposal"],
    )
    async def get_ai_proposal(
        user_id: int = Query(..., description="User identifier"),
        session: Session = Depends(db.get_session),
    ) -> AIProposalResponse:
        # Here you could generate a more specific prompt based on user data
        prompt = f"Create a proposal for user {user_id}"
        try:
            suggestion = await ai_service.get_ai_proposal_suggestion(prompt)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        return AIProposalResponse(
            title=suggestion["title"],
            event_date=suggestion["event_date"],
            location=suggestion["location"],
            participant_ids=suggestion["participant_ids"],
        )

    # Chats -----------------------------------------------------------------

    @app.get(
        "/api/chat",
        response_model=list[ChatSummaryResponse],
        tags=["chat"],
    )
    def list_chat_groups(
        user_id: int = Query(..., description="User identifier"),
        session: Session = Depends(db.get_session),
    ) -> list[ChatSummaryResponse]:
        try:
            summaries = db.fetch_chat_groups(session, user_id)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return [
            ChatSummaryResponse(
                chat_groupe_id=summary.chat_groupe_id,
                title=summary.title,
                icon_url=summary.icon_url,
                last_message=summary.last_message,
                last_message_date=summary.last_message_date,
                new_chat_num=str(summary.new_chat_num),
            )
            for summary in summaries
        ]

    @app.post(
        "/api/chat/groupe",
        status_code=status.HTTP_201_CREATED,
        tags=["chat"],
    )
    def create_chat_group(
        payload: ChatGroupCreateRequest,
        session: Session = Depends(db.get_session),
    ) -> dict[str, int]:
        try:
            group_id = db.create_chat_group(
                session,
                title=payload.title,
                member_ids=payload.member_ids,
            )
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return {"chat_groupe_id": group_id}

    @app.get(
        "/api/chat/{group_id}",
        response_model=list[ChatMessageResponse],
        tags=["chat"],
    )
    def get_chat_messages(
        group_id: int = Path(..., description="Chat group identifier"),
        oldest_chat_id: int | None = Query(None, description="Oldest chat id for pagination"),
        session: Session = Depends(db.get_session),
    ) -> list[ChatMessageResponse]:
        try:
            messages = db.fetch_chat_messages(
                session,
                chat_id=group_id,
                oldest_chat_id=oldest_chat_id,
            )
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return [
            ChatMessageResponse(
                chat_id=message.chat_id,
                sender_id=message.sender_id,
                sender_name=message.sender_name,
                sender_icon_url=message.sender_icon_url,
                body=message.body,
                image_url=message.image_url,
                posted_at=message.posted_at,
            )
            for message in messages
        ]

    @app.post(
        "/api/chat/{group_id}",
        response_model=list[ChatMessageResponse],
        tags=["chat"],
        status_code=status.HTTP_201_CREATED,
    )
    def post_chat_messages(
        group_id: int = Path(..., description="Chat group identifier"),
        payload: ChatMessagesPayload = Body(...),
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
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return [
            ChatMessageResponse(
                chat_id=message.chat_id,
                sender_id=message.sender_id,
                sender_name=message.sender_name,
                sender_icon_url=message.sender_icon_url,
                body=message.body,
                image_url=message.image_url,
                posted_at=message.posted_at,
            )
            for message in created
        ]

    @app.post(
        "/api/chat/{group_id}/member",
        status_code=status.HTTP_200_OK,
        tags=["chat"],
    )
    def add_chat_member(
        group_id: int = Path(..., description="Chat group identifier"),
        payload: ChatMemberInviteRequest = Body(...),
        session: Session = Depends(db.get_session),
    ) -> None:
        try:
            db.add_chat_member(session, group_id, payload.invite_user_id)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

    # Albums ----------------------------------------------------------------

    @app.get(
        "/api/albam",
        response_model=list[AlbumListItem],
        tags=["album"],
    )
    def list_albums(
        user_id: int = Query(..., description="User identifier"),
        oldest_albam_id: int | None = Query(
            None, description="Pagination anchor – fetch albums older than this id"
        ),
        session: Session = Depends(db.get_session),
    ) -> list[AlbumListItem]:
        try:
            albums = db.fetch_albums(
                session,
                user_id=user_id,
                oldest_album_id=oldest_albam_id,
            )
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return [
            AlbumListItem(
                albam_id=album.album_id,
                title=album.title,
                last_uploaded_image_url=album.last_uploaded_image_url,
                image_num=album.image_num,
                shared_user_num=album.shared_user_num,
            )
            for album in albums
        ]

    @app.post(
        "/api/albam",
        status_code=status.HTTP_201_CREATED,
        tags=["album"],
    )
    def create_album(
        payload: AlbumCreateRequest,
        session: Session = Depends(db.get_session),
    ) -> dict[str, int]:
        try:
            album_id = db.create_album(session, user_id=payload.user_id, title=payload.title)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return {"albam_id": album_id}

    @app.get(
        "/api/albam/{album_id}",
        response_model=list[AlbumPhotoResponse],
        tags=["album"],
    )
    def get_album_photos(
        album_id: int = Path(..., description="Album identifier"),
        user_id: int = Query(..., description="User identifier"),
        oldest_image_id: int | None = Query(
            None, description="Pagination anchor – fetch images older than this id"
        ),
        session: Session = Depends(db.get_session),
    ) -> list[AlbumPhotoResponse]:
        try:
            is_creator, photos = db.fetch_album_photos(
                session,
                album_id=album_id,
                user_id=user_id,
                oldest_image_id=oldest_image_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        return [
            AlbumPhotoResponse(
                is_creator=is_creator,
                image_id=photo.image_id,
                image_url=photo.image_url,
            )
            for photo in photos
        ]

    @app.post(
        "/api/albam/{album_id}",
        status_code=status.HTTP_201_CREATED,
        tags=["album"],
    )
    async def add_album_photos(
        album_id: int = Path(..., description="Album identifier"),
        photos: list[UploadFile] = File(..., alias="photo", description="Album photos"),
        session: Session = Depends(db.get_session),
        album_storage: storage.AlbumPhotoStorage = Depends(storage.get_album_storage),
    ) -> None:
        if not photos:
            raise HTTPException(status_code=400, detail="photo must contain at least one file.")

        try:
            photo_urls = await album_storage.upload(album_id=album_id, files=photos)
        except storage.StorageConfigurationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except storage.StorageUploadError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        try:
            db.add_album_photos(
                session,
                album_id=album_id,
                photo_urls=photo_urls,
            )
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

    @app.put(
        "/api/albam/{album_id}",
        status_code=status.HTTP_200_OK,
        tags=["album"],
    )
    def update_album(
        album_id: int = Path(..., description="Album identifier"),
        payload: AlbumUpdateRequest = Body(...),
        session: Session = Depends(db.get_session),
    ) -> None:
        try:
            db.update_album(
                session,
                album_id=album_id,
                title=payload.title,
                shared_user_ids=payload.shared_user_ids,
            )
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except SQLAlchemyError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

    # Face Matching ---------------------------------------------------------

    class FaceMatchResponse(BaseModel):
        user_id: int | None
        display_name: str | None
        match_confidence: float | None

    @app.post("/api/user/match-face", response_model=FaceMatchResponse, tags=["user"])
    async def match_face(
        file: UploadFile = File(...),
        session: Session = Depends(db.get_session),
    ) -> FaceMatchResponse:
        try:
            embedding = await ai_service.generate_embedding_from_image(file)
            if embedding is None:
                # 顔が検出されなかった場合
                return FaceMatchResponse(user_id=None, display_name=None, match_confidence=0.0)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        try:
            # The find_user_by_face_embedding function needs to be implemented in db.py
            # It should take the embedding and return the user with the closest match.
            # For now, we'll assume it returns a tuple (user, confidence) or (None, None).
            matched_user, confidence = await db.find_user_by_face_embedding(session, embedding)

        except SQLAlchemyError as exc: # pragma: no cover - defensive
            raise HTTPException(
                status_code=503, detail="Database temporarily unavailable"
            ) from exc

        if matched_user:
            return FaceMatchResponse(
                user_id=matched_user.id,
                display_name=matched_user.display_name,
                match_confidence=confidence,
            )
        else:
            return FaceMatchResponse(user_id=None, display_name=None, match_confidence=None)

    return app


app = create_app()
