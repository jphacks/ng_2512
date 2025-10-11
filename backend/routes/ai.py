from __future__ import annotations

from typing import Any, Callable, Iterable, Sequence

from flask import Blueprint, Response, current_app, jsonify, request

from backend.database import session_scope
from backend.security import AuthError
from backend.services import AIService, AIServiceError, AIProposalResult, FaceMatch, ThemeSuggestionResult

ai_bp = Blueprint("ai", __name__)


JsonDict = dict[str, Any]
ServiceFactory = Callable[[Any], AIService]


def _get_service_factory() -> ServiceFactory:
    factory: ServiceFactory | None = current_app.config.get("AI_SERVICE_FACTORY")
    if factory is None:
        raise RuntimeError("AI service factory is not configured on the Flask app.")
    return factory


def _json_error(status_code: int, code: str, message: str, *, extra_headers: dict[str, str] | None = None) -> Response:
    payload = {"error": {"code": code, "message": message}}
    response = jsonify(payload)
    response.status_code = status_code
    if extra_headers:
        for key, value in extra_headers.items():
            response.headers[key] = value
    return response


def _enforce_hmac() -> None:
    validator = current_app.extensions.get("hmac_auth")
    if validator is None:
        return
    validator.verify(request)


def _parse_json() -> JsonDict:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")
    return payload


def _validate_asset_id(data: JsonDict) -> str:
    asset_id = data.get("asset_id")
    if not isinstance(asset_id, str) or not asset_id.strip():
        raise ValueError("asset_id must be a non-empty string.")
    return asset_id


def _validate_hints(data: JsonDict) -> Sequence[str] | None:
    hints = data.get("hints")
    if hints is None:
        return None
    if not isinstance(hints, Sequence) or isinstance(hints, (str, bytes)):
        raise ValueError("hints must be an array of strings.")
    result: list[str] = []
    for item in hints:
        if not isinstance(item, str):
            raise ValueError("hints must be an array of strings.")
        if item:
            result.append(item)
    return result


def _validate_friend_ids(data: JsonDict) -> Sequence[int]:
    friend_ids = data.get("friend_user_ids") or data.get("friendIds") or []
    if not isinstance(friend_ids, Iterable) or isinstance(friend_ids, (str, bytes)):
        raise ValueError("friend_user_ids must be an array of integers.")
    result: list[int] = []
    for item in friend_ids:
        if not isinstance(item, int):
            raise ValueError("friend_user_ids must be an array of integers.")
        result.append(item)
    return result


def _validate_per_face_limit(data: JsonDict) -> int | None:
    if "per_face_limit" not in data:
        return None
    limit = data["per_face_limit"]
    if limit is None:
        return None
    if isinstance(limit, bool) or not isinstance(limit, int):
        raise ValueError("per_face_limit must be an integer.")
    if limit < 0:
        raise ValueError("per_face_limit must be greater than or equal to zero.")
    return limit


def _validate_requester_id(data: JsonDict) -> int:
    requester_id = data.get("requester_id")
    if not isinstance(requester_id, int):
        raise ValueError("requester_id must be provided as an integer.")
    return requester_id


def _validate_audience_hints(data: JsonDict) -> Sequence[int] | None:
    hints = data.get("audience_hints") or data.get("audienceHints")
    if hints is None:
        return None
    if not isinstance(hints, Iterable) or isinstance(hints, (str, bytes)):
        raise ValueError("audience_hints must be an array of integers.")
    result: list[int] = []
    for item in hints:
        if not isinstance(item, int):
            raise ValueError("audience_hints must only contain integers.")
        result.append(item)
    return result


def _validate_context_notes(data: JsonDict) -> Sequence[str] | None:
    notes = data.get("context_notes") or data.get("contextNotes") or data.get("notes")
    if notes is None:
        return None
    if not isinstance(notes, Iterable) or isinstance(notes, (str, bytes)):
        raise ValueError("context_notes must be an array of strings.")
    result: list[str] = []
    for item in notes:
        if not isinstance(item, str):
            raise ValueError("context_notes must be an array of strings.")
        if item:
            result.append(item)
    return result


def _serialize_theme_result(result: ThemeSuggestionResult) -> JsonDict:
    return {
        "themes": list(result.suggestions),
        "description": result.description,
        "model": result.source_model,
    }


def _serialize_face_matches(matches: Sequence[FaceMatch]) -> JsonDict:
    serialized = []
    for match in matches:
        bbox = list(match.face.bbox) if match.face.bbox else []
        candidates = [
            {"user_id": candidate.user_id, "display_name": candidate.display_name, "score": candidate.score}
            for candidate in match.candidates
        ]
        serialized.append({"box": bbox, "candidates": candidates})
    return {"matched_faces": serialized}


def _serialize_proposal(result: AIProposalResult) -> JsonDict:
    draft = {
        "title": result.title,
        "body": result.body,
        "slots": list(result.suggested_slots),
        "audience_user_ids": list(result.audience_user_ids),
    }
    return {"draft": draft, "model": result.source_model}


@ai_bp.post("/ai/themes/suggest")
def post_ai_themes_suggest() -> Response:
    try:
        _enforce_hmac()
        payload = _parse_json()
        asset_id = _validate_asset_id(payload)
        hints = _validate_hints(payload)
        top_k = payload.get("top_k", 5)
        if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
            raise ValueError("top_k must be a positive integer.")
    except AuthError as auth_error:
        headers = {}
        retry_after = getattr(auth_error, "retry_after", None)
        if retry_after is not None:
            headers["Retry-After"] = str(retry_after)
        return _json_error(auth_error.status_code, auth_error.code, auth_error.message, extra_headers=headers)
    except ValueError as exc:
        return _json_error(422, "invalid-argument", str(exc))

    try:
        with session_scope() as session:
            factory = _get_service_factory()
            service = factory(session)
            result = service.suggest_themes(asset_id, hints=hints, top_k=top_k)
    except AIServiceError as exc:
        return _json_error(500, "ai-service-error", str(exc))
    except RuntimeError as exc:
        return _json_error(503, "service-unavailable", str(exc))

    return jsonify(_serialize_theme_result(result))


@ai_bp.post("/ai/people/match")
def post_ai_people_match() -> Response:
    try:
        _enforce_hmac()
        payload = _parse_json()
        asset_id = _validate_asset_id(payload)
        requester_id = _validate_requester_id(payload)
        friend_ids = _validate_friend_ids(payload)
        limit = _validate_per_face_limit(payload)
    except AuthError as auth_error:
        headers = {}
        retry_after = getattr(auth_error, "retry_after", None)
        if retry_after is not None:
            headers["Retry-After"] = str(retry_after)
        return _json_error(auth_error.status_code, auth_error.code, auth_error.message, extra_headers=headers)
    except ValueError as exc:
        return _json_error(422, "invalid-argument", str(exc))

    try:
        with session_scope() as session:
            factory = _get_service_factory()
            service = factory(session)
            matches = service.match_people(
                asset_id,
                requester_id=requester_id,
                friend_user_ids=friend_ids,
                per_face_limit=limit,
            )
    except AIServiceError as exc:
        return _json_error(500, "ai-service-error", str(exc))
    except RuntimeError as exc:
        return _json_error(503, "service-unavailable", str(exc))

    response = _serialize_face_matches(matches)
    response["requester_id"] = requester_id
    return jsonify(response)


@ai_bp.post("/ai/proposals/auto")
def post_ai_proposals_auto() -> Response:
    try:
        _enforce_hmac()
        payload = _parse_json()
        asset_id = _validate_asset_id(payload)
        audience_hints = _validate_audience_hints(payload)
        context_notes = _validate_context_notes(payload)
    except AuthError as auth_error:
        headers = {}
        retry_after = getattr(auth_error, "retry_after", None)
        if retry_after is not None:
            headers["Retry-After"] = str(retry_after)
        return _json_error(auth_error.status_code, auth_error.code, auth_error.message, extra_headers=headers)
    except ValueError as exc:
        return _json_error(422, "invalid-argument", str(exc))

    try:
        with session_scope() as session:
            factory = _get_service_factory()
            service = factory(session)
            result = service.generate_proposal_draft(
                asset_id,
                audience_hints=audience_hints,
                context_notes=context_notes,
            )
    except AIServiceError as exc:
        return _json_error(500, "ai-service-error", str(exc))
    except RuntimeError as exc:
        return _json_error(503, "service-unavailable", str(exc))

    return jsonify(_serialize_proposal(result))


__all__ = ["ai_bp"]
