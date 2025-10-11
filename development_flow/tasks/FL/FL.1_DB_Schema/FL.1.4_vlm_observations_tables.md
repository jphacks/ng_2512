# FL.1.4 DB — VLM Observations / Detection Entities

概要
- VLM（Vision-Language Model）の抽出結果を永続化する `vlm_observations` と `vlm_detection_entities` テーブルを追加し、再解析可能なキャッシュと監査ログを整備する。

依存
- FL.1.1（assets, image/face embeddings）
- docs/backend/flask-architecture.md （VLM パイプライン）
- docs/backend/flask-vector-arch.md

成果物
- `backend/db/schema.sql` への DDL（idempotent）
- `vlm_observations` / `vlm_detection_entities` テーブルとインデックス、更新トリガー
- `backend/db/README.md` 更新（スキーマ説明）

受け入れ条件
- `observation_id` を主キーとして、`asset_id`（任意）、`observation_hash`（UNIQUE）、`model_version`、候補 JSON を保持する。
- 観測レコードの `updated_at` は UPDATE 時に更新されるトリガーがある。
- `vlm_detection_entities` は `observation_id` を外部キーで参照し、`entity_type` / `payload` / `score` 等を JSON で保存し、`entity_hash` が一意制約（NULL 許容）を持つ。
- 代表インデックス（`asset_id`, `processed_at`, `entity_type` など）が作成され、再実行時の UPSERT/検索が高速に完了する。
- docs/README（backend/db/README.md）が更新され、テーブル概要と再適用手順が記載される。

手順(推奨)
1) docs/backend/flask-architecture.md の VLM セクションを確認し、保存すべきフィールドを整理。
2) `schema.sql` に idempotent な `CREATE TABLE IF NOT EXISTS` とインデックス、トリガー関数を追加。
3) `backend/db/README.md` に新セクションを追記し、再生成手順を確認。
4) `psql` でローカル適用し、再実行してもエラーにならないことを確認（推奨）。

参照
- docs/backend/flask-architecture.md
- docs/backend/flask-vector-arch.md
- development_flow/FL_FlaskAI.md (FL.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.1.4 DB — VLM Observations / Detection Entities

依頼文:
- VLM 推論結果を保存する `vlm_observations` と `vlm_detection_entities` の DDL を実装し、README を更新してください。再適用可能な idempotent スキーマとトリガー/インデックスを含めてください。

提出物:
- スキーマ差分、README 更新
- （任意）`psql` での適用ログ
