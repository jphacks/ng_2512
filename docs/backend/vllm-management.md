# vLLM 運用（FL.5.1）

本リポジトリには、vLLM（OpenAI互換）を監視する軽量サイドカー `vllm_guardian` を含みます。

ガーディアン提供エンドポイント
- `/healthz`: Liveness（200/503）
- `/readyz`: Readiness（直近成功が既定15秒以内なら200）
- `/version`: コンポーネント情報とモデル名
- `/metrics`: Prometheus テキスト（up, checks, failures, uptime, last_ok）

Compose
- テスト: `docker-compose.test.yml` に `vllm`（モック）と `vllm_guardian` を定義（ポート 8010）
- 本番: `deploy/docker-compose.yml` に `vllm` と `vllm_guardian`（`ai` プロファイル）を定義。ポートは `${VLLM_GUARDIAN_PORT:-8010}`

環境変数
- `TARGET_HEALTH_URL`（既定: `http://vllm:8008/health`）
- `MODEL_NAME`（既定: `chatgpt-oss-20b`）
- `PROBE_INTERVAL_SEC`（既定: `5`）
- `GUARDIAN_PORT`（既定: `8010`）

備考
- モック vLLM も `/healthz`, `/readyz`, `/version`, `/metrics` を提供し、挙動を揃えています。
- `VLLM_ENDPOINT` は推論先（vLLM本体）を指し続けます。ガーディアンは監視/メトリクス用です。
