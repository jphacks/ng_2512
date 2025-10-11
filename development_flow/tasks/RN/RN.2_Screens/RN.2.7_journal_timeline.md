# RN.2.7 Screen — Journal Timeline & Detail

概要
- docs/features/journal.md の UI/UX を満たすタイムライン/詳細画面を実装し、RN.2.4 のアップロード基盤と FL.3.4 API を用いて思い出の閲覧・編集・再提案導線を提供する。

依存
- RN.2.4（署名URLアップロード/asset_id 管理）
- RN.2.5（プロフィール/username 表示）
- RN.2.6（設定）
- RN.3.2（apiClient）
- RN.3.3（通知ディープリンク）

成果物
- `src/app/journal/JournalListScreen.tsx`（タイムライン）
- `src/app/journal/JournalDetailScreen.tsx`（詳細 + 「このメンバーでまた集まろう」）
- `src/app/journal/JournalEditScreen.tsx`（編集）
- React Navigation ルーティング、状態管理（React Query）

受け入れ条件
- タイムライン画面で `/journal_entries` をページネーション付きで取得し、日付降順で表示する。空状態・エラー状態・ローディングを実装し、写真サムネイル/タグ/メモ要約を表示する。
- 詳細画面で写真・タグ（AI 候補を含む）・メモを表示し、タグの追加/削除やメモ編集ができる。編集結果は `PUT /journal_entries/{id}` に反映される。
- 「このメンバーでまた集まろう」ボタンから `POST /journal_entries/{id}/create_proposal` を呼び出し、成功時に RN.2.1 の提案詳細（AI ドラフト）へ遷移する。処理中/エラー時のトーストを表示する。
- 通知（FB.3.7）からの deeplink で詳細画面を開き、該当エントリが強調表示される。ディープリンクが無効または削除済みの場合はエラー表示を行う。
- タイムラインには「1年前の今日」などのバッジを表示し、ユーザーがジャーナル通知を OFF にしていても UI 上で表示する。通知設定が ON の場合のみ「通知を停止」導線を表示する。
- 端末ローカルに思い出のドラフトを保存し、オフライン状態でも編集→再同期が可能。同期競合時はサーバ側優先でマージし、ユーザーに警告する。

手順(推奨)
1) `/journal_entries` の React Query フェッチャーと型定義
2) タイムライン/詳細/編集画面の実装とナビゲーション追加
3) 提案作成ボタン→AI ドラフト作成→遷移のフロー実装
4) Deeplink/通知連携（`proposal.ai_draft` と `journal.anniversary`）とオフラインドラフト同期

参照
- docs/features/journal.md
- docs/features/ai_proposal.md
- docs/features/people_match.md
- development_flow/tasks/FL/FL.3_API/FL.3.4_journal_entries.md
- development_flow/tasks/FB/FB.3_Cloud_Functions/FB.3.7_journal_anniversary_notifications.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.7 Screen — Journal Timeline & Detail

依頼文:
- ジャーナルのタイムライン/詳細/編集画面を実装し、`/journal_entries` CRUD と `create_proposal` 呼び出し、通知ディープリンク連携、オフラインドラフト同期まで通してください。

提出物:
- 画面実装差分、React Query フック、ナビゲーション更新、動作確認ログ
- テスト実行ログ（Jest/Detox 等該当するもの）
