"""Tests for friend and album related endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient


def _create_user(session, db_module, *, user_id: int, account: str, name: str, icon: str) -> None:
    session.add(
        db_module.User(
            id=user_id,
            assets_id=f"asset-{user_id}",
            account_id=account,
            display_name=name,
            icon_asset_url=icon,
            face_asset_url=None,
            profile_text=None,
        )
    )


def _create_friendship(
    session,
    db_module,
    *,
    user_id: int,
    friend_user_id: int,
    status: str,
    updated_at: datetime,
) -> None:
    session.add(
        db_module.UserFriendship(
            user_id=user_id,
            friend_user_id=friend_user_id,
            status=status,
            updated_at=updated_at,
        )
    )


def test_friend_overview_categories(client: TestClient, db_module) -> None:
    session = db_module.SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        main_user = 1000
        accepted_friend = 1001
        incoming_friend = 1002
        outgoing_friend = 1003
        blocked_friend = 1004

        for uid, account, name in [
            (main_user, "user-main", "Main User"),
            (accepted_friend, "friend-accepted", "Accepted Friend"),
            (incoming_friend, "friend-in", "Incoming Friend"),
            (outgoing_friend, "friend-out", "Outgoing Friend"),
            (blocked_friend, "friend-block", "Blocked Friend"),
        ]:
            _create_user(
                session,
                db_module,
                user_id=uid,
                account=account,
                name=name,
                icon=f"/assets/{account}.png",
            )
        session.flush()

        _create_friendship(
            session,
            db_module,
            user_id=main_user,
            friend_user_id=accepted_friend,
            status="accepted",
            updated_at=now,
        )
        _create_friendship(
            session,
            db_module,
            user_id=incoming_friend,
            friend_user_id=main_user,
            status="requested",
            updated_at=now,
        )
        _create_friendship(
            session,
            db_module,
            user_id=main_user,
            friend_user_id=outgoing_friend,
            status="requested",
            updated_at=now,
        )
        _create_friendship(
            session,
            db_module,
            user_id=main_user,
            friend_user_id=blocked_friend,
            status="blocked",
            updated_at=now,
        )
        session.commit()
    finally:
        session.close()

    response = client.get("/api/friend", params={"user_id": main_user})
    assert response.status_code == 200
    data = response.json()

    assert {entry["user_id"] for entry in data["friend"]} == {accepted_friend}
    assert {entry["user_id"] for entry in data["friend_requested"]} == {incoming_friend}
    assert {entry["user_id"] for entry in data["friend_requesting"]} == {outgoing_friend}
    assert {entry["user_id"] for entry in data["friend_blocked"]} == {blocked_friend}
    assert data["friend_recommended"] == []


def test_friend_search_and_empty_query(client: TestClient, db_module) -> None:
    response = client.get("/api/friend/search", params={"input_text": "Friend"})
    assert response.status_code == 200
    results = response.json()
    assert any(entry["account_id"] == "friend-accepted" for entry in results)

    empty_response = client.get("/api/friend/search", params={"input_text": "   "})
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_album_alias_route_returns_ok(client: TestClient) -> None:
    response = client.get("/api/album", params={"user_id": 999})
    assert response.status_code == 200
    assert response.json() == []
