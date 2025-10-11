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


def _get_float_env(key: str, default: float) -> float:
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _get_int_env(key: str, default: int) -> int:
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime configuration for the Flask AI backend."""

    database_url: str
    pool_pre_ping: bool = True
    echo_sql: bool = False
    vllm_endpoint: str = "http://localhost:8008"
    text_model: str = "gpt-oss-20b"
    text_model_timeout: float = 15.0
    text_model_max_tokens: int = 512
    theme_temperature: float = 0.4
    proposal_temperature: float = 0.7
    vlm_endpoint: str = "http://localhost:8010"
    vision_model: str = "qwen2.5-vl-32b"
    vision_model_timeout: float = 12.0
    face_match_limit: int = 3


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load immutable settings from environment variables."""

    return Settings(
        database_url=_get_env("DATABASE_URL", "sqlite+pysqlite:///:memory:"),
        pool_pre_ping=_get_bool_env("DB_POOL_PRE_PING", True),
        echo_sql=_get_bool_env("SQLALCHEMY_ECHO", False),
        vllm_endpoint=_get_env("VLLM_ENDPOINT", "http://localhost:8008"),
        text_model=_get_env("AI_TEXT_MODEL", "gpt-oss-20b"),
        text_model_timeout=_get_float_env("AI_TEXT_TIMEOUT_SEC", 15.0),
        text_model_max_tokens=_get_int_env("AI_TEXT_MAX_TOKENS", 512),
        theme_temperature=_get_float_env("AI_THEME_TEMPERATURE", 0.4),
        proposal_temperature=_get_float_env("AI_PROPOSAL_TEMPERATURE", 0.7),
        vlm_endpoint=_get_env("VLM_ENDPOINT", "http://localhost:8010"),
        vision_model=_get_env("AI_VISION_MODEL", "qwen2.5-vl-32b"),
        vision_model_timeout=_get_float_env("AI_VISION_TIMEOUT_SEC", 12.0),
        face_match_limit=_get_int_env("AI_FACE_MATCH_LIMIT", 3),
    )


def reset_settings_cache() -> None:
    """Clear cached settings (intended for testing)."""

    get_settings.cache_clear()


__all__ = ["Settings", "get_settings", "reset_settings_cache"]
