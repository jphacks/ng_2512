# CI.4 Deploy — Personal Server (Compose)

概要
- サーバに GHCR から pull して up、DB migration を実行。

依存
- CI.3, FL.5.*

成果物
- デプロイスクリプト/手順書
- 実行ログサンプル

受け入れ条件
- ロールバック手順あり、ゼロダウン/短時間停止で更新

手順(推奨)
1) SSH + compose pull/up -d
2) flask db upgrade
3) ヘルス確認

参照
- development_flow/CI_CICD.md (CI.4)
- docs/dev/deploy_server.md

提出物の場所
- スクリプト: `scripts/deploy/server_deploy.sh`, `scripts/deploy/server_rollback.sh`
- Compose: `deploy/docker-compose.yml`, `deploy/.env.deploy.example`
- 確認ログ: `development_flow/logs/ci4_deploy_sample.log`

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: CI.4 Deploy — Personal Server (Compose)

依頼文:
- サーバで GHCR から pull→up、DB migration を行うデプロイスクリプト/手順を作成し、ロールバック手順も明記してください。

提出物:
- スクリプト/手順書、確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
