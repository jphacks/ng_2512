"""Tests for chat endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient


def _create_user(session, db_module, user_id: int, name: str) -> None:
    session.add(
        db_module.User(
            id=user_id,
            assets_id=f"asset-{user_id}",
            account_id=f"acct-{user_id}",
            display_name=name,
            icon_asset_url=None,
            face_asset_url=None,
            profile_text=None,
        )
    )


def test_chat_list_handles_naive_datetimes(client: TestClient, db_module) -> None:
    session = db_module.SessionLocal()
    try:
        user_id = 2000
        other_id = 2001
        _create_user(session, db_module, user_id, "Main User")
        _create_user(session, db_module, other_id, "Friend")
        session.commit()

        group_id = db_module.create_chat_group(
            session,
            title="Test Chat",
            member_ids=[user_id, other_id],
        )
        session.add(
            db_module.ChatMessage(
                chat_id=group_id,
                sender_id=other_id,
                body="Hello!",
                image_url=None,
                posted_at=datetime.now(),  # naive timestamp
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.get("/api/chat", params={"user_id": user_id})
    assert response.status_code == 200
    data = response.json()
    assert data
    assert data[0]["title"] == "Test Chat"


def test_create_chat_group_adds_creator(client: TestClient, db_module) -> None:
    session = db_module.SessionLocal()
    try:
        creator = 2010
        friend = 2011
        _create_user(session, db_module, creator, "Creator")
        _create_user(session, db_module, friend, "Friend")
        session.commit()
    finally:
        session.close()

    create_response = client.post(
        "/api/chat/groupe",
        json={
            "title": "Creator Group",
            "creator_id": creator,
            "member_ids": [friend],
        },
    )
    assert create_response.status_code == 201

    membership_response = client.get("/api/chat", params={"user_id": creator})
    assert membership_response.status_code == 200
    chats = membership_response.json()
    assert any(chat["title"] == "Creator Group" for chat in chats)
