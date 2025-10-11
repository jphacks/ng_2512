# FL.2.1 Service — Embedding Repository

概要
- 画像/顔埋め込みの CRUD と近傍検索を提供するリポジトリ層。

依存
- docs/backend/flask-vector-arch.md（埋め込み構造）

成果物
- src/server/repositories/embedding_repo.py
- 単体テスト

受け入れ条件
- 条件付き検索（ユーザ/フレンド範囲、顔ボックス ID）のフィルタに対応し、docs/features/ai_proposal.md / theme_generator.md の要件を満たす。
- スコア順/作成時刻順で安定し、k=20 近傍検索の p95 ≤ 150ms を維持。
- 埋め込みの再計算や削除時に整合性と監査ログを残す。

手順(推奨)
1) インターフェース設計（save, query_knn, delete）
2) SQL 最適化と測定

参照
- docs/features/theme_generator.md
- docs/features/ai_proposal.md
- docs/backend/flask-vector-arch.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.2.1 Service — Embedding Repository

依頼文:
- 埋め込みのCRUDと近傍検索（条件付）のリポジトリを実装し、主要クエリの性能/安定性を満たしてください。

提出物:
- リポジトリ実装、単体テスト、簡易ベンチ
- テスト実行ログ（該当テストを実行した場合はログを添付）
