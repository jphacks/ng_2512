# FB.2.2 Firestore Rules — Proposals ACL

概要
- proposals と配下に対し、author と audiences のみアクセス可とし、`draft` 状態は author（AI 自動生成の場合は対象ユーザー）だけが閲覧できるようにする。

依存
- docs/firestore/proposals_schema.md

成果物
- firestore.rules の proposals セクション
- ルール単体テスト

受け入れ条件
- `draft` ステータスの read は author のみ許可し、`approve_and_send` 呼び出しで `pending` に移る際の権限を検証。
- 当事者以外の read/write を拒否。
- status 遷移の検証（`draft`→`pending`→`agreed|rejected|canceled` のみ許可し、それ以外は拒否）。

手順(推奨)
1) proposals/* と subcollections の read/write 条件追加（draft 時は author のみ read）。
2) 正当な遷移のみ許可する rule helper 実装（draft→pending を `approve_and_send` のみに限定）。
3) AIドラフトが存在する場合の audiences 視点の拒否テストと、pending 以降での read 許可テストを追加。

参照
- development_flow/FB_Firebase.md (FB.2.2)
- docs/features/proposal.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.2.2 Firestore Rules — Proposals ACL

依頼文:
- proposals と配下に対して author/audiences のみアクセス可となるルールを実装し、状態遷移の検証を含む負テストを追加してください。

提出物:
- firestore.rules 差分、テストコード、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
