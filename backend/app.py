from __future__ import annotations

import os
from flask import Flask, jsonify

from .database import init_engine
from .routes import register_blueprints
from .security import HMACAuthValidator
from .container import configure_ai_services


def create_app() -> Flask:
    """Create the Flask application instance."""
    app = Flask(__name__)

    # Initialise the database engine and keep a handle on the Flask app config.
    app.config["SQLALCHEMY_ENGINE"] = init_engine()

    # Configure HMAC authentication parameters (optional for development).
    app.config.setdefault("AI_API_KEY", os.getenv("AI_API_KEY"))
    app.config.setdefault("AI_API_SECRET", os.getenv("AI_API_SECRET"))
    app.config.setdefault("AI_REQUEST_TOLERANCE_SEC", int(os.getenv("AI_REQUEST_TOLERANCE_SEC", "300")))
    app.config.setdefault("AI_RATE_LIMIT_PER_MIN", int(os.getenv("AI_RATE_LIMIT_PER_MIN", "30")))
    app.config.setdefault("AI_NONCE_TTL_SEC", int(os.getenv("AI_NONCE_TTL_SEC", "600")))

    hmac_validator = HMACAuthValidator(
        api_key=app.config.get("AI_API_KEY"),
        api_secret=app.config.get("AI_API_SECRET"),
        tolerance_seconds=app.config.get("AI_REQUEST_TOLERANCE_SEC", 300),
        rate_limit_per_minute=app.config.get("AI_RATE_LIMIT_PER_MIN", None),
        nonce_ttl_seconds=app.config.get("AI_NONCE_TTL_SEC", 600),
    )
    app.extensions["hmac_auth"] = hmac_validator

    register_blueprints(app)

    if "AI_SERVICE_FACTORY" not in app.config:
        configure_ai_services(app)

    @app.get("/healthz")
    def healthz():
        return jsonify(status="ok")

    @app.get("/readyz")
    def readyz():
        return jsonify(status="ready")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8000, debug=True)
