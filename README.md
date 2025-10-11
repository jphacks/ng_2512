# Recall プロトタイプ（ローカル開発ガイド）

このリポジトリは以下のコンポーネントで構成されたプロトタイプです。
- Firebase（Firestore/Functions/Auth/Emulator）
- Flask バックエンド（AI サービスのモック、DB、vLLM ガーディアン連携）
- React Native（Expo）クライアント

以下では、Flask/Firebase/React Native を含むローカル実行環境を構築する手順と、Docker Compose を活用したスタックの立ち上げ方をまとめます。

## 0. クイックスタート
1. `cp .env.example .env` を実行し、Postgres・Redis・S3 などの値を設定します。
2. 依存を導入します。
   - ルート: `npm install`
   - Python: `python3 -m venv .venv && . .venv/bin/activate && pip install -r backend/requirements.txt`
   - Firebase Functions: `cd functions && npm install`
   - React Native: `cd mobile && npm install`
3. Firebase エミュレータ: `npm run fb:emulators:all`
4. Flask API: `npm run api:dev`
5. React Native (Expo): `cd mobile && npx expo start`
6. 必要に応じて Docker Compose で統合起動します（[第4章](#4-docker-compose-を使った統合起動) を参照）。

## 1. 前提ツール
- Node.js 20 系、npm（既存スクリプトは Node 18+ で動作）
- Python 3.10 以上（venv 推奨）
- Firebase CLI (`npm install -g firebase-tools` もしくは `npx firebase-tools`)
- Docker および Docker Compose v2（統合スタックや Expo Web 起動に活用）
- iOS/Android シミュレータまたは Expo Go（React Native の確認用）

## 2. 環境変数 `.env`
- ルートの `.env.example` を `.env` にコピーして編集します。
- 主なカテゴリ:
  - Postgres/Redis: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `REDIS_URL`
  - モック vLLM: `VLLM_ENDPOINT`, `VLLM_GUARDIAN_PORT`
  - S3/署名 URL（Firebase Functions 用）: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
  - Firebase Emulator: `FB_TEST_PROJECT`
  - Expo 公開変数（Firebase Web 設定、API ベース URL、Google Sign-In）: `EXPO_PUBLIC_*`
- Docker Compose は `.env` を自動で読み込みます。Expo Web からエミュレータへ接続する場合は `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=1` や `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` を設定してください。

## 3. 依存のセットアップ
```
# ルート（Firebase CLI スクリプトや共通ツール）
npm install

# Python バックエンド
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt

# Firebase Functions
cd functions
npm install
cd ..

# React Native / Expo
cd mobile
npm install
cd ..
```
- 既存の `pip` 仮想環境を再利用する場合は、`pip install -r backend/requirements.txt` のみで構いません。
- Firebase Functions のスクリプト (`functions/scripts/*.js`) を CLI から実行するため、`functions` ディレクトリにも依存を導入しておきます。

## 4. Docker Compose を使った統合起動
Docker Compose を用いることで、Flask バックエンドの統合依存や Expo Web + Firebase エミュレータをワンコマンドで立ち上げられます。

### 4.1 Backend Integration Stack (`docker-compose.ci.yml`)
- サービス: Postgres (`db`)、Redis (`redis`)、モック vLLM (`vllm`)、vLLM Guardian (`vllm_guardian`)、Flask API (`api` テストステージ)
- 起動例（依存込みで立ち上げ、API コンテナ内でテストを実行）:
```
docker compose -f docker-compose.ci.yml up --build
```
  - `api` コンテナはバックエンド Dockerfile の `test` ターゲットでビルドされ、pytest を実行します。
  - 終了後に後処理する場合は `--abort-on-container-exit` や `--exit-code-from api` を追加すると CI テイストで利用できます。
- ローカル開発で DB/Redis/vLLM だけを残し、自分のローカル Python から接続する場合:
```
docker compose -f docker-compose.ci.yml up --build -d db redis vllm vllm_guardian
```
  - その後、`.env` の `DATABASE_URL` などを使って `npm run api:dev` を実行すると、Compose 内のサービスと接続できます。
- API コンテナで任意コマンドを実行する場合:
```
docker compose -f docker-compose.ci.yml run --rm api pytest -q
```
- 終了とリセット:
```
docker compose -f docker-compose.ci.yml down -v
```

### 4.2 Integration Test Profile (`docker-compose.test.yml`)
- `docker-compose.test.yml` と `docker-compose.test.override.yml` は QA.2 統合テスト用にチューニングされています（成果物は `development_flow/logs/qa2` へ出力）。
- 実行例:
```
docker compose -f docker-compose.test.yml --profile test up --build --abort-on-container-exit
```
- 収集された JUnit/XML ログは `development_flow/logs/qa2` を参照してください。テスト後は `docker compose -f docker-compose.test.yml down -v` でクリーンアップします。

### 4.3 Expo Web + Firebase Emulators (`docker-compose.mobile.yml`)
- サービス: `fb-emulators`（Auth/Firestore/Functions/UI）と `mobile-web`（Expo Web dev server）。
- 起動方法:
```
docker compose -f docker-compose.mobile.yml up --build
```
  - ブラウザで `http://localhost:19006` にアクセスすると Expo Web が表示されます。
  - ホストの `.env` を読み込むため、Firebase Web 設定や `EXPO_PUBLIC_API_BASE_URL` は `.env` 側で調整します。
  - ログやホットリロードはローカルファイルへ即時反映されます。停止は `Ctrl+C`、クリーンアップは `docker compose -f docker-compose.mobile.yml down -v`。

## 5. Firebase エミュレータと Functions
- Firebase CLI スクリプトは `package.json` にまとまっています。
  - 全エミュレータ起動（Auth/Firestore/Functions/UI）: `npm run fb:emulators:all`
  - Firestore ルール検証: `npm run fb:verify`
  - E2E（署名 URL フロー等）: `npm run fb:e2e:fb34`, `npm run fb:e2e:fb50`
  - Functions/Rules デプロイ: `npm run fb:deploy:rules`, `npm run fb:deploy:functions`, `npm run fb:deploy:all`
- Functions から S3 署名 URL を発行する際は `.env` の S3 系設定が必要です。Emulator でのテスト時にはダミー値でも動作します。
- 各種スキーマや ACL の詳細は `docs/firestore/*.md` と `functions/README.md` を参照してください。
- エミュレータ UI は `http://localhost:4000` で確認できます（Docker Compose ではポートフォワード済み）。

## 6. Flask バックエンド
- ローカル起動（venv を有効化したターミナルで）:
```
npm run api:dev
```
  - `backend/app.py` がポート `8000` で起動します。`/readyz` と `/version` がヘルスチェック用に用意されています。
- テスト/スモーク:
```
npm run api:test       # pytest -q backend/tests
npm run api:smoke      # scripts/smoke/smoke_test.sh で /readyz を検証
```
- Docker 単体:
```
docker build -f backend/Dockerfile --target test -t recall-backend:test .
docker run --rm recall-backend:test

docker build -f backend/Dockerfile --target prod -t recall-backend:prod .
docker run --rm -p 8000:8000 recall-backend:prod
```
- Docker Compose の DB/Redis/vLLM と組み合わせる場合は、第4章の手順で依存コンテナを起動してから `npm run api:dev` もしくは `docker compose ... run api` を実行してください。
- 詳細なアーキテクチャや Dockerfile については `backend/README.md` と `docs/backend/*.md` を参照できます。

## 7. React Native (Expo) クライアント
- 主要ソース: `mobile/src/hooks/useAuth.tsx`, `mobile/src/services/firebase.ts`, `mobile/src/services/apiClient.ts`。
- Expo 公開環境変数 (`EXPO_PUBLIC_*`) を `.env` で設定し、`EXPO_PUBLIC_API_BASE_URL` を Flask API（例: `http://127.0.0.1:8000`）に合わせます。
- ローカル起動例:
```
cd mobile
npx expo start
# 必要に応じて:
npx expo run:ios
npx expo run:android
```
- Expo Web を Docker で起動する場合は [4.3](#43-expo-web--firebase-emulators-docker-compose-mobileyml) を参照してください。
- Google Sign-In をネイティブで行う際は、`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` の設定と各プラットフォーム固有の設定（`GoogleService-Info.plist`, `google-services.json` 等）が必要です。
- 構成の詳細は `mobile/README.md` と `docs/mobile/*.md` を参照してください。

## 8. デプロイ（参考）
- 本番配備のフローは `docs/dev/deploy_server.md` と `deploy/` 配下を参照してください。
- `scripts/deploy/server_deploy.sh` により、GHCR のイメージ取得・Compose 再作成・ヘルスチェック・ロールバックが自動化されています。

## 9. タスクフロー（依存管理）
- 開発タスクの依存は `development_flow/adm.dot` で可視化しており、状態は `development_flow/status.json` に記録します。
- 補助スクリプト:
  - `python tools/taskflow.py status`
  - `python tools/taskflow.py mark <ID> <pending|in_progress|done>`
  - `dot -Tpng development_flow/adm.dot -o development_flow/adm.png`

## 10. トラブルシューティング
- Firebase エミュレータが起動しない/404: `GCLOUD_PROJECT` や `.firebaserc` のプロジェクト ID（既定は `recall-dev`）を確認。
- 署名 URL で `FAILED_PRECONDITION`: `.env` の S3 系値が未設定／バケットの権限不足。
- Python 依存が不足: `pip install -r backend/requirements.txt`
- Expo から API に接続できない: `EXPO_PUBLIC_API_BASE_URL` と `HOST=0.0.0.0` の設定を見直し、ポートフォワード（8081/19006）が開いているか確認。
- Docker Compose の起動が遅い: `docker system prune` でキャッシュを整理、もしくは `docker compose ... --build --pull` を追加。
- E2E スクリプトのログは `development_flow/logs` 配下に保存されます。問題発生時は該当ログを参照してください。

このガイドで不足している詳細は、`backend/README.md`、`mobile/README.md`、`functions/README.md`、`docs/` 配下の各種設計書を参照してください。
