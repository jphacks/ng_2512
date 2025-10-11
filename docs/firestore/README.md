# Firestore (FB.1) — Emulator & Verification

セットアップ
- 依存の導入: `npm i`
- ルール/インデックス/エミュレータ設定: ルート直下の `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`

検証（FB.1.1 提案/Audience/Slots のACL, FB.1.3 Presence）
- 実行: `npm run fb:verify`
- 処理: Firestore Emulator を起動→シード（proposals/test1）→ルールを適用して読み書きの可否を検証
- 期待出力: `[verify] All rule checks passed`

スキーマドキュメント
- Presence: `docs/firestore/presence_schema.md`
- Friendships: `docs/firestore/friendships_schema.md`

検証（FB.1.2 Groups/Messages のACL）
- 実行: `npm run fb:verify:groups`
- 処理: Firestore Emulator を起動→シード（groups/test1, groupMessages/test1/messages/*）→メンバー/非メンバーの可否を検証
- 期待出力: `[verify:groups] All group rule checks passed`

注意
- proposals へのクライアント書込は禁止（Cloud Functions 経由で遷移・集計を実装予定）。
- slots の書込は提案者のみ、かつ `status='pending'` の間に限定。
- groups/messages はメンバーのみ read。クライアントからの write は禁止（Functions 経由）。
