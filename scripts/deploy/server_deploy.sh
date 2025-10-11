#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEFAULT_COMPOSE_FILE="${REPO_ROOT}/deploy/docker-compose.yml"
DEFAULT_ENV_FILE="${REPO_ROOT}/deploy/.env"
RELEASE_LOG="${REPO_ROOT}/deploy/releases.log"

usage() {
  cat <<'USAGE'
Usage: server_deploy.sh [options]

Options:
  --image-repo <repo>      Override IMAGE_REPO from env file.
  --image-tag <tag>        Override IMAGE_TAG from env file.
  --env-file <path>        Path to .env file (default: deploy/.env).
  --compose-file <path>    Path to docker-compose.yml (default: deploy/docker-compose.yml).
  --healthcheck-url <url>  Override HEALTHCHECK_URL.
  --healthcheck-timeout <s>Override HEALTHCHECK_TIMEOUT (seconds).
  --skip-migrate           Skip running the migration command.
  --migration-command <c>  Override MIGRATION_COMMAND (quotes required if spaces).
  --service-name <name>    Service name to deploy (default: api).
  -h, --help               Show this help message.
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
            # Skip leading blank lines
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
  local new_tag="$2"
  local old_tag="$3"
  local status="$4"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf '%s,%s,%s,%s,%s\n' "$timestamp" "$action" "$status" "$new_tag" "${old_tag:-}" >>"$RELEASE_LOG"
}

get_current_image() {
  local container_id
  container_id="$("${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$SERVICE_NAME" 2>/dev/null | head -n1 || true)"
  if [[ -n "$container_id" ]]; then
    docker inspect --format '{{ .Config.Image }}' "$container_id" 2>/dev/null || true
  fi
}

extract_tag() {
  local image="$1"
  if [[ "$image" == *"@"* ]]; then
    echo "${image##*@}"
  elif [[ "$image" == *":"* ]]; then
    echo "${image##*:}"
  else
    echo ""
  fi
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

IMAGE_REPO_OVERRIDE=""
IMAGE_TAG_OVERRIDE=""
ENV_FILE="$DEFAULT_ENV_FILE"
COMPOSE_FILE="$DEFAULT_COMPOSE_FILE"
HEALTHCHECK_URL_OVERRIDE=""
HEALTHCHECK_TIMEOUT_OVERRIDE=""
SKIP_MIGRATE=0
MIGRATION_COMMAND_OVERRIDE=""
SERVICE_NAME="api"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image-repo)
      IMAGE_REPO_OVERRIDE="$2"
      shift 2
      ;;
    --image-tag)
      IMAGE_TAG_OVERRIDE="$2"
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
    --healthcheck-url)
      HEALTHCHECK_URL_OVERRIDE="$2"
      shift 2
      ;;
    --healthcheck-timeout)
      HEALTHCHECK_TIMEOUT_OVERRIDE="$2"
      shift 2
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    --migration-command)
      MIGRATION_COMMAND_OVERRIDE="$2"
      shift 2
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift 2
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

require_file "$COMPOSE_FILE"
require_file "$ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PREVIOUS_IMAGE_TAG="${IMAGE_TAG:-}"
IMAGE_REPO="${IMAGE_REPO_OVERRIDE:-${IMAGE_REPO:-}}"
IMAGE_TAG="${IMAGE_TAG_OVERRIDE:-${IMAGE_TAG:-}}"
COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
HEALTHCHECK_URL="${HEALTHCHECK_URL_OVERRIDE:-${HEALTHCHECK_URL:-http://127.0.0.1:8000/readyz}}"
MIGRATION_COMMAND="${MIGRATION_COMMAND_OVERRIDE:-${MIGRATION_COMMAND:-flask db upgrade}}"
HEALTHCHECK_TIMEOUT="${HEALTHCHECK_TIMEOUT_OVERRIDE:-${HEALTHCHECK_TIMEOUT:-90}}"

[[ -n "$IMAGE_REPO" ]] || fatal "IMAGE_REPO must be set"
[[ -n "$IMAGE_TAG" ]] || fatal "IMAGE_TAG must be set"

log "Starting deployment for ${IMAGE_REPO}:${IMAGE_TAG}"

if [[ -n "${GHCR_USERNAME:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  log "Logging in to ghcr.io as $GHCR_USERNAME"
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null
fi

CURRENT_IMAGE="$(get_current_image)"
log "Current running image: ${CURRENT_IMAGE:-<none>}"

docker_compose() {
  env IMAGE_REPO="$IMAGE_REPO" IMAGE_TAG="$IMAGE_TAG" COMPOSE_PROFILES="$COMPOSE_PROFILES" "${COMPOSE_CMD[@]}" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

log "Pulling image ${IMAGE_REPO}:${IMAGE_TAG}"
docker_compose pull "$SERVICE_NAME"

log "Recreating service $SERVICE_NAME"
docker_compose up -d --remove-orphans "$SERVICE_NAME"

ROLLBACK_TAG="$PREVIOUS_IMAGE_TAG"
if [[ -z "$ROLLBACK_TAG" && -n "$CURRENT_IMAGE" ]]; then
  ROLLBACK_TAG="$(extract_tag "$CURRENT_IMAGE")"
fi

if [[ $SKIP_MIGRATE -eq 0 ]]; then
  log "Running migration command: $MIGRATION_COMMAND"
  if ! docker_compose exec -T "$SERVICE_NAME" sh -c "$MIGRATION_COMMAND"; then
    log "Migration command failed, attempting rollback"
    append_release_log "deploy" "${IMAGE_TAG}" "${CURRENT_IMAGE:-}" "migration_failed"
    if [[ -n "$ROLLBACK_TAG" ]]; then
      "${SCRIPT_DIR}/server_rollback.sh" \
        --env-file "$ENV_FILE" \
        --compose-file "$COMPOSE_FILE" \
        --service-name "$SERVICE_NAME" \
        --image-repo "$IMAGE_REPO" \
        --to-tag "$ROLLBACK_TAG" \
        --healthcheck-url "$HEALTHCHECK_URL" \
        --healthcheck-timeout "$HEALTHCHECK_TIMEOUT" \
        --skip-migrate
    else
      log "Rollback skipped: previous tag could not be determined"
    fi
    exit 1
  fi
else
  log "Skipping migration step as requested"
fi

if ! perform_health_check "$HEALTHCHECK_URL" "$HEALTHCHECK_TIMEOUT"; then
  log "Health check failed, initiating rollback"
  append_release_log "deploy" "${IMAGE_TAG}" "${CURRENT_IMAGE:-}" "healthcheck_failed"
  if [[ -n "$ROLLBACK_TAG" ]]; then
    "${SCRIPT_DIR}/server_rollback.sh" \
      --env-file "$ENV_FILE" \
      --compose-file "$COMPOSE_FILE" \
      --service-name "$SERVICE_NAME" \
      --image-repo "$IMAGE_REPO" \
      --to-tag "$ROLLBACK_TAG" \
      --healthcheck-url "$HEALTHCHECK_URL" \
      --healthcheck-timeout "$HEALTHCHECK_TIMEOUT" \
      --skip-migrate
  else
    log "Rollback skipped: previous tag could not be determined"
  fi
  exit 1
fi

update_env_var "$ENV_FILE" "IMAGE_TAG" "$IMAGE_TAG"
append_release_log "deploy" "$IMAGE_TAG" "${CURRENT_IMAGE:-}" "success"

log "Deployment completed successfully"
