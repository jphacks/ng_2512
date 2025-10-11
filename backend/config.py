from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


def _get_env(key: str, default: str) -> str:
    value = os.getenv(key)
    return value if value is not None else default


def _get_bool_env(key: str, default: bool) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime configuration for the Flask AI backend."""

    database_url: str
    pool_pre_ping: bool = True
    echo_sql: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load immutable settings from environment variables."""

    return Settings(
        database_url=_get_env("DATABASE_URL", "sqlite+pysqlite:///:memory:"),
        pool_pre_ping=_get_bool_env("DB_POOL_PRE_PING", True),
        echo_sql=_get_bool_env("SQLALCHEMY_ECHO", False),
    )


def reset_settings_cache() -> None:
    """Clear cached settings (intended for testing)."""

    get_settings.cache_clear()


__all__ = ["Settings", "get_settings", "reset_settings_cache"]
