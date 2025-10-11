# RN.3.2 Service — apiClient (HMAC)

概要
- Flask /ai/* を呼び出す HMAC 署名付きクライアント。

依存
- SEC.2, FL.3.*

成果物
- src/services/apiClient.ts, 署名ユーティリティ

受け入れ条件
- timestamp/nonce/HMAC を検証可能、リプレイ防止（SEC.2 署名仕様に準拠）。
参照
- docs/features/theme_generator.md / people_match.md / ai_proposal.md で定義されたエンドポイントのレスポンス型を網羅し、型安全に扱う。
- レート制限/タイムアウト/リトライ方針を実装し、監査ログ（requestId, latency）を出力する。

手順(推奨)
1) 署名フォーマット策定
2) リトライ/タイムアウト
3) 型安全なレスポンス

- docs/features/theme_generator.md
- docs/features/people_match.md
- docs/features/ai_proposal.md
- development_flow/SEC_Security.md (SEC.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.3.2 Service — apiClient (HMAC)

依頼文:
- HMAC 署名付き apiClient を実装し、timestamp/nonce/HMAC 検証に通ること、リトライ/タイムアウト/型付けを備えてください。

提出物:
- 実装差分、単体テスト
- テスト実行ログ（該当テストを実行した場合はログを添付）