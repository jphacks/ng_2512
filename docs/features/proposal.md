# F02: 提案（匿名・個人向け）

最終更新: 2025-09-02 (Asia/Tokyo)

> 本機能は、特定の相手（1名以上）に対して提案を送信するコア機能です。提案は合意が成立するまで**提案者を匿名**にして行われます。

---

## 1. 目的
- ユーザーが安心して気軽に他者を誘えるようにする。
- 「誰が誘ったか」ではなく「何をするか」に焦点を当てる。
- 合意形成の心理的ハードルを下げる。

---

## 2. 画面/UX（React Native）

### 2.1 画面構成
- `ProposalsListScreen`:
  - 受信した提案、自分が作成した提案（ペンディング/成立/不成立）を一覧表示。
  - タブ: `受信` / `送信済み`
- `ProposalDetailScreen`:
  - 提案の詳細（テーマ、場所、日時候補、締切）を表示。
  - リアクション（Like / Dislike）ボタンを配置。
  - 参加者のリアクション状況（匿名）を表示。

### 2.2 UX要件
- **提案作成**: ユーザーはUIを通じて提案を作成できます。具体的な作成画面は F13（ユーザー主導提案）の `ManualProposalScreen` として実装されます。
- **匿名性の担保**: 合意成立まで、誰が提案したかは表示されません。リアクションしたユーザーも匿名です。
- **ステータスの可視化**: 提案が `pending`（返信待ち）、`agreed`（成立）、`rejected`（不成立）、`canceled`（キャンセル済み）の状態かが明確にわかること。
- **シンプルな操作**: ユーザーは提案に対して `Like` か `Dislike` の2択で簡単に意思表示できる。

---

## 3. API / データ（Firebase）

提案は Firebase（Firestore/Functions）が権威です。HTTP エンドポイントは Cloud Functions（Callable/HTTP）として実装します。

- functions: `proposals.create`
  - Input: `{ audienceIds, title, theme, place, slots[], expiresAt }`
  - Effect: Firestore に `proposals/{proposalId}` を作成。`status='pending'`
- functions: `proposals.react`
  - Input: `{ proposalId, reaction: 'like'|'dislike' }`
  - Effect: `proposal_audiences` 相当のサブコレクション/フィールドを更新
- functions: `proposals.cancel`
  - Effect: `status='canceled'`
- functions: `proposals.status`
  - Output: 匿名集計の進捗

Firestore スキーマ（例）
```
proposals/{proposalId} {
  proposerId, title, theme, place,
  expiresAt, status, createdAt, updatedAt,
  audienceIds: [uid...]
}
proposals/{proposalId}/audiences/{userId} {
  reaction: 'like'|'dislike'|null,
  reactedAt
}
proposals/{proposalId}/slots/{slotId} {
  start, end
}
```

---

## 4. データモデル（Firebase 権威）
- 提案・受信者・スロットは Firestore ドキュメント/サブコレクションで表現。
- 旧SQLスキーマ（docs/backend/data-model.md）は AI サービスをサーバDBで実装する構成向け。現行構成では使用しません。

---

## 5. バリデーション
- `audience_ids`: 1名以上。自分自身を含めることはできません。ブロック関係のユーザーは含められません。
- `slots`: 1つ以上の日時候補が必要です。
- `expires_at`: 現在時刻より未来である必要があります。

---

## 6. セキュリティ/プライバシー
- レスポンスには提案者のIDを含めません（合意成立時を除く）。
- ユーザーは自分のフレンド（`friendships`、Firestore）にのみ提案を送信できます（ブロック関係は不可）。

---

## 7. 受け入れ基準（AC）
- ✅ 提案者は合意が成立するまで匿名である。
- ✅ 全ての受信者が `Like` すると、提案は `agreed` ステータスになる。
- ✅ 一人でも `Dislike` するか、締切までに全員が `Like` しなかった場合、提案は `rejected` ステータスになる。
- ✅ 提案者はペンディング中の提案をキャンセルできる。
