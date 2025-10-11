from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, List, Sequence

import httpx
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, ValidationError
from transformers import CLIPModel, CLIPProcessor


def _resolve_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    storage_root: Path = Path(os.getenv("AI_STORAGE_ROOT", ".")).resolve()
    face_model_id: str = os.getenv("FACE_EMBEDDING_MODEL_ID", "openai/clip-vit-base-patch32")
    llm_base_url: str | None = os.getenv("LLM_API_BASE_URL")
    llm_api_key: str | None = os.getenv("LLM_API_KEY")
    llm_model_name: str = os.getenv("LLM_MODEL_NAME", "gpt-oss:20b")
    llm_timeout: float = float(os.getenv("LLM_REQUEST_TIMEOUT", "45"))
    default_top_k: int = int(os.getenv("FACE_MATCH_TOP_K", "5"))
    min_face_score: float = float(os.getenv("MIN_FACE_MATCH_SCORE", "0.3"))
    allow_remote_images: bool = _resolve_bool(os.getenv("ALLOW_REMOTE_IMAGES"), default=True)


settings = Settings()


class FaceEmbeddingModel:
    _model: CLIPModel | None = None
    _processor: CLIPProcessor | None = None

    @classmethod
    def _ensure_loaded(cls) -> None:
        if cls._model is None or cls._processor is None:
            model = CLIPModel.from_pretrained(settings.face_model_id)
            processor = CLIPProcessor.from_pretrained(settings.face_model_id)
            model.eval()
            cls._model = model
            cls._processor = processor

    @classmethod
    def embed(cls, image: Image.Image) -> list[float]:
        cls._ensure_loaded()
        assert cls._model is not None
        assert cls._processor is not None
        inputs = cls._processor(images=image, return_tensors="pt")
        with torch.no_grad():
            features = cls._model.get_image_features(**inputs)
        vector = features[0].detach().cpu().numpy().astype(np.float32)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector /= norm
        return vector.tolist()


class FaceEmbeddingPayload(BaseModel):
    embedding: List[float]
    bbox: dict[str, Any] | None = None


class FaceEmbeddingRequest(BaseModel):
    storage_key: str = Field(..., description="Path, URL, or base64 encoded image data.")


class FaceEmbeddingResponse(BaseModel):
    faces: List[FaceEmbeddingPayload]


class FaceMatchCandidate(BaseModel):
    user_id: int
    embedding: List[float]


class FaceMatchRequest(BaseModel):
    storage_key: str | None = Field(
        default=None, description="Query image identifier; ignored when embedding is provided."
    )
    embedding: List[float] | None = Field(
        default=None, description="Pre-computed embedding for the query image."
    )
    candidates: List[FaceMatchCandidate]
    top_k: int = Field(default=settings.default_top_k, ge=1, le=50)
    min_score: float = Field(default=settings.min_face_score, ge=0.0, le=1.0)


class FaceMatchEntry(BaseModel):
    user_id: int
    score: float


class FaceMatchResponse(BaseModel):
    matches: List[FaceMatchEntry]


class ProposalContext(BaseModel):
    user_id: int
    observation: dict[str, Any] | None = None
    fallback_title: str | None = None
    fallback_location: str | None = None
    fallback_date: datetime | None = None
    participant_ids: List[int] = Field(default_factory=list)


class ProposalSuggestion(BaseModel):
    title: str
    event_date: datetime
    location: str | None = None
    participant_ids: List[int]


class ProposalSuggestionResponse(ProposalSuggestion):
    source: str = Field(default="model")


app = FastAPI(title="ng_2512 AI Compute Service")


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


def _load_image_content(storage_key: str) -> bytes:
    if storage_key.startswith("data:"):
        _, _, data = storage_key.partition(",")
        try:
            return base64.b64decode(data, validate=True)
        except (base64.binascii.Error, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Invalid base64 payload.") from exc

    if storage_key.startswith("http://") or storage_key.startswith("https://"):
        if not settings.allow_remote_images:
            raise HTTPException(status_code=403, detail="Remote image fetching is disabled.")
        try:
            response = httpx.get(storage_key, timeout=15)
        except httpx.HTTPError as exc:  # pragma: no cover - network failure
            raise HTTPException(status_code=502, detail="Unable to fetch remote image.") from exc
        if response.status_code >= 400:
            raise HTTPException(
                status_code=404, detail=f"Image resource returned {response.status_code}."
            )
        return response.content

    path = Path(storage_key)
    if not path.is_absolute():
        path = settings.storage_root / path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found.")
    return path.read_bytes()


def _prepare_image(storage_key: str) -> Image.Image:
    content = _load_image_content(storage_key)
    try:
        image = Image.open(BytesIO(content))
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Unsupported image format.") from exc
    return image.convert("RGB")


@app.post("/api/face_embeddings", response_model=FaceEmbeddingResponse)
async def create_face_embeddings(payload: FaceEmbeddingRequest) -> FaceEmbeddingResponse:
    image = _prepare_image(payload.storage_key)
    embedding = FaceEmbeddingModel.embed(image)
    # Face detection is not implemented; treat the entire image as one face.
    face_payload = FaceEmbeddingPayload(embedding=embedding, bbox=None)
    return FaceEmbeddingResponse(faces=[face_payload])


def _normalize(vector: Sequence[float]) -> np.ndarray:
    array = np.asarray(vector, dtype=np.float32)
    norm = np.linalg.norm(array)
    if norm > 0:
        array = array / norm
    return array


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.shape != b.shape:
        raise ValueError("Embedding dimensionality mismatch.")
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


@app.post("/api/face_match", response_model=FaceMatchResponse)
async def match_faces(payload: FaceMatchRequest) -> FaceMatchResponse:
    if not payload.candidates:
        return FaceMatchResponse(matches=[])

    if payload.embedding is not None:
        query = _normalize(payload.embedding)
    elif payload.storage_key:
        image = _prepare_image(payload.storage_key)
        query = np.asarray(FaceEmbeddingModel.embed(image), dtype=np.float32)
    else:
        raise HTTPException(status_code=400, detail="Either embedding or storage_key is required.")

    query = _normalize(query)
    matches: list[FaceMatchEntry] = []
    for candidate in payload.candidates:
        candidate_vector = _normalize(candidate.embedding)
        score = _cosine_similarity(query, candidate_vector)
        if score >= payload.min_score:
            matches.append(FaceMatchEntry(user_id=candidate.user_id, score=score))

    matches.sort(key=lambda item: item.score, reverse=True)
    return FaceMatchResponse(matches=matches[: payload.top_k])


async def _call_llm(context: ProposalContext) -> ProposalSuggestionResponse | None:
    if not settings.llm_base_url:
        return None

    request_payload = {
        "model": settings.llm_model_name,
        "temperature": 0.4,
        "max_tokens": 512,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a scheduling assistant that returns JSON. "
                    "Respond with an object containing title, event_date "
                    "(ISO 8601), location, and participant_ids (array of integers). "
                    "Keep the title concise."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "user_id": context.user_id,
                        "observation": context.observation,
                        "fallback_title": context.fallback_title,
                        "fallback_location": context.fallback_location,
                        "fallback_date": (
                            context.fallback_date.isoformat() if context.fallback_date else None
                        ),
                        "participant_ids": context.participant_ids,
                    }
                ),
            },
        ],
    }

    headers = {"Content-Type": "application/json"}
    if settings.llm_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"

    async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
        try:
            response = await client.post(
                settings.llm_base_url.rstrip("/") + "/chat/completions",
                json=request_payload,
                headers=headers,
            )
        except httpx.HTTPError as exc:  # pragma: no cover - network failure
            raise HTTPException(status_code=502, detail="LLM request failed.") from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="LLM returned an error response.")

    body = response.json()
    choices = body.get("choices")
    if not choices:
        return None
    message = choices[0].get("message", {})
    content = message.get("content")
    if not content:
        return None

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON.") from exc

    try:
        suggestion = ProposalSuggestion(**parsed)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail="LLM response validation failed.") from exc

    return ProposalSuggestionResponse(
        title=suggestion.title,
        event_date=suggestion.event_date,
        location=suggestion.location,
        participant_ids=suggestion.participant_ids,
        source="model",
    )


def _fallback_proposal(context: ProposalContext) -> ProposalSuggestionResponse:
    event_date = context.fallback_date or datetime.now(timezone.utc) + timedelta(days=3)
    title = context.fallback_title or "Catch Up Gathering"
    location = context.fallback_location or "Favorite Cafe"
    participants = context.participant_ids or [context.user_id]
    return ProposalSuggestionResponse(
        title=title,
        event_date=event_date,
        location=location,
        participant_ids=participants,
        source="fallback",
    )


@app.post("/api/proposals/suggest", response_model=ProposalSuggestionResponse)
async def suggest_proposal(context: ProposalContext) -> ProposalSuggestionResponse:
    try:
        suggestion = await _call_llm(context)
    except HTTPException:
        # Propagate HTTP-friendly errors (already informative for clients).
        raise
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=502, detail=f"Failed to generate proposal: {exc}") from exc

    if suggestion:
        return suggestion
    return _fallback_proposal(context)


if __name__ == "__main__":  # pragma: no cover - convenience for manual runs
    import uvicorn

    uvicorn.run(
        "AI_server.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8500")),
        reload=_resolve_bool(os.getenv("UVICORN_RELOAD"), default=False),
    )
