"""Application configuration helpers."""

from __future__ import annotations

import os


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/ng_2512",
)
DATABASE_ECHO = _bool_env("DATABASE_ECHO", default=False)

