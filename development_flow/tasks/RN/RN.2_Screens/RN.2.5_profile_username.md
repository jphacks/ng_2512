# RN.2.5 Screen — Profile & Username Setup

概要
- サインイン直後にユーザー名（`username`）を登録・更新できるプロフィール体験を実装する。
- Firebase 上の `users/{uid}` ドキュメントに `username`, `displayName`, `photoUrl` を保存し、以後の画面で参照できるよう React Context / Hooks に組み込む。

依存
- RN.1.0（Firebase Auth）
- RN.1.1（User Profile モデル）
- RN.3.2（apiClient 共通化）

成果物
- `mobile/src/screens/settings/ProfileScreen.tsx` または既存 `SettingsScreen` 内のプロフィールセクション
- `mobile/src/hooks/useUserProfile.ts`（プロフィール取得/更新の React Query フック）
- `mobile/src/context/AuthContext` もしくは `SettingsContext` での username 露出

受け入れ条件
- 初回サインイン時に `users/{uid}` に `username` が存在しない場合、プロフィール編集画面へ遷移し入力を促す。保存完了後はメインタブへ戻る。
- `username` は 3〜24 文字、英数字と `_` のみ許可し、Firestore Cloud Function（FB 系タスク）で一意性を検証する。クライアント側でも簡易バリデーションと重複チェックを行う。
- プロフィール画面では表示名・写真 URL（任意）・自己紹介（任意）も編集可能。保存時にローディング／成功／エラー状態を表示し、React Query のキャッシュを更新する。
- 保存後、アプリ全体のヘッダー／提案一覧／メッセージに username が反映される。少なくとも Settings、ProposalsList、GroupChat の UI を更新する。
- プライバシーのため、入力中に自動保存は行わず「保存」操作時のみ書き込み、キャンセルで変更は破棄される。

手順(推奨)
1) `useUserProfile` フックを作成（Firebase Firestore ドキュメントを `onSnapshot` または React Query `get` で取得）
2) プロフィール画面を実装し、初期読み込み／ローディング／エラー／空状態を整備
3) `username` 入力バリデーション＋一意性チェック（Cloud Function 呼び出し）を実装
4) 保存後に Auth/Settings コンテキストへ反映し、タブ UI を更新
5) 初回サインインの遷移フローを `App.tsx` とナビゲーションに組み込む

参照
- docs/mobile/rn-structure.md
- docs/mobile/firebase-architecture.md
- docs/features/auth.md（プロフィール項）

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.5 Screen — Profile & Username Setup

依頼文:
- Firebase 上の `users/{uid}` に username を登録できるプロフィール画面を実装し、初回サインイン時に遷移するフローと React Query 連携を整えてください。

提出物:
- 画面／フック／ナビゲーション差分、動作確認メモ（初回遷移・保存・重複チェック）
- テスト実行ログ（該当テストを実行した場合はログを添付）
