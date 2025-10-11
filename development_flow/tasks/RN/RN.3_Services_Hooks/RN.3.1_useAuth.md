# RN.3.1 Hook — useAuth

概要
- Firebase Auth の状態管理とフック提供。

依存
- RN.1.0

成果物
- src/hooks/useAuth.ts

受け入れ条件
- auth 状態とユーザ情報を安定提供し、docs/features/auth.md のステータス（未ログイン/ログイン中/再認証要求）を扱う。
- unsubscribe 漏れなし、エラーやメール未検証状態のハンドリングを提供。

手順(推奨)
1) onAuthStateChanged をラップ
2) Provider/Context 実装

参照
- docs/features/auth.md
- development_flow/RN_ReactNative.md (RN.3.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.3.1 Hook — useAuth

依頼文:
- Firebase Auth の状態を提供するフックと Provider を実装し、unsubscribe 漏れが無いことをテストしてください。

提出物:
- フック実装、単体テスト
- テスト実行ログ（該当テストを実行した場合はログを添付）