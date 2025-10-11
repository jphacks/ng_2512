from __future__ import annotations

from flask import Flask, jsonify

from .database import init_engine


def create_app() -> Flask:
    """Create the Flask application instance."""
    app = Flask(__name__)

    # Initialise the database engine and keep a handle on the Flask app config.
    app.config["SQLALCHEMY_ENGINE"] = init_engine()

    @app.get("/healthz")
    def healthz():
        return jsonify(status="ok")

    @app.get("/readyz")
    def readyz():
        return jsonify(status="ready")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8000, debug=True)
