# CI.6 Mobile Web E2E — React Native (Expo)

- 前提: CI.2（docker-compose.test）、CI.3（GitHub Actions 運用）
- 目的: RN（Expo Web）での E2E を CI に統合し、以下を自動検証する。
  - UI スモーク（主要タブの描画）
  - Firebase 初期化（web）
  - バックエンド API 疎通（/healthz）

## 実装
- ワークフロー: `.github/workflows/mobile-web-e2e.yml`
  - compose: `docker-compose.ci.yml` + `deploy/docker-compose.mobile-e2e.yml`（`8000`公開）
  - Playwright: `mobile/playwright.config.ts` の `webServer` で `expo start --web` を起動
  - レポート: `mobile/playwright-report` を artifact 化
  - Secrets: GitHub Secrets `MOBILE_E2E_DOTENV` に `.env` の中身を保存しておくと、ワークフローで `.env` として展開される（無い場合はサンプルから生成）。
- テスト配置: `mobile/tests/e2e/*`
  - `app-smoke.spec.ts`: タブ表示確認（Proposals/Groups/Journal/Friends）
  - `firebase.spec.ts`: `window.__APP_TEST_INFO` 経由で Firebase 初期化確認
  - `api-integration.spec.ts`: `EXPO_PUBLIC_API_BASE_URL` 経由で `/healthz` 疎通
- アプリ側フック: `mobile/index.web.js` に `window.__APP_TEST_INFO` 追加

## 環境変数
- `EXPO_PUBLIC_API_BASE_URL`: 既定 `http://127.0.0.1:8000`（workflow で明示）
- `EXPO_PUBLIC_FIREBASE_*`: CI では未設定でも初期化は緩和（必要に応じて Secrets で供給）

## 受け入れ基準
- ワークフローが push/PR で実行され、Playwright の 3 テストが成功
- レポートが artifact として保存される

## 参考
- docs/mobile-ci-testing.md
- development_flow/CI_CICD.md（CI.6 章）
