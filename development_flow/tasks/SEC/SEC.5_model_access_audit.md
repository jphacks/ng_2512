# SEC.5 Security — Model & Embedding Access Audit

概要
- VLM/顔埋め込み/テーマ埋め込みへのアクセスを監査し、プライバシー要件と削除請求に対応できる統制を整備します。

依存
- SEC.1, SEC.2, SEC.3, SEC.4
- docs/features/privacy.md
- docs/backend/flask-architecture.md（VLM セクション）

成果物
- アクセス監査ポリシーと実装計画（監査ログ、ローテーション、アラート）
- 運用ドキュメントの更新案（任意）

受け入れ条件
- `vlm_observations` など新規テーブルへのアクセスを含めたデータ分類と保持期間を定義。
- モデル推論ログ（observationId, userId, assetId）のマスキングと暗号化方針を示す。
- 監査ログの集約先（S3/BigQuery 等）と閲覧権限管理を記述。
- 削除請求時の対応フロー（顔埋め込み・VLM観測をまとめて削除）を定義。
- アラート条件（大量アクセス、失敗率増加）を提示。

手順(推奨)
1) docs のプライバシー要件と VLM 設計を整理。
2) 収集されるデータの分類と保持方針をまとめる。
3) ログ/メトリクス/アラートの運用方針を文書化。

参照
- docs/features/privacy.md
- docs/backend/flask-architecture.md
- development_flow/SEC_Security.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: SEC.5 Security — Model & Embedding Access Audit

依頼文:
- VLM/埋め込みデータ向けの監査・保持・アラート方針をまとめ、削除請求に備えた運用ドキュメントを作成してください。

提出物:
- ドキュメント案（md/ノート）
- 補足する必要があるリポジトリアップデートの TODO リスト
