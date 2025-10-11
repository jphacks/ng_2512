# RN.2.4 Screen — Journal (Signed URL Upload)

概要
- 思い出ジャーナル投稿および OS 共有シート経由の画像受信時に、署名URLを取得して S3 PUT→`asset_id` を管理する基盤を実装する。
- 生成された `asset_id` は F10/F11/F12 の AI 機能に横断利用できるように保存・受け渡しする。

依存
- FB.3.4, SEC.3
- RN.2.5（プロフィールが完了していることを前提に投稿者情報を表示）

成果物
- src/app/journal/*, upload ユーティリティ

受け入れ条件
- 署名URL寿命内のみアップロード成功し、失効時は再リクエスト導線を提供する。共有シート経由でアプリを起動した場合も同じ UX で再試行できる。
- `Content-Type`/`Content-Length` 検証と `x-amz-meta-owner` 等メタデータ付与をクライアントで実装し、docs/features/journal.md の要件に合致させる。
- アップロード進捗/失敗時の再試行/ユーザー通知、ローカルドラフト保存を提供する。アップロード完了後は `asset_id` を端末ローカルに保持し、RN.2.1 の提案導線に渡せる。
- 投稿画面では F11 の自動タグ候補取得のために `/contacts/match_from_image` を呼び出し、取得した候補を写真上で確認できる（docs/features/journal.md 6. 他機能連携）。オプトイン未完了時は RN.2.6 の設定導線を案内する。
- 「このメンバーでまた集まろう」ボタンから F12 の提案作成導線へ遷移でき、写真・タグ・メモをコンテキストとして渡す。

手順(推奨)
1) getSignedUrl 呼び出し
2) PUT 実行/進捗UI
3) asset_id 保存

参照
- docs/features/journal.md
- development_flow/tasks/RN/RN.2_Screens/RN.2.7_journal_timeline.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.4 Screen — Journal (Signed URL Upload)

依頼文:
- 署名URL取得→S3 PUT→asset_id 保存のフローを実装し、寿命切れ/失敗時の再試行とUXを整備してください。

提出物:
- 実装差分、確認動画orログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
