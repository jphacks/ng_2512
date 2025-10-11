# FB.2.1 Firestore Rules — Groups ACL

概要
- groups/messages へメンバーのみアクセス可能とする最小権限ルール作成。

依存
- docs/firestore/groups_messages_schema.md

成果物
- firestore.rules の groups/messages セクション
- ルール単体テスト（エミュレータ）

受け入れ条件
- メンバー以外の read/write を拒否（403）。
- メンバーは read/write 可（投稿者以外の削除は不可）で、Bot(system) 投稿も読み取れる。
- `originProposalId` に紐づくグループでメンバー外アクセスが 403 となり、docs/features/group.md のセキュリティ要件を満たす。

手順(推奨)
1) ルール実装: groups, groupMembers, groupMessages/*/messages
2) Jest もしくは rules-unit-testing によるテスト
3) エミュレータで動作確認

参照
- development_flow/FB_Firebase.md (FB.2.1)
- docs/features/group.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.2.1 Firestore Rules — Groups ACL

依頼文:
- groups/messages に対し、メンバーのみ read/write を許可するルールを作成し、ルール単体テストを追加してください。

提出物:
- firestore.rules 差分、rules-unit-testing テストコード、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）

推奨コマンド例:
- firebase emulators:start --only firestore
