# FB.3.4 Cloud Functions — Signed URL (S3)

概要
- Journal 写真等のアップロード用に短寿命の署名URLを発行し、docs/features/journal.md と SEC.3 のポリシー（パス制約/TTL/SSE/メタデータ）に準拠させる。

依存
- SEC.3（ポリシー先行）

成果物
- functions: assets.getSignedUrl → {url, method, headers}
- バケット/IAM ポリシー例と `.env` の TTL 設定

受け入れ条件
- URL 寿命（PUT ≤90s, GET ≤5m）・対象バケット・`journal/<userId>/<yyyy>/<mm>/` プレフィックス制約が設定されている。
- `Content-Type` は `image/jpeg|image/png` のみ、`Content-Length` は 8 MiB 以下を検証する。
- `x-amz-meta-owner`, `x-amz-meta-origin` など監査メタデータと `x-amz-server-side-encryption=AES256` を強制。
- 最小権限の IAM を使用し、監査ログに userId, objectKey, ttl を出力する。

手順(推奨)
1) 署名生成ロジック（AWS SDK）と TTL/パス検証を実装。
2) Content-Type/サイズ制限/メタデータ付与、SSE 設定を組み込む。
3) 監査ログと失敗時のリトライ/ガベコレスケジュールを整備。

参照
- docs/features/journal.md
- development_flow/SEC_Security.md (SEC.3)
- development_flow/FB_Firebase.md (FB.3.4)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.4 Cloud Functions — Signed URL (S3)

依頼文:
- 短寿命の署名URLを発行する functions.assets.getSignedUrl を実装し、サイズ/Content-Type/パス制約と監査ログを追加してください。

提出物:
- 関数コード、設定、テスト、README（寿命/権限）
- テスト実行ログ（該当テストを実行した場合はログを添付）
