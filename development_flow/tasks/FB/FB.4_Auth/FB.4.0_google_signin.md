# FB.4.0 Auth — Google Sign-In Integration

概要
- Google Sign-In → Firebase Auth（signInWithCredential）を統合。

依存
- なし（Auth契約先行。RN.1.0 は利用側）

成果物
- RN 側の Google 認証フロー、バックエンド側の UID 信頼基盤

受け入れ条件
- 新規/既存ユーザで正しくログイン
- エラー/キャンセルを正しく処理

手順(推奨)
1) Expo/Google Auth 設定
2) ID トークン→Firebase Credential 交換
3) ユーザ初期化（プロフィール最低限）

参照
- docs/features/auth.md
- development_flow/RN_ReactNative.md (RN.1)
- development_flow/FB_Firebase.md (FB.4)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.4.0 Auth — Google Sign-In Integration

依頼文:
- Expo/Google Auth → Firebase Auth（signInWithCredential）の認証フローを実装し、成功/失敗/キャンセルのUXと初期プロフィール作成まで整備してください。

提出物:
- RN 実装差分、設定、動作確認メモ
- テスト実行ログ（該当テストを実行した場合はログを添付）
