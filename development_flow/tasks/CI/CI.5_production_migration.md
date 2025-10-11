# CI.5 Deploy — Production Migration (Infra/Secrets/Data/Cutover)

概要
- 本番環境への移植（インフラ/シークレット/データ移行/カットオーバー）を安全に実施できる状態を整備します。Blue-Green または最小ダウンタイムで切替し、即時ロールバック可能とします。

依存
- CI.4 Deploy(Server) 完了
- SEC.*（ログ/レート制限/署名/HMAC などの運用前提）
- QA.2/QA.3 がステージングで合格済み

成果物
- 本番用 compose/環境変数テンプレート（例: `.env.production.example`）
- シークレット管理手順（GitHub Secrets/1Password/環境毎のキー管理）
- データ移行計画（初期データ/マイグレーション/リハーサル手順）
- カットオーバー/ロールバック手順書（Runbook）
- スモークテスト/モニタリングチェックリスト

受け入れ条件
- カットオーバー手順でゼロ/最小ダウン確認、ロールバック手順の有効性確認
- 本番起動後のスモークテスト項目が全て通過
- 監視/ログ/レート制限/署名検証が有効

手順(推奨)
1) 本番 compose/変数テンプレート整備、Secrets 登録・権限最小化
2) マイグレーション手順のリハーサル（ステージングで再現）
3) Blue-Green または停止時間最小の切替方式を選定し Runbook 作成
4) カットオーバー実施→スモークテスト→監視確認、即時ロールバック基準定義
5) 事後レビュー（学び/改善点を記録）

参照
- docs/dev/ci-cd.md
- docs/dev/deploy_server.md
- development_flow/CI_CICD.md (CI.5)
- development_flow/SEC_Security.md
- development_flow/QA_Testing.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: CI.5 Deploy — Production Migration (Infra/Secrets/Data/Cutover)

依頼文:
- 本番移植のためのインフラ/シークレット/データ移行/カットオーバーRunbookを整備し、最小ダウン/ロールバック可/スモークテスト合格までを確認してください。

提出物:
- compose/環境テンプレート、Secrets 設定例、Runbook、スモークテスト手順と実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
