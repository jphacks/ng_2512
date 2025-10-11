import os
import socket

import pytest

pytestmark = pytest.mark.integration


def test_database_url_present():
    assert os.getenv("DATABASE_URL"), "DATABASE_URL must be provided in compose environment"


def test_redis_url_present():
    assert os.getenv("REDIS_URL"), "REDIS_URL must be provided in compose environment"


def test_vllm_endpoint_present():
    assert os.getenv("VLLM_ENDPOINT"), "VLLM_ENDPOINT must be provided in compose environment"


def test_dependencies_are_reachable():
    endpoints = [
        ("db", 5432),
        ("redis", 6379),
        ("vllm", 8008),
    ]
    for host, port in endpoints:
        with socket.create_connection((host, port), timeout=10) as connection:
            assert connection is not None
