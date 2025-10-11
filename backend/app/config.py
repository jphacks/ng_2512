"""Application configuration helpers."""

from __future__ import annotations

import os
from typing import Optional

from sqlalchemy.engine import URL


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

    username = _clean_env("USER")
    password = _clean_env("PASSWORD")
    host = _clean_env("DB_HOST") or "localhost"
    port_raw = _clean_env("DB_PORT")
    try:
        port: Optional[int] = int(port_raw) if port_raw is not None else None
    except ValueError:
        port = None
    database = _clean_env("DB_NAME") or "ng_2512"
    driver = _clean_env("DB_DRIVER") or "postgresql+psycopg"

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
