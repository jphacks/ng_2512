#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: smoke_test.sh <base-url> [options]

Options:
  --timeout <seconds>   Max seconds to wait for readiness (default: 30)
  --expect-version <v>  Assert that GET /version returns the provided value.
  -h, --help            Show this message.

Examples:
  ./scripts/smoke/smoke_test.sh http://127.0.0.1:8000
  ./scripts/smoke/smoke_test.sh https://api.example.com --expect-version sha-abcdef
USAGE
}

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" >&2
}

fatal() {
  log "ERROR: $*"
  exit 1
}

BASE_URL=""
TIMEOUT=30
EXPECT_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --expect-version)
      EXPECT_VERSION="$2"
      shift 2
      ;;
    *)
      if [[ -z "$BASE_URL" ]]; then
        BASE_URL="$1"
        shift
      else
        fatal "Unexpected argument: $1"
      fi
      ;;
  esac
done

if [[ -z "$BASE_URL" ]]; then
  usage
  exit 1
fi

trim() {
  local s="$1"
  # shellcheck disable=SC2001
  echo "$s" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

require_endpoint() {
  local path="$1"
  local expected_status="$2"
  local url="${BASE_URL%/}/${path#/}"
  local body status
  log "Checking ${url}"
  if ! body="$(curl -fsS -w '\n%{http_code}\n' "$url")"; then
    fatal "Request to ${url} failed"
  fi
  status="$(echo "$body" | tail -n1)"
  body="$(echo "$body" | sed '$d')"
  if [[ "$status" != "$expected_status" ]]; then
    log "Response body:\n${body}"
    fatal "Unexpected status for ${url}: got ${status}, expected ${expected_status}"
  fi
  echo "$body"
}

wait_for_ready() {
  local deadline=$((SECONDS + TIMEOUT))
  while (( SECONDS < deadline )); do
    if curl -fsS "${BASE_URL%/}/readyz" >/dev/null 2>&1; then
      log "Ready endpoint returned success"
      return 0
    fi
    sleep 2
  done
  fatal "Timed out (${TIMEOUT}s) waiting for ${BASE_URL%/}/readyz"
}

log "=== Smoke test: ${BASE_URL} ==="
wait_for_ready

health_body="$(require_endpoint "/healthz" "200")"

if command -v jq >/dev/null 2>&1; then
  status="$(echo "$health_body" | jq -r '.status // empty')"
  [[ "$status" == "ok" ]] || fatal "Health endpoint did not return status=ok"
else
  [[ "$health_body" == *"ok"* ]] || fatal "Health endpoint body did not contain 'ok'"
fi

if [[ -n "$EXPECT_VERSION" ]]; then
  version_body="$(require_endpoint "/version" "200")"
  if command -v jq >/dev/null 2>&1; then
    version="$(echo "$version_body" | jq -r '.version // empty' | trim)"
  else
    version="$(trim "$version_body")"
  fi
  [[ "$version" == "$EXPECT_VERSION" ]] || fatal "Version mismatch: expected '$EXPECT_VERSION', got '${version:-<empty>}'"
fi

log "Smoke test completed successfully"
