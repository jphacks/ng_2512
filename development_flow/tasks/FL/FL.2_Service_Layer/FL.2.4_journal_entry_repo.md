# FL.2.4 Service — JournalEntryRepository (SQLAlchemy)

概要
- docs/features/journal.md で定義された思い出データを PostgreSQL に永続化するため、これまでの in-memory 実装 (`journal_repo.py`) を SQLAlchemy ベースに置き換える。

依存
- docs/backend/data-model.md（journal_entries スキーマ）
- FL.3.4 API — Journal Entries
- backend/app.py の DI 構成

成果物
- `backend/repositories/journal_repo.py` の SQLAlchemy 実装（CRUD + proposal キャッシュ）
- テスト用の Fixtures/Factory（pytest）と CRUD/提案生成のユニットテスト
- `backend/app.py` へのリポジトリ差し替え（DB セッション管理含む）
- マイグレーション/接続設定の README 追記

受け入れ条件
- `create_entry/list_entries/get_entry/update_entry/delete_entry/cache_proposal/get_cached_proposal` が DB バックエンドで動作し、全ての操作でユーザー所有チェックを行う
- `list_entries` がページネーション・降順ソート・total/hasMore を返し、N+1 を防ぐためタグを eager load
- `cache_proposal` が `latest_ai_draft(Id)` を更新し、冪等キー付きキャッシュを保存
- pytest で CRUD + 提案キャッシュの往復テストを追加し、CI で通過

参照
- docs/features/journal.md
- development_flow/tasks/FL/FL.3_API/FL.3.4_journal_entries.md
- backend/tests/test_api_journal.py

---
依頼テンプレート

タスクID: FL.2.4 Service — JournalEntryRepository (SQLAlchemy)

依頼文:
- JournalEntryRepository を SQLAlchemy 化し、CRUD/提案キャッシュを PostgreSQL に保存してください。テストも更新して CI が通ること。

提出物:
- リポジトリ実装差分
- テストコードと実行ログ
- ドキュメント更新
