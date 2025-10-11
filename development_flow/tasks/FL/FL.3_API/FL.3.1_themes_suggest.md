# FL.3.1 API — POST /ai/themes/suggest

概要
- テーマ候補の生成API実装（asset/hints→themes[]）。

依存
- FL.2.3
- docs/backend/flask-architecture.md（テーマ語彙テーブル）

成果物
- エンドポイント、OpenAPI 仕様、単体/統合テスト

受け入れ条件
- バリデーション/レート制限/HMAC 署名。
参照
- docs/features/theme_generator.md のレスポンス（`suggested_themes[]`、score、model）とエラーハンドリングに準拠し、`theme_suggestions` へログを記録する。
- 画像アップロード（multipart）と `asset_id` 指定の両方に対応し、アップロード済み asset は再利用する。
- ユーザー/言語/トップK のトレーサビリティを残し、レート制限/監査ログを出力する。

手順(推奨)
1) OpenAPI 草案
2) Flask ルート/DTO/エラー
3) tests: happy/invalid/timeout

- docs/features/theme_generator.md
- docs/backend/api-spec.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.3.1 API — POST /ai/themes/suggest

依頼文:
- OpenAPI を定義し、Flask エンドポイント/DTO/エラーハンドリングと HMAC 検証を実装、単体/統合テストを追加してください。

提出物:
- 実装差分、OpenAPI、テスト、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
