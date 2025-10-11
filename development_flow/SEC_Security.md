# Security / Privacy

最終更新: 2025-09-02

## SEC.1 ルール/ACLレビュー（Firebase）
- Firestore ルールの最小権限、メンバー限定、本人書込のみ等。

## SEC.2 API Key/HMAC（Flask /ai/*）
- RN→Flask の呼出に署名（timestamp, nonce, HMAC）。時計ずれ許容とリプレイ防止。

## SEC.3 画像/署名URL/データ保持（Policy）

目的
- Journal 等のユーザーアップロードを安全に扱うため、署名URLの利用方針とデータ保持/削除の運用を定義する。

基本方針
- 署名URLは短寿命・最小権限・限定公開（原本は非公開）。
- オブジェクトはユーザー/アプリのパス配下に限定し、鍵推測を防ぐランダムキーを採用。
- 不要データを最短で削除できるフロー（本人削除/退会/オーファン掃除）を整備。
- 監査可能性（だれが・いつ・どのキーへアップ/削除したか）を担保。

署名URLポリシー
- 寿命: PUT 用は 120 秒以内、GET 用は 10 分以内を上限（デフォルト: PUT=90s, GET=5m）。
- メソッド: アップロードは `PUT` 固定（`POST` フォームは使用しない）。
- バケット/パス制約: `s3://<BUCKET>/journal/<userId>/<yyyy>/<mm>/<key>` のようにユーザー毎のプレフィックスに限定。
- コンテンツ制約: `Content-Type` は `image/jpeg`|`image/png` のみ。`Content-Length` は 8 MiB 以下（デフォルト）。
- 暗号化: SSE-S3 以上を必須（必要に応じて KMS を指定）。
- メタデータ: `x-amz-meta-owner=<userId>`、`x-amz-meta-origin=mobile` 等を付与し追跡性を確保。

IAM/バケット設定（例）
- 関数ロール（署名生成/削除）
  - 許可: `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject`（GET 署名を出す場合）
  - リソース: `arn:aws:s3:::<BUCKET>/journal/*`
  - 条件: `s3:x-amz-server-side-encryption = AES256`
- バケットポリシー（抜粋）
```
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "DenyInsecureTransport", "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::<BUCKET>",
        "arn:aws:s3:::<BUCKET>/*"
      ],
      "Condition": {"Bool": {"aws:SecureTransport": "false"}}
    },
    { "Sid": "DenyPublicAcls", "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:PutBucketAcl", "s3:PutObjectAcl"],
      "Resource": [
        "arn:aws:s3:::<BUCKET>",
        "arn:aws:s3:::<BUCKET>/*"
      ]
    }
  ]
}
```

ライフサイクル/データ保持
- 原本（originals）: 既定 365 日保持。ただしユーザー削除要求で即時削除。
- サムネイル/派生物（thumbnails）: 原本に追従して削除。
- オーファン掃除: Firestore `assets` に参照が無いオブジェクトは 24 時間で自動削除。
- タグ運用: 一時領域には `Retention=temporary` を付与し、S3 ライフサイクルで 30 日自動削除。

削除フロー（本人/退会/通報）
1) RN: ユーザーが「削除」を実行 → Firestore `assets/{id}` を `deleted=true` に遷移。
2) Functions: `assets.deleted` トリガで S3 `DeleteObject` を実行、`deletedAt` を記録。
3) ガベコレ: 定期ジョブがオーファン/失敗を再試行（最大 7 日、指数バックオフ）。
4) 退会時: ユーザー配下の全 `journal/<userId>/*` をバッチ削除。

監査/ログ
- アップロード/削除のリクエストID, userId, objectKey, bytes を Cloud Logging へ出力。
- バケットは CloudTrail/S3 サーバアクセスログを別バケットに集約（PII は含めない）。

運用パラメータ（デフォルト）
- `SIGNED_URL_TTL_PUT_SEC=90`, `SIGNED_URL_TTL_GET_SEC=300`
- `MAX_IMAGE_SIZE_BYTES=8_388_608`（8 MiB）
- 許可MIME: `image/jpeg,image/png`

参考: 実装タスク FB.3.4（署名URL発行）は本ポリシーに準拠すること。

補足資料
- フロー図: development_flow/diagrams/sec3_flow.txt
- 設定例（IAM）: development_flow/examples/sec3_iam_policy.json
- 設定例（Bucket）: development_flow/examples/sec3_bucket_policy.json

## SEC.4 ログ/レート制限
- 機微情報マスキング。flask-limiter で429。
