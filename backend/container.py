from __future__ import annotations

import json
import os
import re
from typing import Iterable, Sequence

from flask import Flask
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db import models
from backend.repositories import AssetRepository, EmbeddingRepository
from backend.services import (
    AIService,
    AIServiceError,
    DetectedFace,
    FaceMatchCandidate,
    QWenHTTPClient,
    VLLMHTTPClient,
)
from backend.services.ai_service import FaceIndex, FaceEmbeddingClient, ImageEmbeddingClient, LLMClient, VisionLanguageClient


class DatabaseImageEmbeddingClient(ImageEmbeddingClient):
    """Embeds assets by reading the stored CLIP vector from the database."""

    def __init__(self, session: Session):
        self._session = session

    def embed_asset(self, asset) -> Sequence[float]:
        record = self._session.get(models.ImageEmbedding, asset.asset.id)
        if record is None:
            raise AIServiceError(f"Image embedding for asset {asset.asset.id!r} was not found.")
        return _vector_to_list(record.embedding)


class DatabaseFaceEmbeddingClient(FaceEmbeddingClient):
    """Returns pre-computed face embeddings stored against the asset."""

    def __init__(self, session: Session):
        self._session = session

    def detect_and_embed(self, asset) -> Sequence[DetectedFace]:
        stmt = select(models.FaceEmbedding).where(models.FaceEmbedding.asset_id == asset.asset.id)
        rows = self._session.execute(stmt).scalars().all()
        faces: list[DetectedFace] = []
        for row in rows:
            faces.append(
                DetectedFace(
                    bbox=_normalise_bbox(row.bbox),
                    embedding=_vector_to_list(row.embedding),
                )
            )
        return faces


class DatabaseFaceIndex(FaceIndex):
    """Performs nearest-neighbour lookups using the stored face embeddings."""

    def __init__(self, session: Session, embedding_repository: EmbeddingRepository):
        self._session = session
        self._embeddings = embedding_repository

    def search(
        self,
        *,
        query_embedding: Sequence[float],
        limit: int,
        include_user_ids: Iterable[int],
    ) -> Sequence[FaceMatchCandidate]:
        include_set = {int(user_id) for user_id in include_user_ids}
        if not include_set or limit <= 0:
            return []

        neighbors = self._embeddings.query_face_neighbors(
            query_embedding,
            limit=limit,
            owner_ids=include_set,
        )
        results: list[FaceMatchCandidate] = []
        for neighbor in neighbors:
            user_id = int(neighbor.owner_id)
            if user_id not in include_set:
                continue
            results.append(
                FaceMatchCandidate(
                    user_id=user_id,
                    display_name=_lookup_display_name(self._session, user_id),
                    score=float(neighbor.score),
                )
            )
        return results


class MockVisionClient(VisionLanguageClient):
    """Lightweight vision model substitute used for local testing."""

    model_name = "mock-vision"

    def describe_asset(self, asset, *, timeout: float) -> str:
        return f"Asset {asset.asset.id} に写った写真の説明（モック）"


class MockLLMClient(LLMClient):
    """Lightweight LLM substitute that returns deterministic JSON."""

    model_name = "mock-llm"

    def generate(
        self,
        *,
        prompt: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> str:
        if "候補テーマ" in prompt:
            return self._generate_theme_response(prompt)
        return self._generate_proposal_response(prompt)

    @staticmethod
    def _generate_theme_response(prompt: str) -> str:
        candidates: list[str] = []
        for line in prompt.splitlines():
            if line.startswith("- "):
                name = line[2:].split(" (", 1)[0].strip()
                if name:
                    candidates.append(name)
        if not candidates:
            candidates = ["みんなで集まるプラン"]
        return json.dumps(candidates[:5], ensure_ascii=False)

    @staticmethod
    def _generate_proposal_response(prompt: str) -> str:
        audience_ids: list[int] = []
        for line in prompt.splitlines():
            if line.startswith("宛先ヒント"):
                audience_ids = [int(value) for value in re.findall(r"\b\d+\b", line)]
                break
        body = "写真の雰囲気に合わせて集まりませんか？"
        result = {
            "title": "AI提案: みんなで集まりましょう",
            "body": body,
            "audience": audience_ids,
            "slots": [],
        }
        return json.dumps(result, ensure_ascii=False)


def configure_ai_services(app: Flask) -> None:
    """Attach an AI service factory to *app* based on configuration."""

    if "AI_SERVICE_MODE" not in app.config:
        app.config["AI_SERVICE_MODE"] = os.getenv("AI_SERVICE_MODE", "mock")

    if "AI_ASSET_BUCKET" not in app.config:
        app.config["AI_ASSET_BUCKET"] = os.getenv("AI_ASSET_BUCKET") or os.getenv("S3_BUCKET")

    mode = str(app.config["AI_SERVICE_MODE"]).lower()
    settings = get_settings()

    def factory(session: Session) -> AIService:
        bucket = app.config.get("AI_ASSET_BUCKET")
        asset_repository = AssetRepository(session, bucket_name=bucket)
        embedding_repository = EmbeddingRepository(session)
        clip_client: ImageEmbeddingClient = DatabaseImageEmbeddingClient(session)
        face_client: FaceEmbeddingClient = DatabaseFaceEmbeddingClient(session)
        face_index: FaceIndex = DatabaseFaceIndex(session, embedding_repository)

        if mode == "http":
            llm_client: LLMClient = VLLMHTTPClient(settings.vllm_endpoint, model_name=settings.text_model)
            vision_client: VisionLanguageClient = QWenHTTPClient(settings.vlm_endpoint, model_name=settings.vision_model)
        else:
            llm_client = MockLLMClient()
            vision_client = MockVisionClient()

        return AIService(
            session,
            asset_repository,
            clip_client=clip_client,
            face_client=face_client,
            face_index=face_index,
            llm_client=llm_client,
            vision_client=vision_client,
            settings=settings,
        )

    app.config["AI_SERVICE_FACTORY"] = factory


def _vector_to_list(values) -> list[float]:
    if isinstance(values, list):
        return [float(item) for item in values]
    if isinstance(values, tuple):
        return [float(item) for item in values]
    to_list = getattr(values, "tolist", None)
    if callable(to_list):
        converted = to_list()
        if isinstance(converted, list):
            return [float(item) for item in converted]
    return [float(item) for item in values]


def _normalise_bbox(bbox) -> tuple[float, float, float, float]:
    if bbox is None:
        return (0.0, 0.0, 0.0, 0.0)
    if isinstance(bbox, dict):
        keys = {key.lower() for key in bbox.keys()}
        if {"left", "top", "width", "height"} <= keys:
            return (
                float(bbox.get("left", 0.0)),
                float(bbox.get("top", 0.0)),
                float(bbox.get("width", 0.0)),
                float(bbox.get("height", 0.0)),
            )
        if {"x", "y", "w", "h"} <= keys:
            return (
                float(bbox.get("x", 0.0)),
                float(bbox.get("y", 0.0)),
                float(bbox.get("w", 0.0)),
                float(bbox.get("h", 0.0)),
            )
    if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
        return tuple(float(value) for value in bbox)
    return (0.0, 0.0, 0.0, 0.0)


def _lookup_display_name(session: Session, user_id: int) -> str:
    record = session.get(models.User, user_id)
    if record is not None and hasattr(record, "display_name") and record.display_name:
        return str(record.display_name)
    return f"user-{user_id}"


__all__ = ["configure_ai_services"]
