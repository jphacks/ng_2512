# Production Migration and Cutover Runbook (CI.5)

Last updated: 2025-09-04 (Asia/Tokyo)

Overview
- Goal: Safely migrate to production with minimal downtime and immediate rollback.
- Scope: Infra templates, secrets handling, data migration plan, cutover/rollback, smoke tests, monitoring.

Prerequisites
- CI.4 completed (server deploy via Docker Compose).
- Staging QA2/QA3 passed; security baseline in place (logging/rate-limit/signatures as applicable).

Artifacts
- Production env templates: `deploy/.env.production.example`, `deploy/.env.deploy.example`.
- Compose: `deploy/docker-compose.yml` (parametric port via `API_HTTP_PORT`).
- Deploy scripts: `scripts/deploy/server_deploy.sh`, `scripts/deploy/server_rollback.sh`.
- Smoke test helper: `scripts/smoke/smoke_test.sh`.

1) Secrets Management
- GitHub Secrets (CI/CD):
  - `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_PATH` for SSH-based deploy.
  - Optional for private GHCR: `GHCR_USERNAME`, `GHCR_TOKEN` (prefer GH Actions `GITHUB_TOKEN` for push).
- Server-side `.env` (never commit real values):
  - Based on `deploy/.env.production.example`.
  - Set `IMAGE_REPO` to `ghcr.io/<owner>/<repo>/api`, `IMAGE_TAG` to `sha-<commit>` when deploying.
  - Infra vars as needed: `DATABASE_URL`, `REDIS_URL`, `VLLM_ENDPOINT`.
  - Optional: enable Compose profiles via `COMPOSE_PROFILES=db,cache,ai`.
- Vault/1Password:
  - Store long-lived credentials (DB, Redis, SSH key material) and reference them when provisioning the server.

2) Data Migration Plan
- If using Flask-Migrate, run migrations during deploy:
  - The deploy script executes `flask db upgrade` inside the `api` container (best-effort).
  - Validate migration on staging; for large migrations, schedule off-peak and consider `--preload`/backfills.
- Backups:
  - Take a DB snapshot before cutover; retain N last snapshots (rotation policy).

3) Cutover Strategies
- Minimal downtime (default):
  - `scripts/deploy/server_deploy.sh --image-tag sha-<new>` recreates `api` with minimal stop time.
  - Health gate: waits for `/readyz` 200 before success; auto-rollback on failure.
- Blue/Green (zero-downtime friendly):
  - Run two Compose projects with different ports.
    - Blue: `COMPOSE_PROJECT_NAME=recall_blue`, `API_HTTP_PORT=8000`.
    - Green: `COMPOSE_PROJECT_NAME=recall_green`, `API_HTTP_PORT=8001`.
  - Procedure:
    1. Prepare `.env` per color with desired `IMAGE_TAG` and `API_HTTP_PORT`.
    2. Deploy Green: `docker compose -f deploy/docker-compose.yml --project-name recall_green up -d`.
    3. Smoke test Green on `http://127.0.0.1:8001/readyz`.
    4. Switch traffic at the reverse proxy (NGINX/Traefik) from Blue to Green.
    5. After confirming metrics, optionally stop Blue.
  - Note: When not using a proxy, a port-swap variant is possible by editing `API_HTTP_PORT` and recreating, but it incurs brief port rebind.

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
  - `scripts/smoke/smoke_test.sh http://127.0.0.1:8000` (exit 0 on success).

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

