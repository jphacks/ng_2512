from __future__ import annotations

import json
import math
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Iterable, Mapping, Protocol, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import Settings, get_settings
from backend.db import models
from backend.repositories import AssetProcessingInfo, AssetRepository


class MetricsRecorder(Protocol):
    """Minimal interface for emitting timing metrics."""

    def timing(self, name: str, value: float, *, tags: Mapping[str, object] | None = None) -> None:  # pragma: no cover - protocol
        ...


class LLMClient(Protocol):
    """Protocol for text-only LLM client (gpt-oss20B)."""

    model_name: str

    def generate(
        self,
        *,
        prompt: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> str:  # pragma: no cover - protocol
        ...


class VisionLanguageClient(Protocol):
    """Protocol for multimodal client (qwen2.5-vl-32B)."""

    model_name: str

    def describe_asset(
        self,
        asset: AssetProcessingInfo,
        *,
        timeout: float,
    ) -> str:  # pragma: no cover - protocol
        ...


class ImageEmbeddingClient(Protocol):
    """Protocol for CLIP-style embeddings."""

    def embed_asset(self, asset: AssetProcessingInfo) -> Sequence[float]:  # pragma: no cover - protocol
        ...


@dataclass(frozen=True)
class DetectedFace:
    """Face detection result with embedding."""

    bbox: tuple[float, float, float, float]
    embedding: Sequence[float]


class FaceEmbeddingClient(Protocol):
    """Protocol for ArcFace-style embedding generator."""

    def detect_and_embed(self, asset: AssetProcessingInfo) -> Sequence[DetectedFace]:  # pragma: no cover - protocol
        ...


@dataclass(frozen=True)
class FaceMatchCandidate:
    """Candidate user matched against a face embedding."""

    user_id: int
    display_name: str
    score: float


@dataclass(frozen=True)
class FaceMatch:
    """Face detection paired with ranked candidates."""

    face: DetectedFace
    candidates: Sequence[FaceMatchCandidate]


class FaceIndex(Protocol):
    """Index of opt-in user embeddings for face matching."""

    def search(
        self,
        *,
        query_embedding: Sequence[float],
        limit: int,
        include_user_ids: Iterable[int],
    ) -> Sequence[FaceMatchCandidate]:  # pragma: no cover - protocol
        ...


@dataclass(frozen=True)
class ThemeSuggestionResult:
    """Structured response for theme suggestions."""

    suggestions: Sequence[str]
    description: str
    source_model: str


@dataclass(frozen=True)
class AIProposalResult:
    """Structured proposal draft returned by the LLM."""

    title: str
    body: str
    suggested_slots: Sequence[Mapping[str, str]]
    audience_user_ids: Sequence[int]
    source_model: str
    raw_response: str


class AIServiceError(RuntimeError):
    """Base error raised by AIService operations."""


class AIService:
    """Orchestrates CLIP/ArcFace embeddings with gpt-oss20B and qwen2.5-vl-32B."""

    def __init__(
        self,
        session: Session,
        asset_repository: AssetRepository,
        *,
        clip_client: ImageEmbeddingClient,
        face_client: FaceEmbeddingClient,
        face_index: FaceIndex,
        llm_client: LLMClient,
        vision_client: VisionLanguageClient,
        metrics: MetricsRecorder | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._session = session
        self._assets = asset_repository
        self._clip = clip_client
        self._faces = face_client
        self._face_index = face_index
        self._llm = llm_client
        self._vision = vision_client
        self._metrics = metrics
        self._settings = settings or get_settings()

    # ------------------------------------------------------------------
    # Theme suggestions (F10)
    # ------------------------------------------------------------------
    def suggest_themes(
        self,
        asset_id: str,
        *,
        hints: Sequence[str] | None = None,
        top_k: int = 5,
    ) -> ThemeSuggestionResult:
        start = time.perf_counter()
        asset = self._resolve_asset(asset_id)
        description = self._invoke_vision(asset)
        image_vector = self._clip.embed_asset(asset)
        candidates = self._collect_theme_candidates(image_vector)
        best_candidates = candidates[: max(int(top_k), 1)]

        prompt = self._build_theme_prompt(description, hints or [], best_candidates)
        llm_start = time.perf_counter()
        response = self._llm.generate(
            prompt=prompt,
            temperature=self._settings.theme_temperature,
            max_tokens=self._settings.text_model_max_tokens,
            timeout=self._settings.text_model_timeout,
        )
        self._record_timing("ai.llm.theme", time.perf_counter() - llm_start)

        suggestions = self._parse_theme_response(response, fallback=[c[0] for c in best_candidates])
        total = time.perf_counter() - start
        self._record_timing("ai.service.theme", total)
        return ThemeSuggestionResult(
            suggestions=suggestions,
            description=description,
            source_model=self._llm.model_name,
        )

    # ------------------------------------------------------------------
    # People matching (F11)
    # ------------------------------------------------------------------
    def match_people(
        self,
        asset_id: str,
        *,
        requester_id: int,
        friend_user_ids: Iterable[int],
        per_face_limit: int | None = None,
    ) -> Sequence[FaceMatch]:
        asset = self._resolve_asset(asset_id)
        faces = self._faces.detect_and_embed(asset)
        if not faces:
            return []

        allowed_users = {int(user_id) for user_id in friend_user_ids}
        if not allowed_users:
            return [FaceMatch(face=face, candidates=[]) for face in faces]

        limit = int(per_face_limit) if per_face_limit is not None else self._settings.face_match_limit
        limit = max(limit, 0)
        matches: list[FaceMatch] = []
        for detected in faces:
            face_start = time.perf_counter()
            candidates = list(
                self._face_index.search(
                    query_embedding=detected.embedding,
                    limit=limit,
                    include_user_ids=allowed_users,
                )
            )
            self._record_timing("ai.face.match", time.perf_counter() - face_start, tags={"requester": requester_id})
            matches.append(FaceMatch(face=detected, candidates=candidates))
        return matches

    # ------------------------------------------------------------------
    # Proposal generation (F12)
    # ------------------------------------------------------------------
    def generate_proposal_draft(
        self,
        asset_id: str,
        *,
        audience_hints: Sequence[int] | None = None,
        context_notes: Sequence[str] | None = None,
    ) -> AIProposalResult:
        asset = self._resolve_asset(asset_id)
        description = self._invoke_vision(asset)

        prompt = self._build_proposal_prompt(
            description=description,
            audience_hints=audience_hints or [],
            context_notes=context_notes or [],
        )
        start = time.perf_counter()
        response = self._llm.generate(
            prompt=prompt,
            temperature=self._settings.proposal_temperature,
            max_tokens=self._settings.text_model_max_tokens,
            timeout=self._settings.text_model_timeout,
        )
        self._record_timing("ai.llm.proposal", time.perf_counter() - start)

        parsed = self._parse_proposal_response(response)
        return AIProposalResult(
            title=parsed.get("title", "").strip(),
            body=parsed.get("body", "").strip(),
            suggested_slots=parsed.get("slots", []),
            audience_user_ids=parsed.get("audience", []),
            source_model=self._llm.model_name,
            raw_response=response,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _resolve_asset(self, asset_id: str) -> AssetProcessingInfo:
        try:
            return self._assets.resolve_for_processing(asset_id, fetch_object_metadata=False)
        except Exception as exc:  # pragma: no cover - passthrough for repository errors
            raise AIServiceError(str(exc)) from exc

    def _invoke_vision(self, asset: AssetProcessingInfo) -> str:
        start = time.perf_counter()
        description = self._vision.describe_asset(asset, timeout=self._settings.vision_model_timeout)
        self._record_timing("ai.vlm.describe", time.perf_counter() - start)
        return description

    def _collect_theme_candidates(self, query_vector: Sequence[float]) -> list[tuple[str, float]]:
        stmt = (
            select(models.ThemeVocab.name, models.ThemeEmbedding.embedding)
            .join(models.ThemeEmbedding, models.ThemeEmbedding.theme_id == models.ThemeVocab.id)
            .where(models.ThemeEmbedding.current.is_(True))
        )
        rows = self._session.execute(stmt).all()
        scored: list[tuple[str, float]] = []
        for name, embedding in rows:
            score = self._cosine_similarity(query_vector, embedding)
            scored.append((name, score))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored

    @staticmethod
    def _cosine_similarity(lhs: Sequence[float], rhs: Sequence[float]) -> float:
        lhs_len = len(lhs)
        rhs_len = len(rhs)
        if lhs_len == 0 or rhs_len == 0:
            return 0.0

        numerator = 0.0
        lhs_norm_sq = 0.0
        rhs_norm_sq = 0.0
        for left, right in zip(lhs, rhs):
            a = float(left)
            b = float(right)
            numerator += a * b
            lhs_norm_sq += a * a
            rhs_norm_sq += b * b
        if lhs_norm_sq == 0.0 or rhs_norm_sq == 0.0:
            return 0.0
        return numerator / math.sqrt(lhs_norm_sq * rhs_norm_sq)

    def _build_theme_prompt(
        self,
        description: str,
        hints: Sequence[str],
        candidates: Sequence[tuple[str, float]],
    ) -> str:
        hint_text = ", ".join(hints) if hints else "なし"
        candidate_lines = "\n".join(f"- {name} (score={score:.3f})" for name, score in candidates)
        return (
            "あなたは遊びのイベントプランナーです。以下の画像説明と候補テーマをもとに、"
            "日本語で 3~5 件のテーマ候補を JSON 配列形式（文字列のみ）で出力してください。\n"
            f"画像説明: {description}\n"
            f"ユーザーヒント: {hint_text}\n"
            f"候補テーマ:\n{candidate_lines}\n"
            "出力例: [\"カフェで近況会\", \"ボードゲームナイト\"]"
        )

    def _build_proposal_prompt(
        self,
        *,
        description: str,
        audience_hints: Sequence[int],
        context_notes: Sequence[str],
    ) -> str:
        audience_text = ", ".join(str(user_id) for user_id in audience_hints) or "なし"
        notes_text = "\n".join(f"- {note}" for note in context_notes) or "なし"
        return (
            "あなたは友人同士の再会をアシストする提案オーガナイザーです。"
            "以下の画像説明と補足情報を踏まえ、JSON でドラフト提案を生成してください。"
            "出力は {\"title\": str, \"body\": str, \"audience\": [int], \"slots\": [{\"start\": ISO8601, \"end\": ISO8601}]}"
            " の形式にしてください。\n"
            f"画像説明: {description}\n"
            f"宛先ヒント: {audience_text}\n"
            f"補足メモ:\n{notes_text}\n"
            "出力では、本文は 2 文まで、候補日時は 0~2 件までで構いません。"
        )

    @staticmethod
    def _parse_theme_response(response: str, *, fallback: Sequence[str]) -> Sequence[str]:
        try:
            parsed = json.loads(response)
            if isinstance(parsed, list) and all(isinstance(item, str) for item in parsed):
                return parsed[:5]
        except json.JSONDecodeError:
            pass
        return fallback

    def _parse_proposal_response(self, response: str) -> dict[str, object]:
        try:
            parsed = json.loads(response)
        except json.JSONDecodeError as exc:  # pragma: no cover - defensive
            raise AIServiceError(f"LLM 応答の JSON パースに失敗しました: {exc}") from exc

        if not isinstance(parsed, dict):  # pragma: no cover - defensive
            raise AIServiceError("LLM 応答が想定された JSON オブジェクトではありません")

        title = parsed.get("title", "")
        body = parsed.get("body", "")
        audience = parsed.get("audience", [])
        slots = parsed.get("slots", [])

        if not isinstance(title, str) or not isinstance(body, str):
            raise AIServiceError("LLM 応答の title/body が文字列ではありません")
        if not isinstance(audience, list) or not all(isinstance(item, int) for item in audience):
            raise AIServiceError("LLM 応答の audience が整数配列ではありません")
        if not isinstance(slots, list):
            raise AIServiceError("LLM 応答の slots が配列ではありません")
        for entry in slots:
            if not isinstance(entry, Mapping) or "start" not in entry or "end" not in entry:
                raise AIServiceError("LLM 応答の slots 要素が start/end を含む辞書ではありません")
        return {
            "title": title,
            "body": body,
            "audience": audience,
            "slots": slots,
        }

    def _record_timing(self, name: str, value: float, *, tags: Mapping[str, object] | None = None) -> None:
        if self._metrics is None:
            return
        self._metrics.timing(name, value, tags=tags or {})


class VLLMHTTPClient:
    """Minimal HTTP client for gpt-oss20B served through vLLM."""

    def __init__(self, endpoint: str, *, model_name: str) -> None:
        self._endpoint = endpoint.rstrip("/")
        self.model_name = model_name

    def generate(
        self,
        *,
        prompt: str,
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> str:
        url = f"{self._endpoint}/v1/chat/completions"
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": "You are a helpful Japanese event planning assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = response.read()
        except urllib.error.URLError as exc:  # pragma: no cover - network failure
            raise AIServiceError(f"vLLM へのリクエストに失敗しました: {exc}") from exc

        try:
            parsed = json.loads(body.decode("utf-8"))
            return parsed["choices"][0]["message"]["content"]
        except (KeyError, IndexError, json.JSONDecodeError) as exc:  # pragma: no cover - defensive
            raise AIServiceError(f"vLLM 応答の解析に失敗しました: {exc}") from exc


class QWenHTTPClient:
    """Minimal HTTP client for qwen2.5-vl-32B vision-language description."""

    def __init__(self, endpoint: str, *, model_name: str) -> None:
        self._endpoint = endpoint.rstrip("/")
        self.model_name = model_name

    def describe_asset(self, asset: AssetProcessingInfo, *, timeout: float) -> str:
        url = f"{self._endpoint}/v1/vision/completions"
        payload = {
            "model": self.model_name,
            "input": {
                "assetUri": asset.asset.as_s3_uri(),
                "contentType": asset.asset.content_type,
            },
        }
        data = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = response.read()
        except urllib.error.URLError as exc:  # pragma: no cover - network failure
            raise AIServiceError(f"Qwen VLM へのリクエストに失敗しました: {exc}") from exc

        try:
            parsed = json.loads(body.decode("utf-8"))
            return parsed["choices"][0]["message"]["content"]
        except (KeyError, IndexError, json.JSONDecodeError) as exc:  # pragma: no cover - defensive
            raise AIServiceError(f"Qwen VLM 応答の解析に失敗しました: {exc}") from exc


__all__ = [
    "AIProposalResult",
    "AIService",
    "AIServiceError",
    "DetectedFace",
    "FaceMatch",
    "FaceMatchCandidate",
    "ThemeSuggestionResult",
    "QWenHTTPClient",
    "VLLMHTTPClient",
]
