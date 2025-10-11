from __future__ import annotations

import hashlib
import hmac
import threading
import time
from dataclasses import dataclass
from typing import Any, Mapping

from flask import Request


class AuthError(RuntimeError):
    """Represents an authentication related failure."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = int(status_code)
        self.code = code
        self.message = message


@dataclass(slots=True)
class RateLimitState:
    """Per-key counter used to enforce simple fixed-window rate limits."""

    window_start: int
    count: int = 0


class HMACAuthValidator:
    """Validates Recall AI API requests authenticated via HMAC headers."""

    def __init__(
        self,
        *,
        api_key: str | None,
        api_secret: str | None,
        tolerance_seconds: int = 300,
        rate_limit_per_minute: int | None = None,
        nonce_ttl_seconds: int = 600,
        clock: callable[[], float] = time.time,
    ) -> None:
        self._api_key = api_key
        self._api_secret = api_secret
        self._tolerance = max(int(tolerance_seconds), 0)
        self._rate_limit = rate_limit_per_minute
        self._nonce_ttl = max(int(nonce_ttl_seconds), 0)
        self._clock = clock
        self._nonces: dict[str, float] = {}
        self._rate_counters: dict[str, RateLimitState] = {}
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        """Return True when the validator has the material required for verification."""

        return bool(self._api_key) and bool(self._api_secret)

    def verify(self, request: Request) -> None:
        """Validate the HMAC signature carried on *request*.

        Raises :class:`AuthError` on failure.
        """

        if not self.enabled:
            return

        headers = request.headers
        api_key = headers.get("X-Api-Key")
        timestamp_header = headers.get("X-Timestamp")
        nonce = headers.get("X-Nonce")
        signature = headers.get("X-Signature")

        if not api_key or not timestamp_header or not nonce or not signature:
            raise AuthError(401, "unauthorized", "Missing authentication headers.")

        if api_key != self._api_key:
            raise AuthError(403, "forbidden", "Unknown API key.")

        try:
            timestamp = int(timestamp_header)
        except ValueError:
            raise AuthError(401, "unauthorized", "Invalid timestamp header.") from None

        now = int(self._clock())
        if self._tolerance and abs(now - timestamp) > self._tolerance:
            raise AuthError(401, "unauthorized", "Request timestamp is outside the allowed window.")

        self._enforce_rate_limit(api_key, now)
        self._enforce_nonce(nonce, now)

        expected = self._compute_signature(
            api_secret=self._api_secret or "",
            method=request.method,
            path=request.path,
            timestamp=timestamp_header,
            nonce=nonce,
            body=request.get_data(cache=True, as_text=False) or b"",
        )
        if not hmac.compare_digest(expected, signature.lower()):
            raise AuthError(403, "forbidden", "Signature mismatch.")

    def _enforce_rate_limit(self, api_key: str, now_epoch: int) -> None:
        if not self._rate_limit or self._rate_limit <= 0:
            return

        window = now_epoch - (now_epoch % 60)
        key = f"{api_key}:{window}"
        with self._lock:
            current = self._rate_counters.get(key)
            if current is None or current.window_start != window:
                current = RateLimitState(window_start=window, count=0)
                self._rate_counters[key] = current
            if current.count >= self._rate_limit:
                retry_after = (current.window_start + 60) - now_epoch
                message = "Rate limit exceeded. Try again later."
                error = AuthError(429, "rate-limit", message)
                error.retry_after = max(retry_after, 1)
                raise error
            current.count += 1

    def _enforce_nonce(self, nonce: str, now_epoch: int) -> None:
        if not nonce:
            raise AuthError(401, "unauthorized", "Nonce header is required.")

        cutoff = now_epoch - self._nonce_ttl
        with self._lock:
            # Garbage collect old nonce entries.
            stale = [value for value, ts in self._nonces.items() if ts < cutoff]
            for value in stale:
                self._nonces.pop(value, None)
            if nonce in self._nonces:
                raise AuthError(409, "replay-detected", "Replay detected for nonce.")
            self._nonces[nonce] = now_epoch

    @staticmethod
    def _compute_signature(
        *,
        api_secret: str,
        method: str,
        path: str,
        timestamp: str,
        nonce: str,
        body: bytes,
    ) -> str:
        body_hash = hashlib.sha256(body).hexdigest()
        canonical = "\n".join([method.upper(), path, timestamp, nonce, body_hash]).encode("utf-8")
        digest = hmac.new(api_secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()
        return digest.lower()

    def debug_snapshot(self) -> Mapping[str, Any]:
        """Return a copy of internal counters (testing observability)."""

        with self._lock:
            return {
                "nonces": dict(self._nonces),
                "rate_counters": {key: state.count for key, state in self._rate_counters.items()},
            }


__all__ = ["AuthError", "HMACAuthValidator"]
