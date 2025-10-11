from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from backend.app import create_app
from backend.database import Base, get_engine, session_scope
from backend.db import models
from backend.security import HMACAuthValidator


def _vector(seed: float, length: int) -> list[float]:
    base = seed / 100.0
    return [base + (index * 0.0001) for index in range(length)]


def _build_headers(method: str, path: str, body: dict, *, api_key: str, api_secret: str) -> dict[str, str]:
    import hashlib
    import hmac
    import time

    now = int(time.time())
    nonce = f"n-{time.time_ns()}"
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
def integration_app(tmp_path: Path):
    database_url = f"sqlite+pysqlite:///{tmp_path/'ai_routes.sqlite3'}"
    os.environ["DATABASE_URL"] = database_url
    os.environ["AI_SERVICE_MODE"] = "mock"
    os.environ["AI_API_KEY"] = "integration-key"
    os.environ["AI_API_SECRET"] = "integration-secret"
    os.environ.setdefault("AI_ASSET_BUCKET", "journal-bucket")

    app = create_app()
    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with session_scope() as session:
        _seed_theme_data(session)
        _seed_asset_data(session)

    # Ensure the HMAC validator picks up the configured credentials.
    app.extensions["hmac_auth"] = HMACAuthValidator(
        api_key=app.config["AI_API_KEY"],
        api_secret=app.config["AI_API_SECRET"],
        tolerance_seconds=app.config["AI_REQUEST_TOLERANCE_SEC"],
        rate_limit_per_minute=app.config["AI_RATE_LIMIT_PER_MIN"],
        nonce_ttl_seconds=app.config["AI_NONCE_TTL_SEC"],
    )
    app.testing = True
    yield app


def _seed_theme_data(session) -> None:
    vocab_set = models.ThemeVocabSet(code="main", lang="ja", is_active=True)
    session.add(vocab_set)
    session.flush()

    cafe = models.ThemeVocab(set_id=vocab_set.id, name="カフェ時間", normalized="カフェ")
    boardgame = models.ThemeVocab(set_id=vocab_set.id, name="ボードゲーム会", normalized="ボードゲーム")
    session.add_all([cafe, boardgame])
    session.flush()

    session.add_all(
        [
            models.ThemeEmbedding(theme_id=cafe.id, model="clip@v1", embedding=_vector(1, 768), current=True),
            models.ThemeEmbedding(theme_id=boardgame.id, model="clip@v1", embedding=_vector(2, 768), current=True),
        ]
    )


def _seed_asset_data(session) -> None:
    asset_main = models.Asset(
        id="asset-main",
        owner_id=1,
        content_type="image/jpeg",
        storage_key="s3://journal-bucket/journal/1/asset-main.jpg",
    )
    asset_friend = models.Asset(
        id="asset-friend",
        owner_id=2,
        content_type="image/jpeg",
        storage_key="s3://journal-bucket/journal/2/asset-friend.jpg",
    )
    session.add_all([asset_main, asset_friend])
    session.flush()

    session.add(
        models.ImageEmbedding(
            asset_id=asset_main.id,
            model="clip@v1",
            embedding=_vector(1, 768),
        )
    )

    face_vector = _vector(5, 512)
    session.add_all(
        [
            models.FaceEmbedding(
                asset_id=asset_main.id,
                bbox={"left": 10.0, "top": 20.0, "width": 50.0, "height": 50.0},
                embedding=face_vector,
            ),
            models.FaceEmbedding(
                asset_id=asset_friend.id,
                embedding=face_vector,
            ),
        ]
    )


def test_themes_suggest_uses_configured_factory(integration_app):
    client = integration_app.test_client()
    payload = {"asset_id": "asset-main", "top_k": 3}
    headers = _build_headers(
        "POST",
        "/ai/themes/suggest",
        payload,
        api_key=integration_app.config["AI_API_KEY"],
        api_secret=integration_app.config["AI_API_SECRET"],
    )

    response = client.post("/ai/themes/suggest", data=json.dumps(payload, separators=(",", ":")), headers=headers)

    assert response.status_code == 200
    assert response.json["themes"][0] == "カフェ時間"


def test_people_match_returns_candidates(integration_app):
    client = integration_app.test_client()
    payload = {"asset_id": "asset-main", "requester_id": 1, "friend_user_ids": [2]}
    headers = _build_headers(
        "POST",
        "/ai/people/match",
        payload,
        api_key=integration_app.config["AI_API_KEY"],
        api_secret=integration_app.config["AI_API_SECRET"],
    )

    response = client.post("/ai/people/match", data=json.dumps(payload, separators=(",", ":")), headers=headers)

    assert response.status_code == 200
    assert response.json["matched_faces"][0]["candidates"][0]["user_id"] == 2


def test_proposals_auto_returns_draft(integration_app):
    client = integration_app.test_client()
    payload = {"asset_id": "asset-main", "audience_hints": [2, 3], "context_notes": ["ランチ"]}
    headers = _build_headers(
        "POST",
        "/ai/proposals/auto",
        payload,
        api_key=integration_app.config["AI_API_KEY"],
        api_secret=integration_app.config["AI_API_SECRET"],
    )

    response = client.post("/ai/proposals/auto", data=json.dumps(payload, separators=(",", ":")), headers=headers)

    assert response.status_code == 200
    assert response.json["draft"]["audience_user_ids"] == [2, 3]
