# RN.1.2 Auth — Sign Out Support

概要
- Firebase Auth のセッションをユーザー操作で終了できるよう、サインアウト UI とフローを実装する。

依存
- RN.1.0（Firebase Auth）
- RN.2.6（Settings 画面ベース）

成果物
- `mobile/src/screens/settings/SettingsScreen.tsx`
- `mobile/src/i18n/translations.ts`
- 必要に応じて関連サービス/フックの更新

受け入れ条件
- サインイン済みの状態で設定画面に「サインアウト」操作が表示され、タップすると確認ダイアログが出る。
- 確認後に Firebase Auth のセッションがクリアされ、`useAuth` が `user: null` を示す。
- サインアウト中はボタンがローディング表示になり、多重操作を防ぐ。
- エラーが発生した場合はローカライズされたメッセージが表示される。

手順(推奨)
1) `useAuth` の `signOut` を呼び出すハンドラとローディング/エラー state を設定画面に追加。
2) i18n にサインアウト関連の文言を追加（英語/日本語）。
3) Alert もしくは confirm ダイアログでユーザーに確認し、Web/ネイティブ両対応の実装にする。
4) 動作確認（サインイン→サインアウト→再サインイン）とログ記録。

参照
- docs/features/auth.md
- mobile/src/hooks/useAuth.tsx

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.1.2 Auth — Sign Out Support

依頼文:
- 設定画面に Firebase Auth のサインアウト機能を追加し、ローディング・エラー表示と確認ダイアログを含めて実装してください。

提出物:
- 画面/i18n/フックの差分、動作確認メモ（サインイン→サインアウト）
- テスト実行ログ（該当テストを実行した場合はログを添付）
