from __future__ import annotations

import importlib
from contextlib import contextmanager
from typing import Iterator, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy ORM models."""

    pass


_engine: Optional[Engine] = None
_session_factory: Optional[sessionmaker[Session]] = None


def _create_engine(url: str, *, pool_pre_ping: bool, echo: bool) -> Engine:
    connect_args: dict[str, object] = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    kwargs: dict[str, object] = {
        "future": True,
        "echo": echo,
        "pool_pre_ping": pool_pre_ping,
    }
    if connect_args:
        kwargs["connect_args"] = connect_args

    return create_engine(url, **kwargs)


def init_engine(url: Optional[str] = None) -> Engine:
    """Initialise the SQLAlchemy engine and session factory."""

    global _engine, _session_factory

    settings = get_settings()
    target_url = url or settings.database_url
    _engine = _create_engine(target_url, pool_pre_ping=settings.pool_pre_ping, echo=settings.echo_sql)
    _session_factory = sessionmaker(bind=_engine, expire_on_commit=False, future=True)

    # Ensure model modules are imported so metadata is registered.
    importlib.import_module("backend.db.models")

    return _engine


def get_engine() -> Engine:
    """Return the configured SQLAlchemy engine, initialising it if necessary."""

    if _engine is None:
        return init_engine()
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """Return the lazily-initialised session factory."""

    if _session_factory is None:
        init_engine()
    assert _session_factory is not None  # for type checking
    return _session_factory


@contextmanager
def session_scope() -> Iterator[Session]:
    """Provide a transactional scope around a series of operations."""

    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


__all__ = ["Base", "get_engine", "get_session_factory", "init_engine", "session_scope"]
