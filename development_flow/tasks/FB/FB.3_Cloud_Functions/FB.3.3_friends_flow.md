# FB.3.3 Cloud Functions — Friends Flow

概要
- 申請/承認/却下/取消/解除の API 実装と整合性維持。

依存
- docs/firestore/friendships_schema.md
- FB.2.*

成果物
- functions: friends.request, friends.accept, friends.decline, friends.cancel, friends.remove, friends.list
- 通知イベント: `friend.requested`, `friend.accepted` を FB.3.5 に publish

受け入れ条件
- 不正操作を拒否し、当事者のみが request/accept/decline/cancel/remove を実行できる。
- `pending` の重複申請が作成されない（LEAST/GREATEST キーで整合性）。
- 承認時に `friendships` が対称に作成され、解除時は対称に削除される。ブロック成立時は pending を自動キャンセルし、確定関係を解除する。
- 申請受信/承認成立の通知イベントを FB.3.5 へ発行し、docs/features/friend.md の UI 遷移が実現できる。

手順(推奨)
1) HTTPS Callable 設計（各操作ごと）と idempotency。
2) ルールに加えてサーバ側でも検証し、ブロック状態・重複申請・自分自身宛を拒否。
3) 監査ログ/通知トリガ連携、friendships 作成/解除のトランザクション整備。

参照
- development_flow/FB_Firebase.md (FB.3.3)
- docs/features/friend.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.3 Cloud Functions — Friends Flow

依頼文:
- friends.request/accept/decline/cancel/remove/list を HTTPS Callable で実装し、当事者以外の操作拒否と監査ログを含めてください。

提出物:
- Functions コード、テスト、ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
