# RN.2.2 Screen — Groups & Chat

概要
- Firestore 購読/送信、既読/未読、Typing 表示のチャット実装。

依存
- docs/firestore/groups_messages_schema.md
- FB.2.1 Firestore Rules — Groups ACL
- RN.3.4 presence/typing

成果物
- src/app/groups/* チャットUI/購読ロジック

受け入れ条件
- メンバーのみ閲覧/送信可能で、メンバー外はアクセス拒否される。
- リアルタイムでメッセージ/typing/presence が反映され、Bot(system) の初期メッセージとリマインダーを表示できる。
- 未読バッジ、既読処理、メッセージ添付（asset）表示が docs/features/group.md の要件を満たす。

手順(推奨)
1) リスト/Composer/メッセージ気泡
2) Firestore 購読/送信
3) typing/presence 表示

参照
- docs/features/group.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.2 Screen — Groups & Chat

依頼文:
- チャットUI/購読/送信/typing 表示を実装し、メンバーのみ閲覧/送信可能なことを確認してください。

提出物:
- 画面/購読ロジック、動作確認動画orログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
