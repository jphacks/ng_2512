# CI.3 GitHub Actions — Build/Test/Push

概要
- Unit→Compose統合→GHCR push のワークフローを構築。

依存
- CI.1, CI.2

成果物
- .github/workflows/ci.yml（雛形/手順）

受け入れ条件
- main/PR でワークフローが成功、キャッシュ効率良好

手順(推奨)
1) matrix/キャッシュ設定
2) compose test job
3) GHCR login/push

参照
- docs/dev/ci-cd.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: CI.3 GitHub Actions — Build/Test/Push

依頼文:
- Unit→Compose統合→GHCR push のワークフローを構築し、main/PR 時に成功することを確認してください。

提出物:
- workflows/ci.yml、実行ログ/スクリーンショット
- テスト実行ログ（該当テストを実行した場合はログを添付）
