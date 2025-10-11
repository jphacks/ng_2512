# CI/CD（Dockerベース）

最終更新: 2025-09-02

## GitHub Actions とタスク完了フラグの運用
- 各テストジョブは対応タスクが `development_flow/status.json` で `done` になっている場合のみ実行する。未完了フラグのジョブは `needs` チェックでスキップするか、早期 return（`continue-on-error: true` など）を設定する。
- `python tools/taskflow.py status --json` を用いてタスク状態を取得し、`jq -e '.QA1=="done"'` のように条件判定する。失敗時は `exit 78` 等でジョブをスキップ扱いとする。
- 代表的な対応表
  - `QA.1` → Unit テスト（CI.3 unit job）
  - `QA.2` → Integration テスト（CI.2 compose job）
  - `QA.3` → Detox E2E（モバイル端末テスト）
  - `QA.4` → Performance/SLO ベンチ
  - `QA.5` → React Native lint/typecheck/Jest ハーネス（CI.7 依存）
  - `QA.6` → Full-stack リリース検証（本番前ゲート）
  - `CI.7` → Expo + Firebase エミュレータ compose を利用するジョブ（RN 関連テスト前提）
- フラグはタスク完了時に `development_flow/status.json` を更新し、`python tools/taskflow.py status` で ADM と同期させる。

## CI.1 Backend Dockerfile（test/prod）
- マルチステージ。testターゲットでpytest、prodターゲットでgunicorn起動。

## CI.2 docker-compose.test（DB/Redis/vLLM/API）
- Postgres/Redis/vLLM/API を起動し、統合テストを実行。

## CI.3 GH Actions
- コンテナ内Unit→compose統合→GHCR push。タグ: sha-*, latest。
- ワークフロー定義: `.github/workflows/ci.yml`

## CI.4 個人サーバ配備
- SSHで `docker compose pull && up -d`、`flask db upgrade` 実行。

## CI.5 本番移植/カットオーバー（Infra/Secrets/Data）
- 本番 compose/環境テンプレ、Secrets 管理、データ移行計画、Runbook 整備。
- Blue-Green または最小ダウンタイム切替、即時ロールバック、スモークテスト。

## CI.6 Mobile Web E2E（React Native / Expo）
- 目的: RN（Expo Web）の統合E2E（UIスモーク、Firebase初期化、API疎通）をCIで自動検証する。
- 実装:
  - ワークフロー: `.github/workflows/mobile-web-e2e.yml`
  - Webサーバ: Playwright `webServer`（`npx expo start --web`）
  - テスト: `mobile/tests/e2e/*`
  - バックエンド: `docker-compose.ci.yml` + `deploy/docker-compose.mobile-e2e.yml` で `8000` 公開
- 依存: CI.2（compose統合スタック）, CI.3（Actions運用）
- 成果物: Playwright HTML レポート（artifact: `mobile/playwright-report`）
 - Secrets: `.env` を GitHub Secrets `MOBILE_E2E_DOTENV` に保存しておくと、ワークフローが優先して使用します（無い場合は `.env.sample` / `.env.example` をコピー）。

## CI.7 docker-compose.mobile（Expo + Firebase エミュレータ）
- 目的: Expo クライアントと Firebase エミュレータを Docker Compose で起動し、RN 開発/テストの共通ベースを提供する。
- サービス: `mobile-web`（Node 20 + Expo）、`fb-emulators`（Auth/Firestore/Functions/UI）。
- 機能: `.env.example` の Expo 用変数、`npm ci` キャッシュ、Expo DevTools/Metro ログ、Push 通知/Functions 呼び出し検証。
- 依存: CI.2（ネットワーク/Secrets 方針）、FB.3.1/FB.3.5（Functions/通知）。
- 成果物: `docker-compose.mobile.yml`, README 手順, 起動ログ。
