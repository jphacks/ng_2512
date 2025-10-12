"""Integration tests for user management endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_user_endpoint(client: TestClient, db_module) -> None:
    response = client.post(
        "/api/user/create",
        data={
            "account_id": "acct-create",
            "display_name": "Test User",
            "profile_text": "Hello!",
        },
        files={
            "icon_image": ("icon.png", b"PNGDATA", "image/png"),
            "face_image": ("face.png", b"PNGDATA", "image/png"),
        },
    )

    assert response.status_code == 201
    payload = response.json()
    user_id = payload["user_id"]

    session = db_module.SessionLocal()
    try:
        user = session.get(db_module.User, user_id)
        assert user is not None
        assert user.account_id == "acct-create"
        assert user.display_name == "Test User"
        assert user.profile_text == "Hello!"
        assert user.icon_asset_url == "/assets/images/icon.png"
        assert user.face_asset_url == "/assets/images/face.png"
    finally:
        session.close()


def test_update_user_endpoint(client: TestClient, db_module) -> None:
    create_response = client.post(
        "/api/user/create",
        data={
            "account_id": "acct-update",
            "display_name": "Original User",
            "profile_text": "Original",
        },
        files={
            "icon_image": ("original-icon.png", b"PNGDATA", "image/png"),
            "face_image": ("original-face.png", b"PNGDATA", "image/png"),
        },
    )
    create_response.raise_for_status()
    user_id = create_response.json()["user_id"]

    response = client.put(
        "/api/user",
        data={
            "user_id": str(user_id),
            "account_id": "acct-update",
            "display_name": "Updated User",
            "profile_text": "Updated profile",
        },
        files={
            "icon_image": ("updated-icon.png", b"PNGDATA", "image/png"),
            "face_image": ("updated-face.png", b"PNGDATA", "image/png"),
        },
    )

    assert response.status_code == 200
    assert response.json() is None

    session = db_module.SessionLocal()
    try:
        user = session.get(db_module.User, user_id)
        assert user is not None
        assert user.display_name == "Updated User"
        assert user.profile_text == "Updated profile"
        assert user.icon_asset_url == "/assets/images/updated-icon.png"
        assert user.face_asset_url == "/assets/images/updated-face.png"
    finally:
        session.close()
