from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Iterable, Sequence

import pytest

from backend.app import create_app
from backend.security import HMACAuthValidator
from backend.services.ai_service import (
    AIProposalResult,
    DetectedFace,
    FaceMatch,
    FaceMatchCandidate,
    ThemeSuggestionResult,
)


class DummyAIService:
    def __init__(self) -> None:
        self.suggest_calls: list[dict[str, object]] = []
        self.match_calls: list[dict[str, object]] = []
        self.proposal_calls: list[dict[str, object]] = []

    def suggest_themes(self, asset_id: str, *, hints: Sequence[str] | None, top_k: int) -> ThemeSuggestionResult:
        self.suggest_calls.append({"asset_id": asset_id, "hints": hints, "top_k": top_k})
        return ThemeSuggestionResult(
            suggestions=["カフェで近況会", "ボードゲームナイト"],
            description="明るいカフェで談笑している写真",
            source_model="gpt-oss-20b",
        )

    def match_people(
        self,
        asset_id: str,
        *,
        requester_id: int,
        friend_user_ids: Iterable[int],
        per_face_limit: int | None = None,
    ) -> Sequence[FaceMatch]:
        self.match_calls.append(
            {
                "asset_id": asset_id,
                "requester_id": requester_id,
                "friend_user_ids": list(friend_user_ids),
                "per_face_limit": per_face_limit,
            }
        )
        face = DetectedFace(bbox=(10.0, 20.0, 50.0, 50.0), embedding=(0.1, 0.2))
        candidate = FaceMatchCandidate(user_id=42, display_name="Taro", score=0.91)
        return [FaceMatch(face=face, candidates=[candidate])]

    def generate_proposal_draft(
        self,
        asset_id: str,
        *,
        audience_hints: Sequence[int] | None = None,
        context_notes: Sequence[str] | None = None,
    ) -> AIProposalResult:
        self.proposal_calls.append(
            {"asset_id": asset_id, "audience_hints": audience_hints, "context_notes": context_notes}
        )
        return AIProposalResult(
            title="週末ランチに行きませんか？",
            body="カジュアルに集まって近況を交換しましょう。",
            suggested_slots=[{"start": "2025-09-13T11:00:00Z", "end": "2025-09-13T13:00:00Z"}],
            audience_user_ids=[42, 77],
            source_model="gpt-oss-20b",
            raw_response="{}",
        )


def _build_headers(method: str, path: str, body: dict, *, api_key: str, api_secret: str) -> dict[str, str]:
    now = int(time.time())
    nonce = f"nonce-{time.time_ns()}"
    raw = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    body_hash = hashlib.sha256(raw).hexdigest()
    canonical = "\n".join([method.upper(), path, str(now), nonce, body_hash]).encode("utf-8")
    signature = hmac.new(api_secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
    return {
        "X-Api-Key": api_key,
        "X-Timestamp": str(now),
        "X-Nonce": nonce,
        "X-Signature": signature,
        "Content-Type": "application/json",
    }


@pytest.fixture()
def configured_app():
    app = create_app()
    api_key = "test-key"
    api_secret = "test-secret"
    dummy_service = DummyAIService()
    app.config.update(
        AI_API_KEY=api_key,
        AI_API_SECRET=api_secret,
        AI_SERVICE_FACTORY=lambda _session: dummy_service,
        AI_REQUEST_TOLERANCE_SEC=300,
        AI_RATE_LIMIT_PER_MIN=100,
        AI_NONCE_TTL_SEC=60,
    )
    app.extensions["hmac_auth"] = HMACAuthValidator(
        api_key=api_key,
        api_secret=api_secret,
        tolerance_seconds=app.config["AI_REQUEST_TOLERANCE_SEC"],
        rate_limit_per_minute=app.config["AI_RATE_LIMIT_PER_MIN"],
        nonce_ttl_seconds=app.config["AI_NONCE_TTL_SEC"],
    )
    app.testing = True
    yield app


def test_ai_themes_suggest_returns_service_payload(configured_app):
    app = configured_app
    client = app.test_client()
    payload = {"asset_id": "asset-123", "hints": ["カフェ"], "top_k": 3}
    headers = _build_headers("POST", "/ai/themes/suggest", payload, api_key=app.config["AI_API_KEY"], api_secret=app.config["AI_API_SECRET"])

    response = client.post("/ai/themes/suggest", data=json.dumps(payload, separators=(",", ":")), headers=headers)

    assert response.status_code == 200
    assert response.json == {
        "themes": ["カフェで近況会", "ボードゲームナイト"],
        "description": "明るいカフェで談笑している写真",
        "model": "gpt-oss-20b",
    }


def test_ai_people_match_requires_requester_id(configured_app):
    app = configured_app
    client = app.test_client()
    payload = {"asset_id": "asset-456"}
    headers = _build_headers("POST", "/ai/people/match", payload, api_key=app.config["AI_API_KEY"], api_secret=app.config["AI_API_SECRET"])

    response = client.post("/ai/people/match", data=json.dumps(payload, separators=(",", ":")), headers=headers)

    assert response.status_code == 422
    assert response.json["error"]["code"] == "invalid-argument"


def test_ai_proposals_auto_returns_draft(configured_app):
    app = configured_app
    client = app.test_client()
    payload = {
        "asset_id": "asset-789",
        "audience_hints": [42, 77],
        "context_notes": ["ランチがしたい"],
    }
    headers = _build_headers("POST", "/ai/proposals/auto", payload, api_key=app.config["AI_API_KEY"], api_secret=app.config["AI_API_SECRET"])

    response = client.post("/ai/proposals/auto", data=json.dumps(payload, separators=(",", ":")), headers=headers)

    assert response.status_code == 200
    assert response.json == {
        "draft": {
            "title": "週末ランチに行きませんか？",
            "body": "カジュアルに集まって近況を交換しましょう。",
            "slots": [{"start": "2025-09-13T11:00:00Z", "end": "2025-09-13T13:00:00Z"}],
            "audience_user_ids": [42, 77],
        },
        "model": "gpt-oss-20b",
    }


def test_missing_hmac_headers_returns_unauthorized(configured_app):
    app = configured_app
    client = app.test_client()
    payload = {"asset_id": "asset-abc"}

    response = client.post(
        "/ai/themes/suggest",
        data=json.dumps(payload, separators=(",", ":")),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401
    assert response.json["error"]["code"] == "unauthorized"
