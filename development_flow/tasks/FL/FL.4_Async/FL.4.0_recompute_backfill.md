# FL.4.0 Async — Recompute/Backfill Jobs

概要
- モデル更新時の再計算/バックフィルの非同期ジョブ整備。

依存
- docs/backend/flask-vector-arch.md（埋め込み/索引仕様）
- FL.2.*

成果物
- バッチ/キュー実装、DLQ、冪等UPSERT

受け入れ条件
- 失敗時の再実行/重複防止（ジョブIDによる冪等性、DLQ）。
- モデル更新/語彙更新/顔埋め込み再計算の各シナリオに対応し、docs/features/theme_generator.md / people_match.md / ai_proposal.md の運用要件を満たす。
- 進捗/メトリクスを記録し、再処理対象（asset/theme/user）のバッチ範囲を制御できる。

手順(推奨)
1) ジョブ仕様/キュー選定
2) バッチ実装/運用スクリプト

参照
- docs/features/theme_generator.md
- docs/features/people_match.md
- docs/features/ai_proposal.md
- development_flow/FL_FlaskAI.md (FL.4)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.4.0 Async — Recompute/Backfill Jobs

依頼文:
- モデル更新時の再計算ジョブを設計/実装し、冪等UPSERTとDLQ/再試行制御を備えてください。

提出物:
- バッチ/キュー実装、運用手順、テスト
- テスト実行ログ（該当テストを実行した場合はログを添付）
