# RN.2.9 Screen — Journal Detail & Editing

概要
- docs/features/journal.md の詳細画面仕様（タグ編集、メモ編集、削除、deeplink 応答）を React Native で実装し、RN.2.7 のタイムラインと連携させる。

依存
- RN.2.7 Journal Timeline MVP
- RN.2.8 Journal Tag Suggestions
- RN.3.2 apiClient（PUT/DELETE /journal_entries）
- RN.3.3 notifications（deeplink ハンドリング）

成果物
- `JournalDetailScreen.tsx`, `JournalEditScreen.tsx`（または同等の構成）
- React Navigation ルーティング/パラメータ/リンク設定
- `/journal_entries/{id}` の GET/PUT/DELETE フック
- Deeplink (`app://journal/{entryId}`) から詳細を開くハンドラ
- 編集・削除後の楽観更新とトースト/エラー表示

受け入れ条件
- タイムラインから詳細へ遷移し、写真・タグ・メモを表示
- 編集画面でメモ/タグ/日付を変更し、`PUT /journal_entries/{id}` に反映。成功時はタイムラインへ戻り更新される
- 詳細画面から削除 (`DELETE /journal_entries/{id}`) が行え、成功時にリストから除外される
- Deeplink/通知 (`journal.anniversary`, `proposal.ai_draft`) から該当エントリを開き、見つからない場合はリカバリー UI を表示
- i18n 文言とアクセシビリティラベルを整備
- Jest/React Testing Library 等でロジックテスト またはスクリーンスナップショットを追加

参照
- docs/features/journal.md
- development_flow/tasks/FL/FL.3_API/FL.3.4_journal_entries.md
- development_flow/tasks/FB/FB.3_Cloud_Functions/FB.3.7_journal_anniversary_notifications.md

---
依頼テンプレート

タスクID: RN.2.9 Screen — Journal Detail & Editing

依頼文:
- Journal 詳細/編集画面を実装し、PUT/DELETE と deeplink 対応を含む行動をタイムラインに連携してください。

提出物:
- 画面実装差分
- ナビゲーション・deeplink 設定
- テスト実行ログ
