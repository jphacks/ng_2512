# Firestore Schema — Proposals/Audiences/Slots (FB.1.1)

最終更新: 2025-09-04

目的
- 提案（proposals）と対象受信者（audiences）、日時候補（slots）を正規化し、後続の合意・グループ生成の基盤を提供。

コレクション設計
- `proposals/{proposalId}`
  - `proposerId: string` 提案者UID（合意成立までUIへは非公開）
  - `title: string` タイトル
  - `body: string` 本文/テーマ
  - `place: string` 任意の場所表現（例: 渋谷〜恵比寿）
  - `status: 'pending'|'agreed'|'rejected'|'canceled'`
  - `audienceIds: string[]` クエリ最適化用（受信者UIDの配列）
  - `expiresAt: timestamp` 締切（将来的に Functions が監視）
  - `createdAt: timestamp` 作成時刻
  - `updatedAt: timestamp` 更新時刻

- `proposals/{proposalId}/audiences/{uid}`
  - `role: 'receiver'|'cc'|'bcc'` 受信者の役割（既定: 'receiver'）
  - `reaction: 'like'|'dislike'|null` 反応（未反応は null）
  - `reactedAt: timestamp|null` 反応時刻

- `proposals/{proposalId}/slots/{slotId}`
  - `start: timestamp` 候補開始（ISO8601に準ずる。Firestore上は Timestamp）
  - `end: timestamp` 候補終了
  - `timezone: string` IANA タイムゾーン（例: "Asia/Tokyo"）

インデックス（抜粋）
- proposals: `proposerId + status + createdAt(desc)`
- proposals: `audienceIds (array-contains) + createdAt(desc)`
- slots: `start (asc)`

セキュリティルール（断片）
- 位置: `firestore.rules`
- 方針:
  - 提案の `read` は提案者または受信者のみに限定。
  - `audiences/{uid}` は本人（`uid`）または提案者のみ `read` 可能。本人は `reaction` を作成/更新可。
  - `slots` は提案者/受信者のみ `read`。`write` は提案者かつ `status='pending'` の間のみ許可。
  - proposals へのクライアント `write` は禁止（Cloud Functions 経由で行う）。

受け入れ条件への対応
- 状態遷移: `pending→agreed/rejected/canceled` は Functions 実装で一意に制御（本タスクではクライアント更新を禁止し、矛盾を回避）。
- ACL: audiences に含まれないユーザは proposal を参照不可（ルールで制御）。
- slots 正規化: `start/end` は Timestamp、`timezone` は IANA 文字列で保持し ISO8601 互換表現を担保。

検証
- エミュレータ構成: `firebase.json`、`firestore.rules`、`firestore.indexes.json`
- シード/検証スクリプト: `scripts/seed_proposals.js` と `scripts/verify_rules.js`

