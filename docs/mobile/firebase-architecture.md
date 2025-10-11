# Firebase サーバーアーキテクチャ（RN専用バックエンド）

最終更新: 2025-09-02 (Asia/Tokyo)

> React Native クライアントが利用する、Flask とは独立運用の Firebase サーバー構成。リアルタイム配信（メッセージ/Typing/Presence）や軽量ロジックを担い、ビジネス権威は Firebase に置きます（Flask は AI 専用）。

---

## 1. 目的と役割分担

- Firebase: 認証/業務データ/リアルタイム配信の権威（Firestore/Functions/Rules）
- Flask: AI 専用（pgvector参照＋chatgpt-oss-20b推論）
- 一貫性: 書き込みの権威は Firebase。Flask は embeddings/AI 結果に限る

---

## 2. コンポーネント

- Cloud Functions for Firebase（Node.js）
  - 同期/検証: RN からの Functions 呼び出しで ACL/整合チェック
  - ミラー更新: Flask からの webhook を受け Firestore を更新
- Firestore（推奨。RTDB でも可）
  - `groups/{groupId}` / `groupMembers/{groupId}_{userId}`
  - `groupMessages/{groupId}/messages/{messageId}`（購読用サブコレクション）
  - `presence/{userId}`（lastSeen/online/typing）
- Firebase Auth
  - サインイン: RN が Google Sign-In → `signInWithCredential`
  - UID: Firestore のユーザドキュメントと対応付け（`uid`）

---

## 3. データフロー

1) RN 認証
- RN で Google Sign-In → Firebase Auth に `signInWithCredential`

2) グループ/メッセージ同期
- 生成元: Firebase（アプリ業務データの権威）。Flask は関与しない。
- RN は `groupMessages/{groupId}/messages` を購読してリアルタイム受信

3) Presence/Typing
- RN が `presence/{userId}` に `online: true/false`, `lastSeen`, `typingIn: groupId|null` を書き込み
- セキュリティルールで本人のみ書込可、メンバーのみ読み取り可

---

## 4. セキュリティルール（概略）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function isGroupMember(groupId) { return exists(/databases/$(database)/documents/groupMembers/$(groupId + ':' + uid())); }

    match /groups/{groupId} {
      allow read: if isSignedIn() && isGroupMember(groupId);
      allow write: if false; // 書き込みは Functions 経由のみ
    }

    match /groupMessages/{groupId}/messages/{messageId} {
      allow read: if isSignedIn() && isGroupMember(groupId);
      allow write: if false; // 書き込みは Functions 経由のみ
    }

    match /groupMembers/{docId} {
      allow read: if isSignedIn() && resource.data.userIds.hasAny([uid()]);
      allow write: if false;
    }

    match /presence/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && userId == uid();
    }
  }
}
```

---

## 5. Flask AI 連携（例）

- RN は Firebase 経由で `asset_id` を管理。AI 機能が必要なときに Flask AI サービスの `/ai/*` を呼び出す。
- Flask は PostgreSQL/pgvector から埋め込みを取得して近傍検索/生成を行い、結果を返す。

---

## 6. 運用

- デプロイ: `firebase deploy --only functions,firestore:rules`
- Secrets: Functions から Flask へ検証用の共有鍵 or サービスアカウント JWT
- 監視: Cloud Logging、Error Reporting、メトリクス（購読レイテンシ）

---

## 7. RN 実装要点

- Firebase Auth セッションで Firestore/Functions を利用
- サブスクリプション: `groupMessages` への listener、`presence` の periodic 更新
- AI 呼び出し時のみ Flask /ai/* を利用（API Key/HMAC）
