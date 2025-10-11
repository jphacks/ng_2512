# FL.2.3 Service — AI Service (CLIP/ArcFace + vLLM)

概要
- 画像特徴抽出と大規模言語モデル連携を提供するサービス層。

依存
- FL.2.1, FL.2.2, FL.5.1

成果物
- src/server/services/ai_service.py
- 設定: 温度/max_tokens/タイムアウト、モデルバージョン、プロンプトテンプレ
- モデル切替/ベンチスクリプト、プロンプト検証ノート

受け入れ条件
- F10/F11/F12（theme suggest, people match, AI proposal）の各ユースケースに対応し、docs/features/theme_generator.md / people_match.md / ai_proposal.md の入力出力形式を実装する。
- CLIP/ArcFace 推論失敗時のリトライ/フォールバック、vLLM 呼び出しのタイムアウト制御と温度/max_tokens 設定を提供。
- ベンチで p95 応答時間を記録し、メトリクス（推論時間/トークン数）をエクスポートする。
- オプトイン状態やフレンド制約などビジネスルールを組み込めるインターフェースを提供する。

手順(推奨)
1) CLIP/ArcFace 推論 I/F 実装（オプトイン/フレンド制約フィルタ込み）。
2) vLLM エンドポイント呼出/プロンプト設計（F10/F12向けテンプレ、温度/トップP）
3) ログ/メトリクス追加、ベンチスクリプトとエラーハンドリング整備。

参照
- docs/features/theme_generator.md
- docs/features/people_match.md
- docs/features/ai_proposal.md
- development_flow/FL_FlaskAI.md (FL.2.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.2.3 Service — AI Service (CLIP/ArcFace + vLLM)

依頼文:
- 画像特徴抽出と vLLM 呼び出しのサービス層を実装し、タイムアウト/リトライ/メトリクスを備えてください。

提出物:
- サービス実装、設定、単体テスト、メトリクス出力確認
- テスト実行ログ（該当テストを実行した場合はログを添付）