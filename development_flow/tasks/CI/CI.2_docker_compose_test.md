# CI.2 docker-compose.test — Integration Stack

概要
- Postgres/Redis/vLLM/API を起動し、統合テストを実行。

依存
- CI.1, FL.*, QA.2

成果物
- docker-compose.test.yml, テストスクリプト

受け入れ条件
- /ai/* の統合テスト（themes/people/proposal_drafts）が安定実行され、docs/features/ai_proposal.md 等のシナリオを再現できる。
- Firebase エミュレータ連携のためのシークレット/環境変数を注入し、ローカルとCIで同一 compose を利用できる。
- 各サービスにヘルスチェック/待機ロジックがあり、失敗時は再試行または明示的に失敗する。

手順(推奨)
1) compose 設定（ネットワーク/依存順）
2) ヘルスチェック/待機
3) テストランナー実装

参照
- docs/dev/ci-cd.md
- development_flow/CI_CICD.md (CI.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: CI.2 docker-compose.test — Integration Stack

依頼文:
- Postgres/Redis/vLLM/API を起動する compose とテストランナーを整備し、/ai/* の統合テストが実行できるようにしてください。

提出物:
- compose ファイル、スクリプト、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）