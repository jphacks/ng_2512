from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Mapping

import pytest
from sqlalchemy.orm import Session

from backend.database import Base, get_session_factory, init_engine
from backend.db import models
from backend.repositories import AssetRepository
from backend.services.ai_service import (
    AIProposalResult,
    AIService,
    DetectedFace,
    FaceMatchCandidate,
    ThemeSuggestionResult,
)

from sqlalchemy.ext.compiler import compiles

try:
    from sqlalchemy.dialects.postgresql import JSONB as PGJSONB
except Exception:  # pragma: no cover
    PGJSONB = None  # type: ignore[assignment]

from pgvector.sqlalchemy import Vector
from sqlalchemy.types import BigInteger

if PGJSONB is not None:

    @compiles(PGJSONB, "sqlite")
    def _sqlite_jsonb(type_, compiler, **kw):  # type: ignore[override]
        return "JSON"


@compiles(Vector, "sqlite")
def _sqlite_vector(type_, compiler, **kw):  # type: ignore[override]
    return "BLOB"


@compiles(BigInteger, "sqlite")
def _sqlite_bigint(type_, compiler, **kw):  # type: ignore[override]
    return "INTEGER"


@pytest.fixture()
def session() -> Iterable[Session]:
    engine = init_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def _make_asset(asset_id: str, owner_id: int) -> models.Asset:
    return models.Asset(
        id=asset_id,
        owner_id=owner_id,
        content_type="image/jpeg",
        storage_key=f"s3://journal-bucket/journal/{owner_id}/2025/01/{asset_id}.jpg",
        created_at=datetime.now(timezone.utc),
    )


def _make_vector(seed: float, length: int = 8) -> list[float]:
    base = seed / 100.0
    return [base + (i * 0.01) for i in range(length)]


class DummyClipClient:
    def __init__(self, embedding: Sequence[float]) -> None:
        self._embedding = embedding

    def embed_asset(self, asset) -> Sequence[float]:
        return list(self._embedding)


class DummyVisionClient:
    def __init__(self, description: str) -> None:
        self._description = description
        self.calls: list[str] = []
        self.model_name = "qwen2.5-vl-32b"

    def describe_asset(self, asset, *, timeout: float) -> str:
        self.calls.append(asset.asset.id)
        return self._description


class DummyLLMClient:
    def __init__(self, response: str) -> None:
        self._response = response
        self.calls: list[dict[str, object]] = []
        self.model_name = "gpt-oss-20b"

    def generate(self, *, prompt: str, temperature: float, max_tokens: int, timeout: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "timeout": timeout,
            }
        )
        return self._response


class DummyFaceClient:
    def __init__(self, faces: Sequence[DetectedFace]) -> None:
        self._faces = faces

    def detect_and_embed(self, asset) -> Sequence[DetectedFace]:
        return list(self._faces)


class DummyFaceIndex:
    def __init__(self, candidates: Mapping[int, list[FaceMatchCandidate]]) -> None:
        self._candidates = candidates
        self.lookups: list[dict[str, object]] = []

    def search(
        self,
        *,
        query_embedding: Sequence[float],
        limit: int,
        include_user_ids: Iterable[int],
    ) -> Sequence[FaceMatchCandidate]:
        include_set = set(include_user_ids)
        self.lookups.append({"limit": limit, "include": include_set})
        matches: list[FaceMatchCandidate] = []
        for user_id in include_set:
            if user_id in self._candidates:
                matches.extend(self._candidates[user_id][:limit])
        matches.sort(key=lambda item: item.score, reverse=True)
        return matches[:limit]


@dataclass
class DummyMetrics:
    timings: list[tuple[str, float, Mapping[str, object]]] | None = None

    def timing(self, name: str, value: float, *, tags: Mapping[str, object] | None = None) -> None:
        if self.timings is None:
            self.timings = []
        self.timings.append((name, value, tags or {}))


def _add_theme(session: Session, theme_id: int, name: str, embedding: Sequence[float]) -> None:
    vocab = models.ThemeVocab(
        id=theme_id,
        set_id=1,
        name=name,
        normalized=name,
        created_at=datetime.now(timezone.utc),
    )
    session.add(vocab)
    session.flush()
    session.add(
        models.ThemeEmbedding(
            theme_id=vocab.id,
            model="clip@v1",
            embedding=list(embedding),
            current=True,
            created_at=datetime.now(timezone.utc),
        )
    )


def test_suggest_themes_uses_qwen_description_and_gpt_output(session: Session):
    session.add(models.ThemeVocabSet(id=1, code="main", lang="ja", created_at=datetime.now(timezone.utc)))
    session.flush()
    _add_theme(session, 1, "カフェ", _make_vector(1))
    _add_theme(session, 2, "ボードゲーム", _make_vector(2))
    session.add(_make_asset("asset-theme", owner_id=10))
    session.commit()

    clip_client = DummyClipClient(_make_vector(1))
    vision_client = DummyVisionClient("明るいカフェのテーブルで撮影された写真")
    llm_client = DummyLLMClient('["カフェで近況会","ボードゲームナイト"]')
    face_client = DummyFaceClient([])
    face_index = DummyFaceIndex({})
    metrics = DummyMetrics()

    repo = AssetRepository(session, bucket_name="journal-bucket")
    service = AIService(
        session,
        repo,
        clip_client=clip_client,
        face_client=face_client,
        face_index=face_index,
        llm_client=llm_client,
        vision_client=vision_client,
        metrics=metrics,
    )

    result = service.suggest_themes("asset-theme", hints=["コーヒー好き"], top_k=3)
    assert isinstance(result, ThemeSuggestionResult)
    assert list(result.suggestions) == ["カフェで近況会", "ボードゲームナイト"]
    assert result.source_model == "gpt-oss-20b"
    assert vision_client.calls == ["asset-theme"]
    assert metrics.timings is not None
    assert any(name == "ai.llm.theme" for name, _, _ in metrics.timings)


def test_match_people_filters_to_friend_ids(session: Session):
    session.add(_make_asset("asset-face", owner_id=11))
    session.commit()

    faces = [
        DetectedFace(bbox=(0, 0, 10, 10), embedding=[0.1, 0.2]),
        DetectedFace(bbox=(10, 10, 20, 20), embedding=[0.4, 0.8]),
    ]
    clip_client = DummyClipClient([0.0, 0.0])
    vision_client = DummyVisionClient("人物が写った写真")
    llm_client = DummyLLMClient("[]")
    face_client = DummyFaceClient(faces)
    face_index = DummyFaceIndex(
        {
            101: [FaceMatchCandidate(user_id=101, display_name="Taro", score=0.95)],
            202: [FaceMatchCandidate(user_id=202, display_name="Hanako", score=0.88)],
        }
    )
    repo = AssetRepository(session, bucket_name="journal-bucket")
    service = AIService(
        session,
        repo,
        clip_client=clip_client,
        face_client=face_client,
        face_index=face_index,
        llm_client=llm_client,
        vision_client=vision_client,
    )

    matches = service.match_people(
        "asset-face",
        requester_id=99,
        friend_user_ids=[101],
        per_face_limit=2,
    )

    assert len(matches) == 2
    assert [candidate.user_id for candidate in matches[0].candidates] == [101]
    assert matches[1].candidates == []
    assert face_index.lookups[0]["include"] == {101}


def test_generate_proposal_parses_llm_payload(session: Session):
    session.add(_make_asset("asset-proposal", owner_id=12))
    session.commit()

    response = json.dumps(
        {
            "title": "秋のピクニックに行きませんか？",
            "body": "紅葉を見ながらのんびり過ごしましょう。集合は駅前です。",
            "audience": [201, 202],
            "slots": [
                {"start": "2025-10-15T00:00:00Z", "end": "2025-10-15T03:00:00Z"},
            ],
        }
    )
    clip_client = DummyClipClient([0.0, 0.0])
    vision_client = DummyVisionClient("秋の公園で撮影された写真")
    llm_client = DummyLLMClient(response)
    face_client = DummyFaceClient([])
    face_index = DummyFaceIndex({})
    repo = AssetRepository(session, bucket_name="journal-bucket")
    service = AIService(
        session,
        repo,
        clip_client=clip_client,
        face_client=face_client,
        face_index=face_index,
        llm_client=llm_client,
        vision_client=vision_client,
    )

    result = service.generate_proposal_draft(
        "asset-proposal",
        audience_hints=[201, 202],
        context_notes=["紅葉が見頃", "屋外で飲食予定"],
    )

    assert isinstance(result, AIProposalResult)
    assert result.title.startswith("秋の")
    assert result.audience_user_ids == [201, 202]
    assert result.source_model == "gpt-oss-20b"
    assert len(result.suggested_slots) == 1
