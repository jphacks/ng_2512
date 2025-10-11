# API 仕様（v0）

最終更新: 2025-09-02 (Asia/Tokyo)

本ドキュメントは Recall のモバイルクライアント（React Native）から利用する HTTP API の暫定仕様です。機能別の詳細は `docs/features/` を参照してください。

サービス分割（このデプロイプロファイル）
- Flask（個人サーバ）: AI マイクロサービス。Section 8（AI 支援）のみを提供し、DB のベクトル/アセット参照を用いてローカルAIを実行します。
- Firebase（独立）: 認証/提案/グループ/フレンド/通知設定など、その他のセクションを提供します。
- 本書には全体のAPIを網羅しますが、Flask がホストするのは Section 8 のみです。

---

## 0. 基本

- ベースURL: `https://api.recall.example.com`（開発時は `.env` で上書き）
- 認可方式: Bearer JWT（`Authorization: Bearer <access>`）
- コンテンツタイプ: `application/json; charset=utf-8`
- 時刻表現: ISO8601（UTC, `YYYY-MM-DDTHH:MM:SSZ`）
- 冪等性キー: 重要な POST は `Idempotency-Key` ヘッダを推奨
- ページネーション: `?cursor=<opaque>&limit=50`（次ページはレスポンスの `next_cursor`）
- エラーフォーマット:
```json
{ "error": { "code": "{kebab-case}", "message": "human readable", "details": {"...": "..."} } }
```

---

## 1. 認証（F01）

### POST /auth/oauth/google（Firebase 側実装想定）
Google の `id_token` を検証し、アプリ用トークンを発行します。
Request
```json
{ "id_token": "eyJhbGciOi..." }
```
Response
```json
{
  "access": "<jwt>",
  "refresh": "<jwt>",
  "user": { "id": 123, "display_name": "Taro", "email": "taro@example.com", "photo_url": "..." },
  "firebase_custom_token": "<firebase-custom-token>"
}
```

### POST /auth/refresh
```json
{ "refresh": "<jwt>" }
```
Response: `{ "access": "<jwt>", "refresh": "<jwt>" }`

### POST /auth/logout
Refresh を失効させます。204 No Content。

### GET /me
現在のユーザ情報を返却します。

### POST /me/devices（Firebase 側実装想定）
Push 通知トークンを登録します。
Request
```json
{ "platform": "ios|android", "token": "fcm-or-apns-token", "locale": "ja-JP" }
```
Response: 201 Created。

### POST /me/firebase_token（Firebase 側実装想定）
Firebase 認証用の Custom Token を発行します（RN が Firebase へサインインする用途）。
Response
```json
{ "firebase_custom_token": "<token>" }
```

---

## 2. 連絡先・ブロック（F07/F08）［Firebase 側実装想定］

### POST /contacts/import
端末やSNSから取り込んだ候補を一括登録します（サーバ側でハッシュ化・照合）。
```json
{ "entries": [ {"display_name":"A","email":"a@example.com"}, {"phone":"+81..."} ] }
```
Response: `{ "imported": 124, "matched_users": [ {"user_id": 42}, ... ] }`

### GET /contacts
自身の連絡先一覧（アプリ内と突合済）を返します。

### POST /contacts/{user_id}/block
対象ユーザをブロックします（提案不可・相互不可視）。204。

### DELETE /contacts/{user_id}/block
ブロック解除。204。

### フレンド（相互承認）

#### POST /friends/requests
フレンド申請を作成します。
Request
```json
{ "addressee_id": 456, "message": "よろしく！" }
```
Response: `201` と `{"request_id": 123, "status": "pending"}`

制約
- 自分自身は不可、ブロック関係は不可（403/409）
- 同一ペアの未処理（pending）申請が存在する場合は 409（重複）

#### GET /friends/requests?direction=incoming|outgoing&status=pending
フレンド申請の一覧を取得します（デフォルトは `incoming` かつ `pending`）。
Response
```json
{
  "items": [
    {"id": 123, "requester_id": 42, "addressee_id": 99, "status": "pending", "message": "よろしく", "created_at": "..."}
  ],
  "next_cursor": null
}
```

#### POST /friends/requests/{id}/accept
受信した申請を承認します。トランザクションで `friendships` を作成し、申請は `accepted` に。
Response: `204`

#### POST /friends/requests/{id}/decline
受信した申請を却下します。`declined` に遷移。Response: `204`

#### POST /friends/requests/{id}/cancel
送信者が未処理の申請を取り消します。`canceled` に遷移。Response: `204`

#### GET /friends
確定したフレンド一覧を返します。
Response
```json
{
  "items": [ {"user_id": 42, "display_name": "Taro", "since": "..."} ],
  "next_cursor": null
}
```

#### DELETE /friends/{user_id}
指定ユーザとのフレンド関係を解除します（対称に1件削除）。Response: `204`

---

## 3. 提案・合意（F02/F03/F13）［Firebase 側実装想定］

詳細仕様は `docs/features/proposal.md` を参照。

### POST /proposals
新規提案の作成。
```json
{
  "audience_ids": [123, 456],
  "title": "週末ボドゲ",
  "theme": "新作を一緒に遊びませんか？",
  "place": "新宿",
  "slots": [ {"start":"2025-09-13T14:00:00Z","end":"2025-09-13T18:00:00Z"} ],
  "expires_at": "2025-09-11T23:59:59Z"
}
```
Response: `201` と `{"id": 987, "status":"pending"}`

制約
- `audience_ids` は作成ユーザのフレンドに限定（`friendships` に存在）。ブロック関係は不可。

### GET /proposals
関与している提案（受信/送信）一覧。

### GET /proposals/{id}
提案詳細（匿名で必要情報のみ）。

### POST /proposals/{id}/reaction
```json
{ "reaction": "like" } // or "dislike"
```
Response: `{"status":"pending|agreed|rejected"}`

### GET /proposals/{id}/status
合意進捗（匿名集計）を返します。

### POST /proposals/{id}/cancel
提案者によるキャンセル。204。

---

## 4. グループ・チャット（F04）［Firebase 側実装想定］

合意成立した提案から自動でグループが生成されます。
参加者は作成者のフレンドに限定されます。

### GET /groups
自身が所属するグループ一覧。

### GET /groups/{id}
グループ詳細（メンバー、最終活動時刻など）。

### GET /groups/{id}/messages?cursor&limit
メッセージを降順でページング取得します。
Response
```json
{
  "items": [
    {"id":1, "sender_id":123, "kind":"text", "text":"こんにちは", "created_at":"..."}
  ],
  "next_cursor": null
}
```

### POST /groups/{id}/messages
```json
{ "kind": "text", "text": "集合場所どうする？" }
```
Response: `201` と作成メッセージ。

---

## 5. 日程調整（F05）［Firebase 側実装想定］

### GET /proposals/{id}/slots
日時候補の一覧を返却。

### POST /proposals/{id}/slots/vote
```json
{ "votes": [ {"slot_id": 1, "value": "ok|maybe|ng"} ] }
```

### POST /groups/{id}/schedule/confirm
投票を集計し、確定日時を設定（Botが確定通知）。
```json
{ "slot_id": 1 }
```

---

## 6. 通知（F06）［Firebase 側実装想定］

### GET /notifications/preferences
通知設定の取得。

### PUT /notifications/preferences
```json
{ "proposal": true, "group": true, "reminder": true, "friend": true }
```

---

## 7. ジャーナル/写真（F14）［Firebase 側実装想定：署名URL発行/メタ管理。Flask は embeddings 参照のみ］

### POST /journal/photos
署名付きURLを発行し、S3 へ直接アップロードする方式を推奨。
Request
```json
{ "content_type": "image/jpeg" }
```
Response
```json
{ "upload_url": "https://s3/...", "asset_url": "https://cdn/...", "asset_id": "ulid" }
```

### GET /journal/photos
自身の投稿一覧。

---

## 8. AI 支援（F10–F12）［Flask 提供］

本プロジェクトの AI 推論は「Flask サーバー上のローカルAI」（自前ホスティング）として実行します。外部AIサービスへの呼び出しは行いません。

モデル実行
- 画像/顔: PyTorch/ONNX Runtime（CPU/GPU）
- 文章生成: chatgpt-oss-20b ローカルモデル（推奨: vLLM / 代替: llama.cpp 互換ビルドがある場合）
- 非同期: Celery/RQ ワーカーで重い処理を実行

### POST /ai/themes/suggest
アップロード済みの画像（`asset_id`）やテキストヒントから、遊びのテーマ候補を生成します。
ヘッダ
- `X-Api-Key`: 発行済みクライアントキー（例: `.env: AI_API_KEY`）
- `X-Timestamp`: エポック秒（±300s の時計ずれを許容）
- `X-Nonce`: リプレイ防止用の一意値
- `X-Signature`: HMAC-SHA256（カノニカル文字列: `METHOD\nPATH\nTIMESTAMP\nNONCE\nSHA256(body)` を `AI_API_SECRET` で署名した16進文字列）

Request
```json
{ "asset_id": "ulid", "hints": ["最近の話題"], "top_k": 5 }
```
Response
```json
{ "themes": ["ボドゲ会", "近況ランチ", "映画ナイト"] }
```

エラー
- 401 `unauthorized`: 認証ヘッダ不足/時刻不正/リプレイ
- 403 `forbidden`: API Key 不正 / 署名不一致
- 422 `invalid-argument`: 入力不備（`asset_id` か `hints` のいずれか必須、`top_k` 範囲外など）
- 429 `rate-limit`: レート超過（`X-RateLimit-*` 付与）

### POST /ai/people/match（フレンド内）
画像内の顔を検出し、リクエストユーザのフレンドの中から、オプトイン済みユーザの顔ベクトルと照合して候補を返します。
Request
```json
{ "asset_id": "ulid", "top_k": 3 }
```
Response
```json
{
  "matched_faces": [
    {
      "box": [100,120,50,50],
      "candidates": [ {"user_id": 42, "display_name": "Taro", "score": 0.91} ]
    }
  ]
}
```

### POST /ai/proposals/auto（任意）
画像や最近の投稿から、提案ドラフト（タイトル/本文/候補日時/宛先候補）を生成します。
Request
```json
{ "asset_id": "ulid", "hints": ["近況"], "audience_hints": [42,77], "max_audience": 3 }
```
Response
```json
{
  "draft": {
    "title": "近況ランチ 行きませんか？",
    "message": "軽く近況ランチどう？",
    "place": "近くのカフェ",
    "slots": [ {"start": "2025-09-13T11:00:00Z", "end": "2025-09-13T13:00:00Z"} ],
    "audience_suggestions": [42,77],
    "status": "draft"
  },
  "moderation": { "flagged": false, "blocked_terms": [] }
}
```

エラー
- 401/403/429 は `/ai/themes/suggest` と同様
- 422 `invalid-argument`: `asset_id` か `hints` のいずれか必須、`audience_hints` は整数配列、`max_audience` 範囲外

### POST /ai/schedule/from_image
画像内のホワイトボードやカレンダー、集合写真から予定と参加候補を抽出します。VLM（Vision-Language Model）と顔照合を組み合わせています。

ヘッダ
- 認証は `/ai/themes/suggest` と同様に HMAC。

Request
```json
{
  "asset_id": "ulid",            // 既存アセットから解析する場合
  "signed_url": "https://...",    // 任意: 直接URL解析。asset_id と併用不可
  "options": {
    "force_refresh": false,        // 既存観測がある場合でも再解析する
    "include_faces": true          // 顔照合を有効化（既定 true）
  }
}
```

Response
```json
{
  "observation_id": "obs_01H9...",
  "asset_id": "ulid",
  "schedule_candidates": [
    {
      "title": "週末ボードゲーム会",
      "start": "2025-09-14T05:00:00Z",
      "end": "2025-09-14T09:00:00Z",
      "location": "渋谷カフェ",
      "confidence": 0.82
    }
  ],
  "member_candidates": [
    {"user_id": "uid_42", "display_name": "Taro", "score": 0.91},
    {"face_embedding_id": "face_4f2", "score": 0.73}
  ],
  "notes": ["Bring board games", "RSVP by Sep 10"],
  "processed_at": "2025-09-10T02:10:15Z",
  "model_version": "florence-2@2025-08"
}
```

挙動
1. `asset_id` から S3 の原本を取得（または `signed_url` を利用）
2. 画像前処理 → VLM 推論（予定/メモ抽出）
3. 顔領域を切り出して `face_embeddings` と照合しスコア付け
4. `vlm_observations` に保存し、既存結果があれば再利用

エラー
- 400 `invalid-argument`: `asset_id` と `signed_url` の同時指定、いずれも欠落
- 401/403/429: `/ai/themes/suggest` と同様
- 404 `asset-not-found`: 指定アセットが存在しない
- 409 `observation-pending`: バックグラウンドで解析中（Polling or Webhook 待ち）
- 500 `vlm-failure`: モデルエラー（`details.retryable` を付与）

補助エンドポイント
- `POST /users/me/face_embedding`：基準顔の登録（オプトイン時）。`multipart/form-data` 画像→サーバで埋め込み生成・保存
- `GET /ai/models`：稼働中モデルの情報を返す（デバッグ/可観測性）

---

## 9. 共通メタ / 健康診断

### GET /healthz
Liveness。

### GET /readyz
DB, キュー, ベクトル検索の疎通確認。

### GET /version
リリース識別子（Git SHA 等）。

---

## 10. レート制限・セキュリティ

- レート制限: `X-RateLimit-*` を返却。超過時 429。
- 署名付きURLは短寿命。画像は原則非公開バケット。
- 提案者・リアクションは合意成立まで匿名化（レスポンスに含めない）。
- 監査ログ: 認証・提案作成・確定操作に監査イベントを記録。

---

## 11. 変更履歴

- v0 初版作成（Auth/Proposal/Group/Schedule/AI を定義）。
