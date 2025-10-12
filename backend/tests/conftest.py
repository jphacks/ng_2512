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
    db_dir = tmp_path_factory.mktemp("backend_tests")
    db_path = db_dir / "test.sqlite3"
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
