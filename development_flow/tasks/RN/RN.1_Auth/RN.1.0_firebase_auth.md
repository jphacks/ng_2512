# RN.1.0 Auth — Firebase Auth (Google)

概要
- Google 認証→Firebase Auth 連携とエラーハンドリング実装。

依存
- FB.4.0

成果物
- `mobile/src/screens/auth/SignInScreen.tsx`
- `mobile/src/hooks/useAuth.tsx`

受け入れ条件
- 成功/失敗/キャンセルのUXが docs/features/auth.md の要件どおり実装される。
- セッション維持/再サインイン動作、メール未検証/ブロック状態の処理をカバーする。
- 取得したプロフィール（displayName/photoURL）を Firestore に初期保存し、利用規約同意のチェックを行う。

手順(推奨)
1) Expo Google Auth 設定（web/ios/android の clientId）
2) `signInWithCredential` 実装とエラー分類（キャンセル／ネットワーク／ブロック）
3) サインイン完了後に RN.1.1 の初期化ハンドラを呼び出し、`AuthProvider` でセッションを公開

参照
- docs/features/auth.md
- development_flow/RN_ReactNative.md (RN.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.1.0 Auth — Firebase Auth (Google)

依頼文:
- Google 認証→Firebase Auth を実装し、成功/失敗/キャンセルのUXとセッション維持を確認してください。

提出物:
- 画面/フック差分、設定、動作確認メモ
- テスト実行ログ（該当テストを実行した場合はログを添付）
