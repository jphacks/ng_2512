# FL.2.2 Service — Asset Repository

概要
- asset_id→S3 key 解決や前処理入力取得を担うリポジトリ層。

依存
- docs/backend/flask-architecture.md（アセット/ストレージ方針）

成果物
- src/server/repositories/asset_repo.py
- 単体テスト

受け入れ条件
- S3 キーの解決ミスがない、存在確認/例外を適切に返す。
参照
- docs/features/journal.md のパス規約（`journal/<userId>/<yyyy>/<mm>/...`）とメタデータ（owner, origin）を返却できる。
- 画像前処理に必要なコンテンツタイプ/サイズ/EXIF 情報を提供し、署名URLポリシー違反時はエラーを返す。

手順(推奨)
1) get_by_id, resolve_s3_key 実装
2) 例外/リトライポリシー

- docs/features/journal.md
- docs/features/ai_proposal.md
- docs/backend/data-model.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.2.2 Service — Asset Repository

依頼文:
- asset_id→S3 key 解決/存在確認/例外整備を行うリポジトリを実装し、リトライ/タイムアウト方針も含めてください。

提出物:
- 実装、単体テスト
- テスト実行ログ（該当テストを実行した場合はログを添付）
