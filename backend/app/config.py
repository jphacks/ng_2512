"""Application configuration helpers."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy.engine import URL


load_dotenv()


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _clean_env(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip().strip("'").strip('"')
    return stripped or None


def _build_database_url() -> str:
    explicit_url = _clean_env("DATABASE_URL")
    if explicit_url:
        return explicit_url

    driver = _clean_env("DB_DRIVER")
    if not driver:
        raise RuntimeError(
            "Database connection is not configured. Set DATABASE_URL or DB_DRIVER."
        )

    if driver.startswith("sqlite"):
        database_name = _clean_env("DB_NAME") or "ng_2512.sqlite3"
        if database_name == ":memory:":
            database = database_name
        else:
            db_path = Path(database_name).expanduser()
            if not db_path.is_absolute():
                db_path = Path.cwd() / db_path
            database = str(db_path)
        url = URL.create(drivername=driver, database=database)
        return str(url)

    username = _clean_env("USER")
    password = _clean_env("PASSWORD")
    host = _clean_env("DB_HOST")
    if not host:
        raise RuntimeError("DB_HOST must be set when using non-SQLite databases.")
    port_raw = _clean_env("DB_PORT")
    try:
        port: Optional[int] = int(port_raw) if port_raw is not None else None
    except ValueError:
        port = None
    database = _clean_env("DB_NAME")
    if not database:
        raise RuntimeError("DB_NAME must be set when using non-SQLite databases.")

    url = URL.create(
        drivername=driver,
        username=username,
        password=password,
        host=host,
        port=port,
        database=database,
    )
    return str(url)


DATABASE_URL = _build_database_url()
DATABASE_ECHO = _bool_env("DATABASE_ECHO", default=False)


AI_SERVER_URL = _clean_env("AI_SERVER_URL") or "http://localhost:8000"
