"""Integration tests for user management endpoints."""

from __future__ import annotations

import importlib
import os
import sys
from contextlib import contextmanager
from typing import Generator, Tuple

import pytest
from fastapi.testclient import TestClient

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)


@contextmanager
def _override_env(values: dict[str, str]) -> Generator[None, None, None]:
    previous = {key: os.environ.get(key) for key in values}
    try:
        os.environ.update(values)
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def _reload_backend_modules() -> Tuple[object, object]:
    for module_name in ("backend.app.main", "backend.app.db", "backend.app.config"):
        sys.modules.pop(module_name, None)

    config_module = importlib.import_module("backend.app.config")
    config_module = importlib.reload(config_module)
    db_module = importlib.import_module("backend.app.db")
    db_module = importlib.reload(db_module)
    app_module = importlib.import_module("backend.app.main")
    app_module = importlib.reload(app_module)
    return app_module, db_module


@pytest.fixture(scope="module")
def app_with_db(tmp_path_factory) -> Generator[Tuple[object, object], None, None]:
    db_dir = tmp_path_factory.mktemp("user_api")
    db_path = db_dir / "user_tests.sqlite3"
    env = {
        "DATABASE_URL": f"sqlite:///{db_path}",
        "DB_DRIVER": "sqlite",
        "DB_NAME": str(db_path),
        "DATABASE_ECHO": "0",
    }
    with _override_env(env):
        app_module, db_module = _reload_backend_modules()
        try:
            yield app_module, db_module
        finally:
            db_module.engine.dispose()


@pytest.fixture(scope="module")
def client(app_with_db) -> TestClient:
    app_module, _ = app_with_db
    return TestClient(app_module.app)


@pytest.fixture(scope="module")
def db_module(app_with_db):
    _, db_module = app_with_db
    return db_module


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
