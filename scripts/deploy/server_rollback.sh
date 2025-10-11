#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.yml"
DEFAULT_ENV_FILE="${REPO_ROOT}/deploy/.env"
RELEASE_LOG="${REPO_ROOT}/deploy/releases.log"

usage() {
  cat <<'USAGE'
Usage: server_rollback.sh --to-tag <tag> [options]

Options:
  --to-tag <tag>            (Required) Tag to roll back to (without repository).
  --image-repo <repo>       Override IMAGE_REPO from env file.
  --env-file <path>         Path to .env file (default: deploy/.env).
  --compose-file <path>     Path to docker-compose.yml (default: deploy/docker-compose.yml).
  --service-name <name>     Service name to roll back (default: api).
  --healthcheck-url <url>   Override HEALTHCHECK_URL for validation.
  --healthcheck-timeout <s> Override HEALTHCHECK_TIMEOUT (seconds).
  --run-migrations          Run MIGRATION_COMMAND after rollback (default: skipped).
  --migration-command <c>   Override MIGRATION_COMMAND (quotes required if spaces).
  --skip-health-check       Skip health check verification.
  -h, --help                Show this help message.
USAGE
}

log() {
  printf '[%(%Y-%m-%dT%H:%M:%SZ)T] %s\n' -1 "$*" >&2
}

fatal() {
  log "ERROR: $*"
  exit 1
}

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    fatal "docker compose (v2) or docker-compose not found"
  fi
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fatal "Required file not found: $path"
}

update_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  python3 - "$file" "$key" "$value" <<'PY'
import sys
from pathlib import Path

file_path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]

lines = []
found = False
if file_path.exists():
    for line in file_path.read_text().splitlines():
        if line.startswith(f"{key}="):
            lines.append(f"{key}={value}")
            found = True
        elif line.strip() == "" and not lines:
            continue
        else:
            lines.append(line)
else:
    file_path.parent.mkdir(parents=True, exist_ok=True)

if not found:
    lines.append(f"{key}={value}")

file_path.write_text("\n".join(lines) + "\n")
PY
}

append_release_log() {
  local action="$1"
  local current_tag="$2"
  local previous_image="$3"
  local status="$4"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf '%s,%s,%s,%s,%s\n' "$timestamp" "$action" "$status" "$current_tag" "${previous_image:-}" >>"$RELEASE_LOG"
}

perform_health_check() {
  local url="$1"
  local timeout_s="$2"
  local elapsed=0
  local step=5
  while (( elapsed < timeout_s )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "Health check succeeded at $url"
      return 0
    fi
    sleep "$step"
    elapsed=$((elapsed + step))
  done
  log "Health check failed after ${timeout_s}s"
  return 1
}

detect_compose

TARGET_TAG=""
IMAGE_REPO_OVERRIDE=""
ENV_FILE="$DEFAULT_ENV_FILE"
COMPOSE_FILE="$DEFAULT_COMPOSE_FILE"
SERVICE_NAME="api"
HEALTHCHECK_URL_OVERRIDE=""
HEALTHCHECK_TIMEOUT_OVERRIDE=""
RUN_MIGRATIONS=0
MIGRATION_COMMAND_OVERRIDE=""
SKIP_HEALTH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --to-tag)
      TARGET_TAG="$2"
      shift 2
      ;;
    --image-repo)
      IMAGE_REPO_OVERRIDE="$2"
      shift 2
      ;;
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --compose-file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --healthcheck-url)
      HEALTHCHECK_URL_OVERRIDE="$2"
      shift 2
      ;;
    --healthcheck-timeout)
      HEALTHCHECK_TIMEOUT_OVERRIDE="$2"
      shift 2
      ;;
    --run-migrations)
      RUN_MIGRATIONS=1
      shift
      ;;
    --migration-command)
      MIGRATION_COMMAND_OVERRIDE="$2"
      shift 2
      ;;
    --skip-health-check)
      SKIP_HEALTH=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fatal "Unknown option: $1"
      ;;
  esac
done

[[ -n "$TARGET_TAG" ]] || fatal "--to-tag is required"
require_file "$COMPOSE_FILE"
require_file "$ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

IMAGE_REPO="${IMAGE_REPO_OVERRIDE:-${IMAGE_REPO:-}}"
COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL_OVERRIDE:-${HEALTHCHECK_URL:-http://127.0.0.1:8000/readyz}}"
MIGRATION_COMMAND="${MIGRATION_COMMAND_OVERRIDE:-${MIGRATION_COMMAND:-flask db upgrade}}"
HEALTHCHECK_TIMEOUT="${HEALTHCHECK_TIMEOUT_OVERRIDE:-${HEALTHCHECK_TIMEOUT:-90}}"

[[ -n "$IMAGE_REPO" ]] || fatal "IMAGE_REPO must be set"

docker_compose() {
  env IMAGE_REPO="$IMAGE_REPO" IMAGE_TAG="$TARGET_TAG" COMPOSE_PROFILES="$COMPOSE_PROFILES" "${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

log "Rolling back ${IMAGE_REPO} to tag ${TARGET_TAG}"

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  log "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
fi

PREVIOUS_IMAGE="$("${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$SERVICE_NAME" 2>/dev/null | head -n1 || true)"
if [[ -n "$PREVIOUS_IMAGE" ]]; then
  PREVIOUS_IMAGE="$(docker inspect --format '{{ .Config.Image }}' "$PREVIOUS_IMAGE" 2>/dev/null || true)"
fi

log "Pulling ${IMAGE_REPO}:${TARGET_TAG}"
docker_compose pull "$SERVICE_NAME"

log "Recreating service $SERVICE_NAME"
docker_compose up -d --remove-orphans "$SERVICE_NAME"

if [[ $RUN_MIGRATIONS -eq 1 ]]; then
  log "Running migration command: $MIGRATION_COMMAND"
  docker_compose exec -T "$SERVICE_NAME" sh -c "$MIGRATION_COMMAND"
else
  log "Skipping migration command during rollback"
fi

if [[ $SKIP_HEALTH -eq 0 ]]; then
  if ! perform_health_check "$HEALTHCHECK_URL" "$HEALTHCHECK_TIMEOUT"; then
    append_release_log "rollback" "$TARGET_TAG" "${PREVIOUS_IMAGE:-}" "healthcheck_failed"
    fatal "Rollback succeeded but health check failed"
  fi
else
  log "Skipping health check as requested"
fi

update_env_var "$ENV_FILE" "IMAGE_TAG" "$TARGET_TAG"
append_release_log "rollback" "$TARGET_TAG" "${PREVIOUS_IMAGE:-}" "success"

log "Rollback to ${TARGET_TAG} completed"
