from __future__ import annotations

import asyncio
import httpx
from fastapi import UploadFile

from . import config


async def generate_embedding_from_image(file: UploadFile) -> list[float] | None:
    """Detects faces in an image and generates an embedding for the largest face."""
    # aiohttpやstarletteのUploadFileはseekが必要
    await file.seek(0)
    image_content = await file.read()
    await file.seek(0) # 他の処理で再利用するためにポインタを戻す

    faces_response = await detect_faces_from_image_content(image_content)

    if not faces_response:
        return None

    # 最も大きい顔を選択
    largest_face = max(faces_response, key=lambda f: f['box'][2] * f['box'][3])
    box = largest_face['box']

    async with httpx.AsyncClient() as client:
        import json
        files = {"file": (file.filename, image_content, file.content_type)}
        data = {"box": json.dumps(box)}
        try:
            response = await client.post(f"{config.AI_SERVER_URL}/embedding", files=files, data=data, timeout=60.0)
            response.raise_for_status()
            return response.json()["embedding"]
        except httpx.RequestError as exc:
            raise RuntimeError(f"Error connecting to AI server: {exc}") from exc


async def get_ai_proposal_suggestion(prompt: str) -> dict:
    """Gets a proposal suggestion from the AI server."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{config.AI_SERVER_URL}/generate-proposal",
                json={"prompt": prompt},
                timeout=60.0
            )
            response.raise_for_status()
            ai_result = response.json()

            # AIからの応答をバックエンドの形式に変換
            # 日付や場所はAIが生成しないため、ダミーの値を設定
            from datetime import datetime, timedelta, timezone
            return {
                "title": ai_result.get("title", "AIによる提案"),
                "event_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                "location": "オンライン",
                "participant_ids": [], # 参加者は別途決定する必要がある
            }
        except httpx.RequestError as exc:
            raise RuntimeError(f"Error connecting to AI server: {exc}") from exc


async def detect_faces_from_image_content(image_content: bytes) -> list[dict]:
    """Sends image content to the AI server to detect faces."""
    async with httpx.AsyncClient() as client:
        files = {"file": ("image.jpg", image_content, "image/jpeg")}
        try:
            response = await client.post(f"{config.AI_SERVER_URL}/detect-faces", files=files, timeout=60.0)
            response.raise_for_status()
            return response.json()["faces"]
        except httpx.RequestError:
            return []


async def generate_embedding_from_url(image_url: str) -> list[float] | None:
    """Downloads an image, detects the largest face, and generates an embedding for it."""
    async with httpx.AsyncClient() as client:
        try:
            # 1. Download image
            download_response = await client.get(image_url, follow_redirects=True, timeout=10.0)
            download_response.raise_for_status()
            image_content = await download_response.aread()

            # 2. Detect faces
            faces_response = await detect_faces_from_image_content(image_content)
            if not faces_response:
                return None

            # 3. Get embedding for the largest face
            largest_face = max(faces_response, key=lambda f: f['box'][2] * f['box'][3])
            box = largest_face['box']

            import json
            files = {"file": ("image.jpg", image_content, "image/jpeg")}
            data = {"box": json.dumps(box)}
            
            embedding_response = await client.post(f"{config.AI_SERVER_URL}/embedding", files=files, data=data, timeout=60.0)
            embedding_response.raise_for_status()
            return embedding_response.json()["embedding"]

        except httpx.RequestError:
            return None
