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

def test_ai_proposal_endpoint(mocker):
    """Test the AI proposal endpoint with a mocked AI service."""
    # Mock the AI service to avoid actual HTTP requests
    mocker.patch(
        "app.ai_service.get_ai_proposal_suggestion",
        return_value={
            "title": "Mocked Proposal",
            "event_date": "2025-12-25T12:00:00Z",
            "location": "Virtual",
            "participant_ids": [1, 2],
        },
    )

    response = client.get("/api/proposal/ai?user_id=1")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Mocked Proposal"
    assert "event_date" in data

def test_face_matching_endpoint(mocker, face_image_path: Path):
    """Test the face matching endpoint with a mocked AI service and DB."""
    # Mock the AI service to avoid actual HTTP requests
    mocker.patch(
        "app.ai_service.generate_embedding_from_image",
        return_value=[0.1] * 128,  # Dummy embedding
    )

    # Mock the DB function to avoid DB queries
    mock_user = mocker.Mock()
    mock_user.id = 1
    mock_user.display_name = "Test User"
    mocker.patch(
        "app.db.find_user_by_face_embedding",
        return_value=(mock_user, 0.95),  # Dummy user and confidence
    )

    with open(face_image_path, "rb") as f:
        files = {"file": (face_image_path.name, f, "image/jpeg")}
        response = client.post("/api/user/match-face", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 1
    assert data["display_name"] == "Test User"
    assert data["match_confidence"] == 0.95
