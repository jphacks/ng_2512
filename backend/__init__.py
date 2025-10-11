from typing import Any


def create_app(*args: Any, **kwargs: Any):
    """Proxy to lazily import the Flask application factory."""

    from .app import create_app as _create_app

    return _create_app(*args, **kwargs)

__all__ = ["create_app"]
