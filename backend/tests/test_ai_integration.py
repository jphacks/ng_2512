#!/usr/bin/env python
"""Tests for AI-related endpoints, including integration with AI_Server."""

import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

# Add the project root to the path to allow importing `app`
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

# Use a single client for all tests
client = TestClient(app)

@pytest.fixture(scope="module")
def face_image_path() -> Path:
    """Fixture to create a dummy face image for tests."""
    assets_dir = Path(__file__).parent / "assets"
    assets_dir.mkdir(exist_ok=True)
    image_path = assets_dir / "test_face.jpg"

    # Create a simple image with a face-like pattern
    img = Image.new('RGB', (100, 100), color = 'white')
    draw = ImageDraw.Draw(img)
    draw.ellipse((20, 20, 80, 80), fill='yellow', outline='black') # Head
    draw.ellipse((35, 40, 45, 50), fill='black') # Left eye
    draw.ellipse((55, 40, 65, 50), fill='black') # Right eye
    draw.arc((30, 50, 70, 70), 0, 180, fill='black') # Mouth
    img.save(image_path)

    yield image_path

    # Teardown: remove the image after tests are done
    os.remove(image_path)


def test_healthcheck():
    """Ensure the healthcheck endpoint is working."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_ai_proposal_endpoint():
    """Test the AI proposal endpoint. Expects a successful response."""
    # The AI_SERVER_URL must be set for this test to pass
    response = client.get("/api/proposal/ai?user_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "event_date" in data
    assert data["title"] is not None

def test_face_matching_endpoint(face_image_path: Path):
    """Test the face matching endpoint with a dummy image."""
    # The AI_SERVER_URL must be set for this test to pass
    with open(face_image_path, "rb") as f:
        files = {"file": (face_image_path.name, f, "image/jpeg")}
        response = client.post("/api/user/match-face", files=files)
    
    # This endpoint connects to the AI server, which might not find a match
    # in the test DB. We are primarily testing for a successful connection and valid response format.
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "match_confidence" in data
