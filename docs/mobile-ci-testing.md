# モバイル Web E2E（GitHub Actions）

Expo（React Native）アプリを Web で起動し、Playwright で E2E テストを実行します。

概要:
- Web サーバ: `http://localhost:19006`（Expo）
- バックエンド: `docker-compose.ci.yml` をベースに `deploy/docker-compose.mobile-e2e.yml` で `8000` をホスト公開
- テスト内容: UI スモーク、Firebase 初期化、バックエンド疎通

仕組み:
- ワークフロー: `.github/workflows/mobile-web-e2e.yml`
- Web サーバ起動: `mobile/playwright.config.ts` の `webServer` が `npx expo start --web` を起動
- テスト配置: `mobile/tests/e2e/`

CI Secrets:
- GitHub Secrets に `.env` の内容を格納した `MOBILE_E2E_DOTENV` を作成すると、ワークフローがそれを `.env` として使用します。
- 最小構成の例（必要に応じて編集）:
  ```
  POSTGRES_USER=postgres
  POSTGRES_PASSWORD=postgres
  POSTGRES_DB=recall
  DATABASE_URL=postgresql://postgres:postgres@db:5432/recall
  REDIS_URL=redis://redis:6379/0
  VLLM_ENDPOINT=http://vllm:8008
  AI_API_KEY=dev-key
  AI_API_SECRET=dev-secret
  AI_RATE_LIMIT_PER_MIN=30
  AI_REQUEST_TOLERANCE_SEC=300
  ```

環境変数:
- `EXPO_PUBLIC_API_BASE_URL`: バックエンド API ベース URL（CI では `http://127.0.0.1:8000` を設定）
- `EXPO_PUBLIC_FIREBASE_*`: Web 用 Firebase 設定。CI では未設定でも初期化を緩和（必要に応じて Secrets で供給可能）

ローカル実行:
1. `cd mobile && nvm use 20 && npm install`
2. バックエンドを起動: `docker compose -f docker-compose.ci.yml -f deploy/docker-compose.mobile-e2e.yml up -d --build`
3. ブラウザ依存のインストール: `npx playwright install --with-deps`
4. テスト実行: `npm run test:web`

アーティファクト:
- Playwright の HTML レポート（`mobile/playwright-report`）をワークフローでアップロード

補足（トラブルシュート）:
- Node バージョンは 20 系を推奨（Firebase SDK の要件に対応）。CI でも Node 20 を使用しています。
- Compose の `.env` が無い場合は、`cp .env.sample .env`（または `.env.example`）で作成してください。CI では自動で作成しています。
