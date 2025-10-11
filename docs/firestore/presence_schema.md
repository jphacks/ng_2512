# Presence — Firestore Schema (FB.1.3)

最終更新: 2025-09-04 (Asia/Tokyo)

概要
- ユーザーのオンライン状態・最終閲覧・タイピング中グループを表現します。React Native クライアントが定期更新し、UI に反映します。

コレクション
- `presence/{userId}`

フィールド
- `online: boolean` — 現在オンラインかのフラグ。
- `lastSeen: timestamp` — 最終アクティブ時刻。フォアグラウンド→バックグラウンド/切断時に更新。
- `typingIn: string|null` — タイピング中の `groupId`。入力していないときは `null`。

推奨運用
- クライアントがアプリ起動時/フォアグラウンド時に `online: true` と `lastSeen` を定期更新（e.g. 30〜60秒）。
- バックグラウンド/終了時に `online: false` と `lastSeen: now()` を書き込み。
- 画面遷移でチャットに入ったら `typingIn: groupId`、離脱で `typingIn: null`。
- 余分な TTL は不要（単一ドキュメントで履歴を持たないため）。`typingIn` の自動クリアはクライアントのライフサイクルで行うか、関数で補助（任意）。

インデックス
- 追加インデックス不要。

セキュリティルール（要約）
```
match /presence/{userId} {
  allow read: if isSignedIn();
  allow create, update: if isSignedIn() && request.auth.uid == userId &&
    request.resource.data.keys().hasOnly(['online','lastSeen','typingIn']) &&
    (request.resource.data.online == null || request.resource.data.online is bool) &&
    (request.resource.data.lastSeen == null || request.resource.data.lastSeen is timestamp) &&
    (request.resource.data.typingIn == null || request.resource.data.typingIn is string);
  allow delete: if isSignedIn() && request.auth.uid == userId;
}
```

エミュレータ検証
- `npm run fb:verify` に presence のテストを追加済み。ログは `development_flow/logs/fb13_presence_test.log` を参照。

