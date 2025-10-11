# CI/CD ガイド（Docker ベース）

最終更新: 2025-09-02 (Asia/Tokyo)

本書はバックエンド（Flask AI サービス）とモバイル（React Native/Firebase）の CI/CD 方針を示します。原則、CI は Docker 上で実行し、バックエンドはコンテナイメージをビルド・配布します。

---

## 1. 共通ポリシー

- ブランチ戦略: `main`（安定）/ `dev`（開発） / 短命トピックブランチ
- コミット: Conventional Commits（`feat:`, `fix:`, `docs:` ...）
- 必須チェック: Lint, Unit Test, Type Check（ts / mypy）
- Secrets: GitHub Encrypted Secrets（OIDC + Cloud 側ロール推奨）
- アーティファクト: API コンテナイメージ / モバイルビルド（IPA, AAB）

---

## 2. Backend（Flask AI サービス）

方針
- Dockerfile でテスト用ターゲットと本番ターゲットを分ける（マルチステージ）。
- テストはコンテナで実行。統合テストは `docker compose` で DB/Redis/vLLM を起動して行う。
- ビルド済みイメージを GHCR へ Push。デプロイは個人サーバの Docker Compose で Pull/Up。

Dockerfile（例）: `backend/Dockerfile`
```
FROM python:3.11-slim AS base
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .

FROM base AS test
CMD ["pytest", "-q"]

FROM base AS prod
CMD ["gunicorn", "app:create_app()", "-b", "0.0.0.0:8000", "-w", "4", "--timeout", "60"]
```

docker-compose.test.yml（例）
```
version: "3.9"
services:
  db:
    image: postgres:15
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
  redis:
    image: redis:7
  vllm:
    image: vllm/vllm-openai:latest
    command: ["--model", "chatgpt-oss-20b", "--port", "8008"]
  api:
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: test
    env_file:
      - .env
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      VLLM_ENDPOINT: ${VLLM_ENDPOINT}
    depends_on: [db, redis, vllm]
```

GitHub Actions（例）: `.github/workflows/backend.yml`
```yaml
name: backend
on:
  push:
    paths: ["backend/**", "infra/**", ".github/workflows/backend.yml"]
  pull_request:
    paths: ["backend/**"]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build test image
        run: docker build -f backend/Dockerfile --target test -t ghcr.io/${{ github.repository }}/api:test .
      - name: Run unit tests (container)
        run: docker run --rm ghcr.io/${{ github.repository }}/api:test
      - name: Integration tests (docker compose)
        run: docker compose -f docker-compose.test.yml --profile test up --abort-on-container-exit --exit-code-from api

  build_and_push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./
          file: backend/Dockerfile
          target: prod
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/api:sha-${{ github.sha }}
            ghcr.io/${{ github.repository }}/api:latest
```

デプロイ（個人サーバ / Docker Compose）
- サーバ側 `docker-compose.yml` に `api`, `postgres`, `redis`, `vllm` を定義
- CI から SSH で `docker compose pull && docker compose up -d`
- マイグレーション: `docker compose run --rm api flask db upgrade`

詳しい手順とスクリプト: `docs/dev/deploy_server.md`

---

## 3. Mobile（React Native）

Docker で lint/test を実行（Node 公式イメージ）。本配布は EAS/Fastlane を用いて別ジョブで実行。

GitHub Actions 例（fastlane）: `.github/workflows/mobile.yml`
```yaml
name: mobile
on:
  push:
    paths: ["frontend/**"]
  pull_request:
    paths: ["frontend/**"]
jobs:
  lint_test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint/Test in Docker (Node 18)
        run: docker run --rm -v $PWD/frontend:/app -w /app node:18 bash -lc "npm ci && npm run lint && npm test -- --ci"

  build_ios:
    needs: lint_test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: cd frontend && npm ci && npx pod-install
      - run: cd ios && bundle install && bundle exec fastlane ios build
        env:
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}

  build_android:
    needs: lint_test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: cd frontend && npm ci
      - run: cd android && bundle install && bundle exec fastlane android build
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
```

配布
- iOS: TestFlight（macOS ランナー）
- Android: Internal App Sharing or Play Internal testing

---

## 4. リリースとバージョニング

- バージョン: モバイルは `app.json`/`Info.plist`/`build.gradle` を同期
- API: コンテナタグは `sha` + `semver` 併用（例: `v0.3.0`）
- 変更履歴: `CHANGELOG.md` 自動生成（`changesets` or `release-please`）

---

## 5. セキュリティ/コンプライアンス

- 依存性スキャン: Dependabot + `pip-audit` + `npm audit --omit=dev`
- シークレットはログ出力禁止、`id_token` 等のトークンはマスク
- 署名証明書・プロビジョニングは GitHub Secrets / Match（fastlane）で管理

---

## 6. セルフホスト配備（個人サーバ / Docker Compose）

- 配備は Docker Compose を第一選択（`docker compose pull && docker compose up -d`）
- マイグレーション: `docker compose run --rm api flask db upgrade`
- 機微情報: `.env` はサーバ側で管理（CI から渡さない）
- ヘルス: デプロイ後に `/readyz` を確認し、失敗時はロールバック

Note（CI.2実装について）
- 本リポジトリの `docker-compose.test.yml` は軽量なモック vLLM（`tools/mock_vllm`）を起動します。
- 実モデル（例: chatgpt-oss-20b）をCIで起動する代わりに、OpenAI互換の最小インターフェースで統合テストを成立させています。

---

## 7. 本番移植（Production Migration）

- Infra: 本番用 compose/環境変数テンプレートと Secrets 管理方針（権限最小）
- Data: マイグレーション/初期データ投入の手順化とリハーサル（ステージングで再現）
- Cutover: Blue-Green または停止時間最小の切替、即時ロールバック手順（Runbook）
- Smoke/Monitoring: 起動後のスモークテストと監視チェックリスト、SLO 監視
### .env 運用

- リポジトリには `.env.example` を含め、実値は `.env` として配置（Git追跡外）。
- 例（抜粋）:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - `DATABASE_URL`, `REDIS_URL`, `VLLM_ENDPOINT`
- Compose はプロジェクト直下の `.env` を自動読み込み。サービスの `env_file: .env` と `environment: ${VAR}` でコンテナに値を渡す。
