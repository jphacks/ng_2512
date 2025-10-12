"""Tests for user management endpoints."""

from __future__ import annotations

import os
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure the backend package is importable as `app`
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.main import app  # noqa: E402  (import after sys.path tweak)


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Provide a reusable TestClient instance."""
    return TestClient(app)


def test_create_user_endpoint(client: TestClient, mocker: pytest.MockFixture) -> None:
    """Create user endpoint returns created id and forwards uploaded assets."""
    upload_mock = mocker.patch(
        "app.ai_service.upload_image",
        side_effect=["/assets/icon.png", "/assets/face.png"],
    )
    create_user_mock = mocker.patch("app.db.create_user", return_value=123)

    response = client.post(
        "/api/user/create",
        data={
            "account_id": "acct-001",
            "display_name": "Test User",
            "profile_text": "Hello!",
        },
        files={
            "icon_image": ("icon.png", b"PNGDATA", "image/png"),
            "face_image": ("face.png", b"PNGDATA", "image/png"),
        },
    )

    assert response.status_code == 201
    assert response.json() == {"user_id": 123}
    assert upload_mock.await_count == 2
    create_user_mock.assert_called_once()
    _, kwargs = create_user_mock.call_args
    assert kwargs["account_id"] == "acct-001"
    assert kwargs["display_name"] == "Test User"
    assert kwargs["profile_text"] == "Hello!"
    assert kwargs["icon_image"] == "/assets/icon.png"
    assert kwargs["face_image"] == "/assets/face.png"


def test_update_user_endpoint(client: TestClient, mocker: pytest.MockFixture) -> None:
    """Update user endpoint stores uploads and propagates payload to DB layer."""
    upload_mock = mocker.patch(
        "app.ai_service.upload_image",
        side_effect=["/assets/new-icon.png", "/assets/new-face.png"],
    )
    update_user_mock = mocker.patch("app.db.update_user")

    response = client.put(
        "/api/user",
        data={
            "user_id": "42",
            "account_id": "acct-001",
            "display_name": "Updated User",
            "profile_text": "Updated profile",
        },
        files={
            "icon_image": ("icon.png", b"PNGDATA", "image/png"),
            "face_image": ("face.png", b"PNGDATA", "image/png"),
        },
    )

    assert response.status_code == 200
    # FastAPI renders a null JSON body for `None` return values
    assert response.json() is None
    assert upload_mock.await_count == 2
    update_user_mock.assert_called_once()
    _, kwargs = update_user_mock.call_args
    assert kwargs["user_id"] == 42
    assert kwargs["account_id"] == "acct-001"
    assert kwargs["display_name"] == "Updated User"
    assert kwargs["profile_text"] == "Updated profile"
    assert kwargs["icon_image"] == "/assets/new-icon.png"
    assert kwargs["face_image"] == "/assets/new-face.png"
