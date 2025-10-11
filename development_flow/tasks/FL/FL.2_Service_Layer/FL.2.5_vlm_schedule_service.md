# FL.2.5 Service — VLM Schedule Extraction

概要
- 画像から予定テキストと参加候補を抽出するサービス層を実装し、既存の埋め込み検索と統合します。VLM（Vision-Language Model）による OCR + 意味解析 + 顔照合を統合。

依存
- docs/backend/flask-architecture.md（VLM 実装）
- docs/backend/flask-vector-arch.md（埋め込み/照合）
- FL.2.1, FL.2.2, FL.2.3（既存サービス）

成果物
- `vlm_schedule_service.py`（想定）: 画像入力 → VLM 推論 → 抽出結果の永続化。
- フェイスマッチングとスケジュール抽出ロジックのユニットテスト。

受け入れ条件
- 署名 URL から画像を取得し、VLM（例: Florence-2 / Llava-NeXT 等）で予定テキスト・日付・場所を抽出。
- 検出された人物を `face_embeddings` と照合し、スコア上位を候補として返す。
- 抽出結果を `vlm_observations` 系テーブルに保存し、再実行時は冪等更新。
- 生成されたスケジュール情報を AI 提案ドラフト（FL.3.3）と共有できるよう DTO を定義。
- 推論タイムアウト・モデルエラー時のフォールバック（部分結果保存/リトライ）を設計。

手順(推奨)
1) docs の VLM パイプラインを読み、モデル入出力フォーマットを決める。
2) 画像取得 → 前処理（リサイズ/顔検出）→ VLM 推論 → 構造化データ化のステップを実装。
3) 近傍検索・pgvector を活用し顔候補を添付、結果を永続化。
4) 単体テストで代表ケース（予定あり/文字のみ/顔のみ/失敗）をカバー。

参照
- docs/backend/flask-architecture.md
- docs/backend/flask-vector-arch.md
- development_flow/FL_FlaskAI.md (FL.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.2.5 Service — VLM Schedule Extraction

依頼文:
- 画像を入力に予定テキストとメンバー候補を返す `vlm_schedule_service` を実装し、pgvector/顔マッチと永続化を統合してください。

提出物:
- サービス実装、関連ユニットテスト
- 実行ログ（主要ケースをテストした証跡）
