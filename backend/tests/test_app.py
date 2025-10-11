from backend.app import create_app


def test_healthz_returns_ok():
    app = create_app()
    client = app.test_client()

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json == {"status": "ok"}


def test_readyz_returns_ready():
    app = create_app()
    client = app.test_client()

    response = client.get("/readyz")

    assert response.status_code == 200
    assert response.json == {"status": "ready"}
