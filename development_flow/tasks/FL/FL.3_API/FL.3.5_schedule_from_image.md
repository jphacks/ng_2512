# FL.3.5 API — POST /ai/schedule/from_image

概要
- 画像から予定とメンバー候補を抽出する Flask API エンドポイントを実装します。VLM サービス（FL.2.5）を呼び出し、抽出結果をクライアントと Firebase Functions へ返します。

依存
- FL.2.5（VLM スケジュールサービス）
- docs/backend/flask-architecture.md VLM 節
- docs/backend/flask-vector-arch.md（VLM 観測永続化）
- docs/backend/api-spec.md（AI セクション拡張）

成果物
- `routes/ai.py` などへの新しいハンドラとスキーマ
- OpenAPI / API spec 追記（任意）
- 単体テスト & 統合テスト（モック VLM / ストレージ）

受け入れ条件
- `POST /ai/schedule/from_image` が `assetId` または 署名 URL を入力に受け取り、抽出済み結果を返す。
- レスポンスに `scheduleCandidates[]`, `memberCandidates[]`, `notes[]`, `observationId` を含める。
- 冪等性: 同じ `assetId` で再実行すると既存観測を返す。
- エラー処理: 画像未検出/推論失敗時に 4xx/5xx と明確なエラーコードを返却。
- 監査ログ（observationId, initiatorUserId, latency）を記録。

手順(推奨)
1) スキーマを定義（pydantic/marshmallow）。
2) `vlm_schedule_service` を呼び出し DTO を API レスポンスに整形。
3) モック VLM で統合テストを追加し、docs のレスポンス例を検証。
4) docs/backend/api-spec.md を更新（別タスク可）。

参照
- docs/backend/flask-architecture.md
- docs/backend/api-spec.md
- development_flow/FL_FlaskAI.md (FL.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.3.5 API — POST /ai/schedule/from_image

依頼文:
- `POST /ai/schedule/from_image` を実装し、VLM サービスの結果を整形して返却する API を作成してください。冪等性とエラーハンドリングを含めて検証してください。

提出物:
- API 実装 + テストコード
- テストログ（成功/失敗パス）と動作確認メモ
