# RN.1.1 Auth — User Profile Bootstrap

概要
- Firebase Auth でサインインした直後に Firestore の `users/{uid}` ドキュメントを初期化し、username などアプリ固有のプロフィール情報を格納できる基盤を整える。

依存
- RN.1.0（Firebase Auth）
- docs/firestore/README.md（users コレクション方針）

成果物
- `mobile/src/hooks/useAuth.tsx` のサインイン後ハンドラ
- `mobile/src/services/profile.ts`（Firestore 読み書きラッパー）
- 初期化 Cloud Function 呼び出し（`functions` パッケージの `users_initProfile`）

受け入れ条件
- サインイン成功時に `users/{uid}` ドキュメントが存在しない場合、Cloud Function `users_initProfile` を呼び出して `username: null`, `displayName`, `photoUrl`, `createdAt` を作成する。
- 以後のアプリ起動では React Query/Context から `users/{uid}` を購読し、`username` が null かどうかで RN.2.5 へ誘導できるよう state を保持する。
- エラー時はユーザーへリトライ導線を提示し、`useAuth` が失敗内容を surface する。
- プロフィール情報は SecureStore などにキャッシュせず、Firebase Auth の状態変化に合わせて再取得する。

手順(推奨)
1) `users_initProfile` callable の呼び出しラッパーを `services/profile.ts` に実装
2) `useAuth` のサインイン完了時に初期化処理を挿入し、結果を Context に保存
3) React Query で `users/{uid}` を subscribe/read する `useUserProfile` 基盤を整備（RN.2.5 で再利用）

参照
- docs/mobile/firebase-architecture.md
- docs/features/auth.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.1.1 Auth — User Profile Bootstrap

依頼文:
- サインイン後に `users/{uid}` ドキュメントを初期化する仕組みと React Query から参照できる `useUserProfile` 基盤を整えてください。

提出物:
- フック/サービス差分、動作確認メモ（初回サインイン→ユーザードキュメント作成）
- テスト実行ログ（該当テストを実行した場合はログを添付）
