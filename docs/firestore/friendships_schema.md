# Firestore Schema — Friendships & Requests (FB.1.4)

最終更新: 2025-09-04

目的
- 相互承認フロー（申請→承認/却下/取消）と確定フレンド関係を安全かつ効率的に表現する。
- 当事者以外は read 不可、pending→accepted/declined/canceled の遷移を一意に制約する。

コレクション設計
- `friend_requests/{requestId}`
  - `from: string` 申請者UID
  - `to: string` 受信者UID
  - `status: 'pending'|'accepted'|'declined'|'canceled'`
  - `createdAt: timestamp` 申請時刻
  - `respondedAt: timestamp|null` 承認/却下/取消の時刻
  - `requestId` は正規化したペアID（`min(uidA,uidB) + '_' + max(uidA,uidB)`）
    - 例: `U_AUDIENCE_U_PROPOSER`

- `friendships/{pairId}`
  - `uids: string[2]` 当事者UIDの昇順配列（`[min, max]`）
  - `since: timestamp` 成立時刻
  - `status: 'active'` 将来拡張用にステータスを保持

インデックス（複合）
- `friend_requests`（コレクション）
  - `to(asc) + status(asc) + createdAt(desc)`
  - `from(asc) + status(asc) + createdAt(desc)`
- `friendships`（コレクション）
  - `uids(array-contains) + since(desc)`

セキュリティルール（要約）
- 位置: ルート `firestore.rules`
- 方針:
  - `friend_requests` は当事者のみ `get/list` 可。作成は申請者のみ、状態遷移は `pending`→`accepted|declined`（受信者）/`canceled`（申請者）のみ許可。
  - ドキュメントIDは正規化ペアIDと一致必須（双方向重複 `pending` を防止）。
  - `friendships` は当事者のみ `get/list` 可。クライアントからの `write` は不可（Functions 管理）。

クエリ例
- 受信した未処理申請: `where('to','==', uid).where('status','==','pending').orderBy('createdAt','desc')`
- 送信した未処理申請: `where('from','==', uid).where('status','==','pending').orderBy('createdAt','desc')`
- フレンド一覧: `where('uids','array-contains', uid).orderBy('since','desc')`

備考（整合性）
- 承認時に `friendships/{pairId}` を Functions で作成（両者にのみ可視）。
- 取消/却下後の再申請は新たな `createdAt` で `status='pending'` を作り直す（古いリクエストは不可変）。

