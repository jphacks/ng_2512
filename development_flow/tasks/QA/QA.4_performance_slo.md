# QA.4 Testing — Performance/SLO

概要
- 近傍検索/AI 推論/通知バーストの性能評価と SLO 監視。

依存
- FL.*, SEC.4

成果物
- ベンチスクリプト、ダッシュボード項目

受け入れ条件
- 目標: k=20 p95 ≤ 150ms、vLLM 応答 p95 ≤ docs/features/ai_proposal.md 記載値（例: 2.5s）、通知送信 p95 ≤ 500ms を満たす。
- ベンチ結果をダッシュボード化し、リグレッション検知用の閾値とアラートを設定する。

手順(推奨)
1) ベンチ実装
2) メトリクス収集/可視化

参照
- docs/features/ai_proposal.md
- development_flow/QA_Testing.md (QA.4)

実装/実行方法
- スクリプト: `scripts/qa/bench_qa4.py`（外部依存なし）
- 実行例:
  - 全体: `python scripts/qa/bench_qa4.py --mode all`
  - KNNのみ: `python scripts/qa/bench_qa4.py --mode knn --vectors 1000 --queries 200`
  - APIのみ: `python scripts/qa/bench_qa4.py --mode api --rounds 100`
- 出力: `development_flow/logs/qa4/results.json`, `development_flow/logs/qa4/report.md`
- ダッシュボード: `docs/dev/dashboards/qa4.md`

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.4 Testing — Performance/SLO

依頼文:
- 近傍検索/AI 推論/通知バーストのベンチを作成し、SLO を満たすか計測/可視化してください。

提出物:
- ベンチスクリプト、ダッシュボード項目、計測結果
- テスト実行ログ（該当テストを実行した場合はログを添付）