"""Blueprint registration helpers for the Flask application."""

from __future__ import annotations

from flask import Flask

from .ai import ai_bp


def register_blueprints(app: Flask) -> None:
    """Register all application blueprints on *app*."""

    app.register_blueprint(ai_bp)


__all__ = ["register_blueprints"]
