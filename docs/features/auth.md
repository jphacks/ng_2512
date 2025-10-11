# F01: 認証 — Firebase Auth + Google Sign-In（Email/Apple廃止）

最終更新: 2025-09-01 (Asia/Tokyo)

> 本仕様では、認証方式を **Google Sign-In + Firebase Auth** に統一します。メールコード認証 / Apple Sign in は行いません。Flask（AIサービス）は認証を持ちません。

---

## 1. 目的（Purpose）
- ユーザ体験を単純化し、**ワンタップ**で安全なログインを提供。
- 提案者匿名のプロダクト原則を保ちつつ、モバイル間で安全にセッションを維持。

---

## 2. クイックスタート（クライアント）
- ライブラリ:
  - Google: `@react-native-google-signin/google-signin`
  - Firebase: `@react-native-firebase/auth` など
- 流れ（推奨）:
  1) `GoogleSignin.signIn()` で `idToken` を取得  
  2) Firebase Auth の `GoogleAuthProvider.credential(idToken)` を用いて `signInWithCredential`  
  3) RN は Firebase の `idToken` をヘッダに付けて Firebase Functions/Firestore を利用（Flask には渡さない）
  4) Flask の /ai/* を叩く必要がある場合は、API Key/HMAC など別途の軽量認証を用いる（詳細は backend/flask-architecture.md）

---

## 3. 状態遷移（Session State）
```
[signed_out] --google_sign_in--> [verifying] --ok--> [signed_in]
      ^                                  |             |
      |-------- logout ------------------+             +-- token_expired → refresh → [signed_in|signed_out]
```

- Firebase セッションは SDK が管理（自動更新）。
- 端末保存: 必要に応じて MMKV/Keychain を併用（自作トークンは不要）。

---

## 4. API（Firebase 側）
- 認証は Firebase Auth が提供。Flask 側に `/auth/*` は持たせない。
- RN は Firestore/Functions を Firebase Auth のセッションで利用する。

---

## 5. データモデル
- ユーザ・セッションは Firebase Auth/Firestore 側で管理。
- Flask（AI）はユーザデータを保持しない（必要なら user_id だけを受け取り、認可はAPIキー/HMAC等で別管理）。

---

## 6. セキュリティ要件（Firebase）
- Firebase Auth のルール/セキュリティを準拠。Firestore ルールで最小権限。
- 機微情報（idToken 等）をアプリログへ出力しない。

---

## 7. エラーと例外

| HTTP | 例                                   |
|------|--------------------------------------|
| 400  | id_token 不正（フォーマット等）       |
| 401  | 署名検証失敗 / aud 乖離 / exp 失効    |
| 409  | ユーザ作成競合（同時Upsert）          |
| 429  | リクエスト過多                        |
| 498  | Refresh 期限切れ                      |
| 499  | Refresh 再利用（セキュリティアラート） |

---

## 8. クライアント実装（RN, TypeScript）
- `GoogleSignin.configure({ webClientId: "<iOS/Androidそれぞれのclient_id>" })`
- `const { idToken } = await GoogleSignin.signIn();`
- `await auth().signInWithCredential(credentialFrom(idToken))`
- Firestore/Functions を直接利用。Flask /ai/* へは API Key/HMAC で呼び出す

---

## 9. テレメトリ / SLO
- `oauth_login_success/fail`, `token_refresh_ok/fail`
- SLO: ログイン成功率 ≥ 98%、refresh 失敗率 ≤ 1%
- アラート: 499（再利用）連発、署名検証エラー急増

---

## 10. 受け入れ基準（AC）
- ✅ Google サインインのみでログイン可能（Email/Apple 経路なし）
- ✅ Firebase Auth のセッションで Firestore/Functions を利用できる
- ✅ 機微情報がログに残らない

---

## 11. Codex / Copilot プロンプト
- 「RN: `@react-native-google-signin/google-signin` を用いて `idToken` を取得する `useGoogleAuth()` を実装」
- 「Flask: `POST /auth/oauth/google` で id_token を JWK 検証し、（oauth_provider, oauth_subject）でUpsert→JWT発行」
- 「Flask: Refresh ローテーションと再利用検知（rotated_from）の統合テストを作成」

---
