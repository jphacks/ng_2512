"""Tests for friend and album related endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _create_user(session, db_module, *, user_id: int, account: str, name: str) -> None:
    session.add(
        db_module.User(
            id=user_id,
            assets_id=f"asset-{user_id}",
            account_id=account,
            display_name=name,
            icon_asset_url=f"/assets/{account}.png",
            face_asset_url=None,
            profile_text=None,
        )
    )


def test_friend_request_flow_and_overview(client: TestClient, db_module) -> None:
    session = db_module.SessionLocal()
    try:
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
            _create_user(session, db_module, user_id=uid, account=account, name=name)
        session.commit()
    finally:
        session.close()

    # Incoming request (friend -> main)
    resp = client.put(
        "/api/friend/request",
        json={
            "user_id": incoming_friend,
            "friend_user_id": main_user,
            "updated_status": "requested",
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "updated"}

    # Outgoing request (main -> outgoing)
    resp = client.put(
        "/api/friend/request",
        json={
            "user_id": main_user,
            "friend_user_id": outgoing_friend,
            "updated_status": "requested",
        },
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "updated"}

    # Accepted friendship (main -> accepted, then accepted -> main)
    assert (
        client.put(
            "/api/friend/request",
            json={
                "user_id": main_user,
                "friend_user_id": accepted_friend,
                "updated_status": "requested",
            },
        ).json()
        == {"status": "updated"}
    )
    assert (
        client.put(
            "/api/friend/request",
            json={
                "user_id": accepted_friend,
                "friend_user_id": main_user,
                "updated_status": "accepted",
            },
        ).json()
        == {"status": "updated"}
    )

    # Blocked user (main blocks blocked_friend)
    assert (
        client.put(
            "/api/friend/request",
            json={
                "user_id": main_user,
                "friend_user_id": blocked_friend,
                "updated_status": "blocked",
            },
        ).json()
        == {"status": "updated"}
    )

    overview = client.get("/api/friend", params={"user_id": main_user})
    assert overview.status_code == 200
    data = overview.json()

    assert {entry["user_id"] for entry in data["friend"]} == {accepted_friend}
    assert {entry["user_id"] for entry in data["friend_requested"]} == {incoming_friend}
    assert {entry["user_id"] for entry in data["friend_requesting"]} == {outgoing_friend}
    assert {entry["user_id"] for entry in data["friend_blocked"]} == {blocked_friend}
    assert data["friend_recommended"] == []


def test_friend_request_invalid_status(client: TestClient) -> None:
    response = client.put(
        "/api/friend/request",
        json={
            "user_id": 1,
            "friend_user_id": 2,
            "updated_status": "not-a-status",
        },
    )
    assert response.status_code == 400
    assert "Unsupported friend status" in response.json()["detail"]


def test_friend_search_and_empty_query(client: TestClient) -> None:
    response = client.post("/api/friend/search", json={"input_text": "Friend"})
    assert response.status_code == 200
    results = response.json()
    assert any(entry["account_id"] == "friend-accepted" for entry in results)

    empty_response = client.post("/api/friend/search", json={"input_text": "   "})
    assert empty_response.status_code == 422


def test_album_alias_route_returns_ok(client: TestClient) -> None:
    response = client.get("/api/album", params={"user_id": 999})
    assert response.status_code == 200
    assert response.json() == []
