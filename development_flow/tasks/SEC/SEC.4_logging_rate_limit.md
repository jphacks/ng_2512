# SEC.4 Controls — Logging/Rate Limit

概要
- 機微情報のマスキング/監査ログと API レート制限を実装。

依存
- FL.3.*

成果物
- ロガー設定、flask-limiter 設定、除外/閾値

受け入れ条件
- PII をログへ出さず、docs/features/notification.md / ai_proposal.md で触れられているデータをマスキング。
- 429 が期待通り動作し、/ai/* の HMAC 署名/API 呼び出しに対してレート制限を提供する。
- ログに requestId, userId, latency を記録し、監査証跡を保持する。

手順(推奨)
1) ロギング方針/マスキング
2) レート制限ルール/例外

参照
- docs/features/notification.md
- docs/features/ai_proposal.md
- development_flow/SEC_Security.md (SEC.4)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: SEC.4 Controls — Logging/Rate Limit

依頼文:
- ロギングのマスキング/監査と flask-limiter のレート制限を導入し、PII がログに出ないこと、429 が期待通り動作することを確認してください。

提出物:
- 設定差分、テスト、確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）