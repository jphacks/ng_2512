# RN.2.10 Screen — Journal Offline Draft Sync

概要
- docs/features/journal.md の「オフラインドラフト同期」要件を満たすため、Journal 投稿/編集のローカルキャッシュ・再送・競合解決を実装する。

依存
- RN.2.7 Journal Timeline MVP
- RN.2.9 Journal Detail & Editing
- RN.3.2 apiClient（HMAC サイン）
- RN.4.0 i18n/状態管理

成果物
- オフラインキュー管理（AsyncStorage or MMKV）と再送制御フック
- 投稿/編集フォームのドラフト自動保存（一定間隔 or フォーカスアウト）
- アプリ再起動時に未送信ドラフトを検知→再送 or ユーザーに選択肢提示
- 競合検出（サーバ updatedAt と比較）と UI 上のマージ/警告表示
- テスト（ユニット or integration）でキュー動作を検証

受け入れ条件
- 機内モード等で投稿を試みるとローカルドラフトに保持され、オンライン復帰後に自動再送される
- 競合時（サーバ側で更新済み）には警告を表示し、ユーザーが「上書き」「サーバ版を採用」のどちらかを選べる
- ローカルドラフトの一括クリア/単体削除が可能
- AsyncStorage への保存がデータ漏洩しないよう暗号化/storage policy を検討し README に記載

参照
- docs/features/journal.md
- development_flow/tasks/RN/RN.2_Screens/RN.2.9_journal_detail_edit.md
- development_flow/tasks/RN/RN.4_Others/RN.4.0_i18n_accessibility_state.md

---
依頼テンプレート

タスクID: RN.2.10 Screen — Journal Offline Draft Sync

依頼文:
- Journal 投稿/編集のオフラインドラフト機能と再送ロジックを実装し、競合時の UI を整備してください。

提出物:
- フック/状態管理差分
- テストコードと実行ログ
- ドキュメント更新（保存場所/ポリシー）
