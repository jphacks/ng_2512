# Flask ベクトル検索アーキテクチャ

最終更新: 2025-09-02 (Asia/Tokyo)

本書は、Recall における画像/顔のベクトル埋め込みと検索を Flask + PostgreSQL (`pgvector`) で実現するための構成方針をまとめます。

注: 本プロジェクトの既定ポリシーは「AIは Flask サーバー上のローカルAIで実行」です。外部AIサービスは使用しません。

---

## 1. 全体像

コンポーネント
- Flask API: 同期 API（署名URL発行、検索実行）、非同期ジョブのトリガ
- Worker（RQ/Celery）: 画像ダウンロード → 前処理 → 埋め込み生成 → DB 永続化
- Object Storage（S3）: 画像原本の保存（非公開バケット, 短寿命署名URL）
- PostgreSQL + pgvector: 埋め込み格納と近傍探索（IVFFLAT/HNSW）
- CDN: クライアント配信用の公開 URL（サイズ/形式を変換）

データフロー
1) クライアントが写真をアップロード（署名URLを経由）
2) Worker が画像を取得し CLIP/ArcFace で埋め込み計算
3) `image_embeddings` / `face_embeddings` に保存しインデックス更新
4) クエリ要求（/ai/themes/suggest, /ai/people/match）に対して近傍検索と生成を実行

---

## 2. 埋め込みパイプライン

前処理
- 画像の長辺リサイズ（例: 1024px）・EXIF 方向補正
- 顔検出（ArcFace付属または RetinaFace）→ 顔領域クロップ

モデル
- CLIP: 画像→テキスト類似のため `ViT-B/32` 等
- ArcFace/MobileFaceNet: 顔特徴（512次元）

バージョニング
- `model` カラムでモデル名・バージョンを保持（例: `openclip_vitb32@2025-08`）
- 互換性が崩れる変更は再計算用ジョブを用意

---

## 3. 近傍探索

インデックス
- `image_embeddings`: `ivfflat (vector_l2_ops)`、`lists=100` からチューニング
- `face_embeddings`: `ivfflat (vector_ip_ops)`（内積/コサイン類似）

クエリ例
```sql
-- 画像類似（k=20）
SELECT asset_id, 1 - (embedding <=> $1) AS score
FROM image_embeddings
ORDER BY embedding <-> $1
LIMIT 20;
```

検索 API
- `POST /ai/themes/suggest`: 画像→テーマ候補（テキスト生成は chatgpt-oss-20b）
- `POST /ai/people/match`: 顔→ユーザ候補（同意ユーザのみ対象）
- `POST /ai/schedule/from_image`: VLM で予定/メンバー候補抽出（本書の追加節参照）

---

## 4. 非同期処理と再試行

- キュー: RQ/Celery（Redis/AMQP）
- 再試行ポリシ: 一時失敗は指数バックオフ（最大 5 回）
- 冪等性: `asset_id` をキーに再実行しても一貫した結果に（UPSERT）
- 可観測性: Job 成功/失敗を `audit_logs` に記録、メトリクスは Prometheus

---

## 5. セキュリティ/プライバシー

- 原本画像は非公開ストレージ、アクセスは短寿命署名URLのみ
- ベクトルは不可逆であっても個人情報につながるため、本人同意かつ開示最小限
- 個別削除: `asset_id` 指定で画像・埋め込み・キャッシュを一括削除
- 伝送経路は TLS、ジョブ間の参照は最小権限 IAM

---

## 6. パフォーマンス目標

- 類似画像検索: p95 ≤ 150ms（k=20, キャッシュヒット時 ≤ 50ms）
- 埋め込み計算: 1 枚 ≤ 300ms（GPU/ONNX 最適化を検討）
- インデックス更新: バルクで 1,000 件/分 を目安

---

## 7. 運用

- モデル更新時は Canary 配布（`model` を段階的切替）
- バックフィルはオフピーク実行、進捗と失敗率をダッシュボード化
- 監査対応: 顔データへのアクセスイベントを必ず記録

---

## 8. VLM スケジュール抽出拡張

- フロー: 画像アップロード → キュー（`ai`） → VLM 推論 → `vlm_observations` UPSERT → `/ai/schedule/from_image` レスポンス。
- 保存データ: `vlm_observations`（画像単位メタ情報）、`vlm_detection_entities`（日時・場所・メモ・顔などの細分化）、`vlm_links`（Firestore ドキュメントと紐付け）。
- 顔照合: VLM で検出した人物領域を `face_embeddings` と結びつけ、スコア+信頼度を返却。未登録の場合は匿名 ID を一時付与。
- オンライン/オフライン: 同期 API では既存観測を即返却。解析中は `observation-pending` を返し、ワーカー完了時に Firebase Functions へ通知。
- プロンプト: 予定抽出プロンプトと顔認識プロンプトを分離。予定は「日時/タイトル/場所/備考」を JSON 形式で取得、顔は bbox + 説明を返す。
- 監査: `observation_hash` で重複防止、`model_version` と推論時間を Prometheus へ記録。
