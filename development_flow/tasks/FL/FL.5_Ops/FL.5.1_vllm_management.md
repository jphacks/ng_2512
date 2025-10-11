# FL.5.1 Ops — vLLM Management

概要
- chatgpt-oss-20b を vLLM で起動/監視し、推論エンドポイントを提供。

依存
- CI.2, CI.4

成果物
- docker-compose.* 追加/更新、ヘルスチェック、監視メトリクス

受け入れ条件
- 起動/再起動/ダウン時の挙動が安定し、ロード中は /readyz が失敗してリクエストを受け付けない。
- /healthz /readyz /metrics を提供し、トークン利用・待ち時間・GPU メトリクスを収集する。
参照
- docs/features/ai_proposal.md で指定された温度/max_tokens/モデルバージョンを設定ファイル化し、再デプロイ無しで調整できる。
- モデルウェイトの取得/検証手順とセキュリティ（チェックサム・アクセス制御）を記録する。

手順(推奨)
1) コンテナ設定/リソース割当
2) 起動スクリプト/監視連携

- docs/features/ai_proposal.md
- development_flow/FL_FlaskAI.md (FL.5.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.5.1 Ops — vLLM Management

依頼文:
- vLLM コンテナの起動/監視/ヘルスエンドポイントを整備し、compose.test や本番で安定稼働するようにしてください。

提出物:
- compose 変更、監視設定、手順書、確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）