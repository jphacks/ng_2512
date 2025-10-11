# CI.1 Dockerfile — Backend (test/prod)

概要
- マルチステージ Dockerfile を作成し、test と prod ターゲットを提供。

依存
- docs/dev/ci-cd.md

成果物
- Dockerfile（test: pytest 実行, prod: gunicorn 起動）

受け入れ条件
- test ターゲットでユニットテストが通過
- prod ターゲットで最小構成起動

手順(推奨)
1) ベース/依存インストール
2) test/prod ステージ実装
3) キャッシュ最適化

参照
- development_flow/CI_CICD.md (CI.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: CI.1 Dockerfile — Backend (test/prod)

依頼文:
- マルチステージDockerfileを作成し、testターゲットでpytest、prodターゲットでgunicorn起動ができるようにしてください。

提出物:
- Dockerfile、簡易README、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
