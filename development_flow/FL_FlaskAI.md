# FL: Flask AIサービス（/ai/* + pgvector + chatgpt-oss-20b）

最終更新: 2025-09-26

## FL.1 DB スキーマ（pgvector）
- FL.1.1 assets, image_embeddings, face_embeddings
  - 目的: 画像/顔の埋め込み永続化。
  - 受け入れ: インデックス作成（ivfflat）、k近傍が p95 ≤ 150ms。
- FL.1.2 theme_vocab, theme_embeddings, theme_suggestions
  - 目的: テーマ語彙・埋め込みとサジェストログ。
  - 受け入れ: 語彙 active 切替、モデル切替（バックフィル）対応。
- FL.1.3 journal_entries, journal_entry_tags
  - 目的: ジャーナル本体・タグと AI 補助導線。
- FL.1.4 vlm_observations, vlm_detection_entities
  - 目的: VLM による予定/メンバー抽出結果とベクトル参照を冪等保存。
  - 受け入れ: `observation_hash` による重複防止、bbox/score/モデルバージョンを保持。

## FL.2 Repository/Service 層
- FL.2.1 embedding_repo
  - 機能: 画像/顔の近傍検索（距離/スコア）、条件（フレンド内）絞込。
- FL.2.2 asset_repo
  - 機能: asset_id→S3 key 解決、前処理の入力取得。
- FL.2.3 ai_service
  - 機能: CLIP/ArcFace 推論、vLLM(chatgpt-oss-20b) 連携（タイトル/本文生成）。
  - 受け入れ: タイムアウト/リトライ、温度/max_tokensを設定で制御。
- FL.2.4 journal_entry_repo
  - 機能: Journal CRUD + AIドラフト生成トリガの補助。
- FL.2.5 vlm_schedule_service
  - 機能: 画像→VLM推論→予定テキスト抽出→顔照合→`vlm_observations` 永続化。
  - 受け入れ: Florence-2 等の VLM 推論、顔ベクトルスコア付与、再実行時の冪等更新。

## FL.3 API 実装（/ai/*）
- FL.3.1 POST /ai/themes/suggest
  - 入力: asset_id, hints[], top_k
  - 出力: themes[]（生成）
- FL.3.2 POST /ai/people/match（フレンド内）
  - 入力: asset_id, top_k
  - 出力: matched_faces[{box, candidates[{user_id, score}]}]
- FL.3.3 POST /ai/proposal_drafts（F12 自動提案 I/F）
  - 入力: asset_id, tagged_user_ids, journal_context（撮影日時/メモなど）
  - 出力: proposal_draft（title/body/slots/audience候補, source='ai', confidence, expiresAt）
  - 役割: Firebase 側が `status='draft'` で保存し、F06 通知→ `approve_and_send` を呼び出すための I/F。
- FL.3.4 /journal_entries（F14 CRUD + create_proposal）
- FL.3.5 POST /ai/schedule/from_image（VLM予定抽出）
  - 入力: asset_id or signedUrl, options（forceRefresh 等）
  - 出力: scheduleCandidates[], memberCandidates[], notes[], observationId
  - 受け入れ: 冪等性、VLM失敗時のフォールバック（部分結果）、監査ログ出力。

## FL.4 非同期（任意）
- 再計算ジョブ（モデル更新/バックフィル）、失敗時DLQ、冪等UPSERT。
- VLM バッチ解析: 夜間に未解析アセットを取得し `vlm_schedule_service` を流す。

## FL.5 運用
- FL.5.1 vLLM 起動/監視（GPU推奨、量子化）
- FL.5.2 Gunicorn+systemd / Caddy/Nginx（TLS）
- ヘルス: /healthz /readyz /version、メトリクス（推論時間）

## 参照ドキュメント
- docs/backend/flask-architecture.md（VLM 実装ガイド追加）
- docs/backend/flask-vector-arch.md
- docs/backend/vllm-management.md
