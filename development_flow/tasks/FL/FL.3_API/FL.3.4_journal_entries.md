# FL.3.4 API — Journal Entries

概要
- docs/features/journal.md で定義された思い出ジャーナルの CRUD と提案生成エンドポイント（`POST/GET/PUT/DELETE /journal_entries`, `POST /journal_entries/{id}/create_proposal`）を Flask API として実装する。
- ジャーナルデータは Flask 側の PostgreSQL（journal_entries, journal_entry_tags）を権威とし、Firebase には参照用メタデータのみを渡す。

依存
- docs/backend/data-model.md（journal_entries, tags）
- FL.2.2 asset_repo（S3 key 取得）
- FL.2.3 ai_service（F12 自動提案生成呼び出し）
- FB.3.4（署名URL発行）

成果物
- Flask Blueprint: `/journal_entries` CRUD + `/journal_entries/{id}/create_proposal`
- SQLAlchemy モデル/リポジトリ（journal_entries, journal_entry_tags）
- OpenAPI/Schema 更新、バリデーション、E2E テスト（pytest）

受け入れ条件
- `POST /journal_entries` が `asset_id`, `entry_date`, `note`, `tagged_user_ids` を検証し、`journal_entries` と `journal_entry_tags` を作成する。`asset_id` は本人所有のものに限定し、S3 パスが docs/features/journal.md の規約（`journal/<userId>/...`）に一致する。
- `GET /journal_entries` がページネーションで本人のエントリのみ返し、タグと AI 提案へのリンク（`latestAiDraftId` 等）を含める。
- `PUT /journal_entries/{id}` と `DELETE /journal_entries/{id}` が本人のみ操作可能で、タグの再計算時には AI 提案ジョブを再度キューイングできるようメタデータを更新する。
- `POST /journal_entries/{id}/create_proposal` が F12 の生成ロジックを呼び出し、生成された提案ドラフトを Firestore（FB.3.6）へ送るための Webhook/Queue を発火する。二重リクエスト対策のため idempotency-key/BG job ロックを備える。
- すべての API は API Key/HMAC 認証を必須とし、監査ログに操作履歴を残す。

手順(推奨)
1) SQLAlchemy モデル/マイグレーションの実装（journal_entries, journal_entry_tags）
2) Blueprint + Pydantic schema で CRUD/API 定義、バリデーション、権限制御
3) `create_proposal` で ai_service と Firebase Webhook（FB.3.6）を連携し、バックグラウンドジョブ（RQ/Celery）をキューイング
4) pytest + factory で CRUD と提案生成の単体/統合テストを追加

参照
- docs/features/journal.md
- docs/backend/data-model.md
- development_flow/tasks/FB/FB.3_Cloud_Functions/FB.3.6_ai_proposal_drafts.md
- development_flow/tasks/FL/FL.3_API/FL.3.3_proposals_auto.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.3.4 API — Journal Entries

依頼文:
- `/journal_entries` の CRUD と `create_proposal` エンドポイントを実装し、本人限定アクセス・HMAC 認証・AI 提案連携を含めてください。pytest で CRUD/提案生成のテストも追加してください。

提出物:
- API 実装差分、マイグレーション、テストコード、OpenAPI 更新
- テスト実行ログ（pytest）
