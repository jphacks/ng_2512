# Production Migration and Cutover Runbook (CI.5)

Last updated: 2025-09-04 (Asia/Tokyo)

Overview
- Goal: Safely migrate to production with minimal downtime and immediate rollback.
- Scope: Infra templates, secrets handling, data migration plan, cutover/rollback, smoke tests, monitoring.

Prerequisites
- CI.4 completed (server deploy via Docker Compose).
- Staging QA2/QA3 passed; security baseline in place (logging/rate-limit/signatures as applicable).

Artifacts
- Production env templates:
  - `deploy/.env.deploy.example` — copy to `deploy/.env` on the server (consumed by Docker Compose and deploy scripts).
  - `deploy/.env.production.example` — sanitized reference for credential vaults / 1Password.
- Compose: `deploy/docker-compose.yml` (parametric port via `HOST_PORT`).
- Deploy scripts: `scripts/deploy/server_deploy.sh`, `scripts/deploy/server_rollback.sh`.
- Smoke test helper: `scripts/smoke/smoke_test.sh`.
- Release ledger: `deploy/releases.log` (auto-appended by deploy/rollback scripts).

1) Secrets Management
- GitHub Secrets (CI/CD). Populate before wiring deploy jobs:

  | Secret key          | Purpose                                                    |
  |---------------------|------------------------------------------------------------|
  | `DEPLOY_HOST`       | SSH target (`user@host` optional; host only recommended)  |
  | `DEPLOY_USER`       | SSH username                                               |
  | `DEPLOY_KEY`        | Private key for SSH (OpenSSH format)                       |
  | `DEPLOY_PATH`       | Absolute path to the repository on the server              |
  | `GHCR_TOKEN` (opt.) | Required only when GHCR image is private and PAT needed    |
  | `GHCR_USERNAME`     | Username paired with `GHCR_TOKEN`                          |

- Server-side `.env` (never commit real values):
  1. `scp deploy/.env.deploy.example` to the server and rename to `deploy/.env`.
  2. Replace placeholders:
     - `IMAGE_REPO=ghcr.io/<owner>/<repo>/api`
     - `IMAGE_TAG=sha-<commit>` (immutable tag for fast rollback)
     - `SECRET_KEY`, `DATABASE_URL`, etc.
     - Enable optional profiles (e.g. `COMPOSE_PROFILES=postgres,redis,vllm`) as needed.
  3. Store the same values in a secrets vault using `deploy/.env.production.example` as documentation.
- Vault/1Password:
  - Group credentials per environment (Prod/Staging) and store DB, Redis, SSH and API tokens.
  - Record the location (`vault://recall/prod`) inside the `deploy/.env` for traceability.

2) Data Migration Plan
- If using Flask-Migrate, run migrations during deploy:
  - The deploy script executes `flask db upgrade` inside the `api` container (best-effort).
  - Validate migration on staging; for large migrations, schedule off-peak and consider `--preload`/backfills.
- Backups:
  - Take a DB snapshot before cutover; retain N last snapshots (rotation policy).

3) Cutover Strategies
- Minimal downtime (default):
  - `scripts/deploy/server_deploy.sh --image-tag sha-<new>` recreates `api` with minimal stop time.
  - Health gate: waits for `/readyz` to return HTTP 200 before success; auto-rollback on failure.
  - Update `deploy/.env` only after the health check passes (script handles this automatically).
- Blue/Green (zero-downtime friendly):
  - Run two Compose projects with different ports.
    - Blue: `COMPOSE_PROJECT_NAME=recall_blue`, `HOST_PORT=8000`.
    - Green: `COMPOSE_PROJECT_NAME=recall_green`, `HOST_PORT=8001`.
  - Procedure:
    1. Copy `deploy/.env.deploy.example` twice (`.env.blue`, `.env.green`) and set `IMAGE_TAG` per color.
    2. Deploy Green: `COMPOSE_PROJECT_NAME=recall_green HOST_PORT=8001 docker compose -f deploy/docker-compose.yml --env-file deploy/.env.green up -d`.
    3. Smoke test Green on `http://127.0.0.1:8001` with `scripts/smoke/smoke_test.sh`.
    4. Switch traffic at the reverse proxy (NGINX/Traefik) from Blue to Green.
    5. After confirming metrics, optionally stop Blue (`docker compose --project-name recall_blue down` when safe).
  - Note: Without reverse proxy, a port-swap variant is possible by editing `HOST_PORT` and recreating, at the cost of a short port rebind window.

4) Rollback
- Automatic: `server_deploy.sh` reverts to previous `IMAGE_TAG` on failed health.
- Manual: `scripts/deploy/server_rollback.sh --to-tag sha-<previous>` then verify `/readyz`.
- For Blue/Green: flip proxy back to Blue immediately.

5) Smoke Tests
- Checklist (post-start):
  - `/readyz` returns 200 with `{ "ready": true }`.
  - `/version` returns expected version and service name.
  - Container health status turns healthy.
  - No error spikes in logs (`docker compose logs -f api`).
- Scripted example:
  1. `./scripts/smoke/smoke_test.sh http://127.0.0.1:8000`
  2. To assert build metadata: `./scripts/smoke/smoke_test.sh http://127.0.0.1:8000 --expect-version sha-abcdef`
- Sample output (success):
  ```
  [2025-09-30T12:34:10Z] === Smoke test: http://127.0.0.1:8000 ===
  [2025-09-30T12:34:10Z] Ready endpoint returned success
  [2025-09-30T12:34:11Z] Checking http://127.0.0.1:8000/healthz
  [2025-09-30T12:34:11Z] Checking http://127.0.0.1:8000/version
  [2025-09-30T12:34:11Z] Smoke test completed successfully
  ```
- Append the output (success/failure) to `deploy/releases.log` alongside deploy events.

6) Monitoring Checklist
- Logs: error rate stable; no repeated restarts.
- Resources: CPU/RAM within SLO; no memory leak.
- Dependencies: DB/Redis reachable; external AI endpoint responsive.
- Alerts: health endpoint and 5xx rate watch configured.

7) Run of Show (Cutover Day)
- T-15m: Announce maintenance window (if any); confirm backups; freeze writes if required.
- T-10m: Deploy new image to idle color (Green); run smoke tests.
- T-0: Switch proxy to Green; monitor for 10–15 minutes.
- T+15m: If stable, disable Blue; publish completion notice; unfreeze writes.
- Postmortem: Record learnings; update this runbook if gaps discovered.

References
- `development_flow/CI_CICD.md` CI.5 section.
- Deploy docs: `docs/dev/deploy_server.md`.
