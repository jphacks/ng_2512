# Flask Server アーキテクチャ

最終更新: 2025-09-02 (Asia/Tokyo)

> Recall のバックエンドは Flask を中心に、PostgreSQL、RQ/Celery、S3、ローカルAI（CLIP/ArcFace/LLM）で構成します。本書は実装ガイドラインと運用観点をまとめたものです。API 詳細は `docs/backend/api-spec.md` を参照。

---

## 1. 全体像（コンポーネント）

- API（AI 専用）: Flask（Gunicorn 上で稼働）。AI 用の REST のみ（例: `/ai/themes/suggest`, `/ai/people/match`）。
- DB: PostgreSQL + pgvector（画像/顔の埋め込み、アセット参照）。アプリ業務データは持たない。
- Queue: Redis + RQ（または Celery/Redis/AMQP）
- Object Storage: S3 互換（署名URLで直接アップロード）
- AI ランタイム: サーバ内で CLIP/ArcFace と chatgpt-oss-20b（vLLM 推奨 / ONNX Runtime は画像系）を実行
- 通知: Firebase Cloud Messaging（FCM）/APNs 連携
- 観測: 構造化ログ、メトリクス（Prometheus）、エラートラッキング（Sentry）

---

## 2. 推奨ディレクトリ構成（AI マイクロサービス）

```
backend/
  app.py                     # アプリエントリ（create_app）
  config.py                  # 設定（環境変数）
  extensions.py              # db, cache, limiter, jwt, metrics 登録
  routes/                    # Blueprints（REST）
    ai.py
    health.py
  services/                  # ドメインサービス
    ai_service.py            # 近傍検索/LLM 生成
  repositories/              # DB アクセス（埋め込み/アセット関連）
    embedding_repo.py
    asset_repo.py
  models/                    # ORM モデル
    asset.py, image_embedding.py, face_embedding.py
  schemas/                   # I/O バリデーション（pydantic/marshmallow）
  workers/                   # 非同期ジョブ
    queue.py                 # RQ/Celery 初期化（任意）
    ai_jobs.py               # 埋め込み生成、再計算、LLM 生成
  migrations/                # Alembic
  utils/                     # 共通（idempotency, time, ulid, s3 等）
  tests/                     # unit/integration
```

---

## 3. リクエストライフサイクル

1. 認証: `Authorization: Bearer <access>` を検証（短寿命）。必要時に `POST /auth/refresh`。
2. スコープ検証: 資源アクセス制御（自分の提案・自分のグループなど）。
3. バリデーション: `schemas/*` で入力検証、型・制約チェック。
4. サービス実行: 1 リクエスト 1 トランザクションの原則で `services/*` を呼び出し。
5. 監査ログ: 重要操作（提案作成、確定、承認など）を `audit_logs` に記録。
6. レスポンス: JSON（camelCase/蛇腹はプロジェクト規約に合わせ統一）。

---

## 4. 層構造と責務（AI 専用）

- Routes: AI 用 REST エンドポイントの受け口（認証/入力検証/レスポンス整形）。
- Services: 近傍検索（pgvector）、生成（chatgpt-oss-20b）、再計算ジョブ。
- Repositories: 画像/顔埋め込み・アセット参照への最適化クエリ。
- Models: 埋め込み/アセットに限定した ORM。
- Schemas: 入出力のシリアライズ/デシリアライズ。

---

## 5. 認証・セキュリティ

- 認証: Firebase Functions/アプリ側で発行した署名付きトークン or API Key + HMAC などを検証（実装方針に応じ選択）。
- レート制限: `flask-limiter` で IP/ユーザ単位 429（`X-RateLimit-*`）
- レート制限: `flask-limiter` で IP/ユーザ単位 429（`X-RateLimit-*`）
- 監査: 重要操作の `audit_logs` 記録
- 入力検証: サイズ/拡張子/コンテントタイプ（画像アップロード時）
- CORS: モバイルのみ許可、Origin 制御（必要時）

---

## 6. DB・トランザクション

- SQLAlchemy セッションはリクエストスコープで管理（`scoped_session`）。
- 1 リクエスト 1 トランザクション（成功で commit、失敗で rollback）。
- 競合防止: 埋め込みの再計算・更新は冪等 UPSERT。インデックスメンテはメンテ窓口で実施。
- マイグレーション: Alembic（起動時 or ジョブで `flask db upgrade`）。

---

## 7. 非同期ジョブ（Queue）

- RQ（Redis）推奨。キュー種別: `default`, `ai`, `notifications`。
- リトライ: 指数バックオフ（最大 5 回）、冪等キー（ULID/Idempotency-Key）。
- 可観測性: 成功/失敗をメトリクス/ログへ。DLQ（失敗保管）運用。

主なジョブ
- 画像埋め込み生成（CLIP）/ 顔埋め込み生成（ArcFace）
- 近傍検索 + テーマ候補集計
- LLM による提案文生成

---

## 8. AI ランタイム（ローカル）

- モデル管理: バージョン名（例 `openclip_vitb32@2025-08`, `chatgpt-oss-20b@2025-08`）で切替。互換性崩壊時はバックフィル。
- 実行基盤: PyTorch/ONNX Runtime（CLIP/ArcFace）、vLLM（chatgpt-oss-20b, GPU 推奨）。llama.cpp は互換ビルドがある場合の代替。
- 安全性: 顔データはオプトイン、画像は非公開バケット、署名URL短寿命。
- インターフェース: `ai_service.py` で抽象化しテスト可能に（モック容易）。

ハードウェア要件（目安）
- chatgpt-oss-20b: FP16 GPU メモリ 40GB 級 or 量子化（8bit/4bit）で 20–24GB / 10–12GB 目安。vLLM の PagedAttention を活用。
- スループット: 生成はジョブ化し、同時実行数をレート制御。API ワーカーと分離スケール。

### VLM による予定・メンバー抽出

- 目的: 写真に写ったホワイトボード/ポスター/集合写真から予定（日時・場所・タイトル）とメンバー候補を推定し、提案・日程調整フローを自動補助する。
- モデル: 視覚言語モデル（例: Florence-2, Llava-NeXT）を `vlm` サービスとしてコンテナ化し、OpenAI 互換 API かカスタム gRPC で連携。必要に応じて OCR 補助（Tesseract/TrOCR）を併用。
- データ永続化: 抽出結果は `vlm_observations`（画像単位）と `vlm_detection_entities`（個別エンティティ）に保存。`observation_hash` で冪等制御し、再解析時は UPSERT。
- API: `POST /ai/schedule/from_image` が署名URLまたは `assetId` を受け、VLM 推論 → テキスト解析 → 顔照合 → 永続化 → レスポンス生成を行う。
- サービス層: `vlm_schedule_service` が以下を担う。
  1. 画像取得と前処理（リサイズ、EXIF 補正、顔検出）
  2. VLM 推論プロンプト生成（予定抽出・人物抽出の指示）、推論呼び出し
  3. 出力 JSON の正規化（日時パース、タイムゾーン補正、自由記述のノイズ除去）
  4. 顔切り出しを `face_embeddings` と照合しスコアを付与
  5. `vlm_observations` へ保存し、レスポンス DTO を構築
- レスポンス構造（例）:
```json
{
  "observationId": "obs_01H...",
  "scheduleCandidates": [
    {"title": "週末ボードゲーム会", "start": "2025-09-14T05:00:00Z", "end": "2025-09-14T09:00:00Z", "location": "渋谷カフェ", "confidence": 0.82}
  ],
  "memberCandidates": [
    {"userId": "u_123", "score": 0.91},
    {"faceEmbeddingId": "face_456", "score": 0.74}
  ],
  "notes": ["Bring board games", "RSVP by Sep 10"]
}
```
- 非同期連携: 大きな画像/複数枚は RQ の `ai` キューでバッチ処理し、結果を Firebase Functions に webhook で通知。同期 API は既存観測がある場合に即返却。
- 監査/セキュリティ: 推論ログに `model_version`, `initiator_user_id`, `asset_id`, `latency_ms` を記録。アクセス制御は API Key + HMAC / JWT でガードし、観測データの削除請求にも応える。
- モバイル連携: React Native 側の Scheduling Helper（RN.2.14）が本 API の結果を受け取り、編集 UI を表示。Firebase Functions は確定結果を Firestore `proposal_slots` に反映。

---

## 9. ストレージ（S3）

- 原本は非公開。Flask は必要に応じて S3 から取得して前処理/埋め込み生成を行うか、既存 `asset_id` とベクトルを参照して検索のみを行う。

---

## 10. 通知（FCM/APNs）

- `NotificationService` が `user_id -> device tokens` を解決して送信。
- テンプレ化: 文言テンプレ + 変数埋め込み、ローカライズ対応。
- 種別: 提案/合意/メッセージ/リマインド/フレンド申請・承認（詳細は F06）。

---

## 11. 設定（12-Factor）

主要環境変数（例）
- `FLASK_ENV` / `SECRET_KEY`
- `DATABASE_URL` / `REDIS_URL`
- `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY` / `S3_SECRET_KEY`
- `FCM_SERVER_KEY` / `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_AUTH_KEY`
- `GOOGLE_OAUTH_CLIENT_IDS`（カンマ区切り）
- `MODEL_ROOT`（ローカルAI 重みの配置パス）
- `VLLM_MODEL_NAME=chatgpt-oss-20b` / `VLLM_MAX_MODEL_LEN` / `VLLM_TENSOR_PARALLEL_SIZE`
  - 例: `VLLM_MODEL_NAME=chatgpt-oss-20b`, `VLLM_MAX_MODEL_LEN=4096`, `VLLM_TENSOR_PARALLEL_SIZE=1`

---

## 12. エラーハンドリング/レスポンス規約

- 統一フォーマット: `{ "error": { "code": "...", "message": "...", "details": {...} } }`
- HTTP ステータスの整合（400/401/403/404/409/422/429/500）
- 例外マッピング: ドメイン例外 → 適切な HTTP に変換

---

## 13. 観測性

- 構造化ログ（JSON）、リクエストID（correlation id）
- `/healthz`（Liveness）/`/readyz`（DB/Queue/AI）/`/version`
- Prometheus メトリクス（リクエストレイテンシ、キュージョブ、AI 実行時間）
- エラートラッキング: Sentry 等

---

## 14. デプロイ・スケール

- プロセス: Gunicorn（`workers = CPU*2+1` 目安、AI は別ワーカーで処理）
- スケール: API と AI ワーカーを分離スケーリング（水平）
- GPU/CPU: AI キューをノード属性で分離（GPU 対象ジョブは `ai-gpu`）
- ロールアウト: Blue-Green / Traffic Split（/readyz 合格で切替）
- マイグレーション: 起動前後で `flask db upgrade`

---

## 14.1 個人サーバー（セルフホスト）運用ガイド

前提: Ubuntu 22.04 LTS / 1台構成（API + Queue + AI）

必須コンポーネント
- Python 3.11（venv）、PostgreSQL 15、Redis、Caddy or Nginx（TLS終端）、systemd、（任意）NVIDIA Driver + CUDA（GPU利用時）

セットアップ概要
1) OS 準備
- ユーザ作成 `app`、防火壁 `ufw allow 80,443`、SSH鍵化
2) 依存インストール
- `apt install postgresql-15 redis-server nginx`（または caddy）
- Python venv で `pip install -r backend/requirements.txt`
3) DB 準備
- `createuser recall && createdb recall -O recall`、`.env` の `DATABASE_URL` を設定
4) 反向プロキシ/TLS
- Caddy 推奨（自動 TLS）。Nginx+certbot でも可。`/api` を Gunicorn へプロキシ
5) systemd 単位
- `gunicorn.service`（Flask API）、`rq-worker@{default,ai,notifications}.service`（キュー）、`vllm.service`（chatgpt-oss-20b）
6) マイグレーション
- 初回 `flask db upgrade`、起動後 health/ready を確認
7) バックアップ
- `pg_dump` を日次でS3等へ暗号化保管、`.env` は別保管（sops/age 推奨）

サンプル: gunicorn.service
```
[Unit]
Description=Recall Flask API
After=network.target

[Service]
User=app
WorkingDirectory=/srv/recall/backend
EnvironmentFile=/srv/recall/.env
ExecStart=/srv/recall/venv/bin/gunicorn app:create_app() -b 127.0.0.1:8000 -w 4 --timeout 60
Restart=always

[Install]
WantedBy=multi-user.target
```

サンプル: vLLM（chatgpt-oss-20b）
```
[Service]
User=app
WorkingDirectory=/srv/recall
Environment=VLLM_MODEL_NAME=chatgpt-oss-20b
ExecStart=/srv/recall/venv/bin/vllm serve $VLLM_MODEL_NAME --port 8008 --tensor-parallel-size 1
Restart=always
```

セキュリティ要点
- 80/443/（内部:8000,8008）はローカル限定、外部公開はTLS終端のみ
- JWT 秘密鍵はファイル権限 600、OS ユーザ分離
- 定期アップデート、logrotate、Fail2ban（任意）

運用
- ヘルスチェック: `/healthz` `/readyz` を監視、プロセス監視は systemd
- ログ: 構造化ログ（journald→CloudWatch/Vector等任意）
- 更新: `systemctl daemon-reload && systemctl restart gunicorn`（ゼロダウンを求めるならソケットアクティベーション）

GPU 利用
- NVIDIA Driver/CUDA を導入、vLLM を GPU で起動。メモリ 24–40GB 以上を推奨（量子化で削減可）。

注意
- 1台運用は単一障害点（SPOF）。バックアップ/監視/アラートを必ず整備。

---

## 15. テスト戦略

- Unit: services/repositories の純粋ロジック
- Integration: Flask TestClient + Test DB（コンテナ）
- 負荷: 近傍検索（k=20, 10万件）/通知バースト
- セキュリティ: IDOR/権限/レート制限の Negative テスト

---

## 16. セキュリティチェックリスト

- [ ] Google JWK キャッシュと `aud/iss/exp/iat` 厳格検証
- [ ] JWT 秘密鍵は KMS / 環境分離、ローテーション計画
- [ ] 署名URL は短寿命・最小権限、原本は非公開
- [ ] 重要操作の監査ログ、PII マスキング
- [ ] レート制限・IP 制限（管理系）
- [ ] 依存パッケージの脆弱性監査（pip-audit）

---

## 17. バージョニング/互換性

- API 互換: 破壊的変更はバージョンを上げる（ヘッダ/パス）
- `/version`: Git SHA/ビルド時刻/モデルバージョンを返す
- モデル切替: Canary → 段階的に既定化、失敗時はロールバック

---

## 18. 実装メモ・フォローアップ

### 確定事項
- 構造データは Firebase（Firestore/Functions）で管理し、Flask 側はベクトルデータと AI 専用処理を担う。
- 通知イベントは Flask から直接送信せず、Firebase Functions など既存通知基盤へエンキューして配信する。
- 画像アップロード後はワーカーが即座に埋め込み生成ジョブを処理する（オンデマンド再計算ではなく遅延同期）。
- 認証トークンには少なくとも `userId` クレームを含め、Flask サービスで認可判定に利用する。
- 本番・ステージング環境変数は GitHub Secrets で集中管理し、CI/CD から読み出す。
- `error.code` の命名規約は既存バックエンドと共通のフォーマットに合わせる（例: `AI_...` などは共通規約に従う）。

### 未確定事項（要フォロー）
- ジョブキュー実装（RQ/Celery）の正式選定と、`default`/`ai`/`notifications` 各キューのジョブ割り当て・ワーカー並列度。
- `MODEL_ROOT` 配下のモデルバージョン配置ルール、軽量モデル有無、GPU 非搭載環境でのフォールバック手順。
- CI で必要となる環境変数セットの最小構成（GitHub Secrets からどこまで展開するか）。
- Prometheus/Sentry 等の監視先を既存基盤へ統合する際の `/metrics` 公開範囲やメトリクス命名ガイドライン。
- 初期リリース時のデプロイ構成（API ワーカーと AI ワーカーを同一ノードで分離するか、ノード分離するか）。
