# Firestore Schema — Groups & Messages (FB.1.2)

最終更新: 2025-09-04

目的
- 合意成立後のプライベートグループと、そのグループ内チャットを安全・効率的に表現する。
- メンバー以外がデータへアクセスできないこと、メッセージの降順ページングが成立することを担保。

コレクション設計
- `groups/{groupId}`
  - `fromProposalId: string` 元となった提案ID
  - `title: string` グループ名（提案タイトルなど）
  - `createdAt: timestamp` 作成時刻
  - 将来拡張: `lastMessageAt`, `lastMessagePreview`

- `groups/{groupId}/members/{uid}`
  - `userId: string` 参加者UID（= `{uid}`）
  - `role: 'owner'|'member'` 役割
  - `joinedAt: timestamp` 参加時刻

- `groupMessages/{groupId}/messages/{messageId}`
  - `authorId: string` 送信者UID
  - `text: string` 本文（最大長はクライアント側で制御）
  - `assetId: string|null` 添付アセットID（任意）
  - `createdAt: timestamp` 送信時刻
  - 将来拡張: `kind: 'text'|'image'|'system'` 等

インデックス（複合）
- messages（コレクショングループ）: `authorId(asc) + createdAt(desc)`
  - 例: 特定ユーザの発言のみ降順で読む際に使用
- members（コレクショングループ）: `userId(asc) + joinedAt(desc)`
  - 例: 自分が所属する最新グループ一覧を出す際に使用

セキュリティルール（要約）
- 位置: ルート `firestore.rules`
- 方針:
  - `isGroupMember(groupId)` を定義し、`groups` と `groupMessages/{groupId}/messages` の `get/list` をメンバーのみに許可。
  - `messages` はメンバーのみ `create` 可、かつ `authorId == request.auth.uid` を強制。
  - `messages` の `update/delete` は作者のみ許可（`authorId`/`createdAt` は不変）。

クエリ例（降順ページング）
- 最新20件（初回）
  - `db.collection('groupMessages').doc(groupId).collection('messages').orderBy('createdAt', 'desc').limit(20)`
- 次ページ
  - `query.startAfter(lastSnapshot).limit(20)` （`lastSnapshot` は前ページ末尾のドキュメント）
- 送信者でフィルタ（要: 複合インデックス）
  - `.where('authorId','==', uid).orderBy('createdAt','desc').limit(20)`

エミュレータ検証
- セットアップ: `npm i`
- 実行: `npm run fb:verify:groups`
- 期待: メンバーは `groups` と `messages` を `get/query` できるが、非メンバーは不可。`create` などの書込は拒否。

備考（配置の意図）
- メンバーシップは `groups/{groupId}/members` に保持。これによりルールで `exists()` を用いた高速チェックが可能で、同時に `collectionGroup('members')` を使う集約クエリも実現できる。
