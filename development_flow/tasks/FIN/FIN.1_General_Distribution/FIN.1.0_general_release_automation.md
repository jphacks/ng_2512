# FIN.1.0 General Release - Remote Automation

概要
- Recall を一般配布する際、指定サーバーに Flask API を自動で立ち上げるパイプラインを確立する。
- `scripts/deploy/fin_remote_bootstrap.sh` を利用し、deploy 資材の同期と `server_deploy.sh` の実行をワンコマンド化する。
- CI/CD からも同じ手順で本番環境へ配備できる状態を整備する。

依存
- CI.4, CI.5（docker compose 配備・本番移行手順が完成していること）
- QA.6（フルスタック検証が完了していること）
- FB.5.0（Firebase 運用手順が整備済みであること）

成果物
- `scripts/deploy/fin_remote_bootstrap.sh`（新規）: SSH + rsync でリモートへ同期し `server_deploy.sh` を呼び出すスクリプト
- `docs/dev/runbooks/fin_general_release.md`（新規）: 一般配布用のリモート自動化ランブック
- `docs/dev/deploy_server.md` への追記（FIN 自動化セクション）
- `development_flow/` 配下の WBS/TASK_INDEX/adm.dot/status.json に FIN エリアを追加

受け入れ条件
- `scripts/deploy/fin_remote_bootstrap.sh --host <host> --user <user> --image-repo <repo>` を実行すると、指定サーバーで `server_deploy.sh` が起動し、Flask コンテナが自動的に再作成される。
- スクリプトは `--env-file` で渡した `.env` を安全にアップロードし、設定値の欠損がある場合はエラーを返す。
- `docs/dev/runbooks/fin_general_release.md` に沿って 10 分以内に初回配備が完了する。
- FIN 領域が WBS/TASK_INDEX/status/adm.dot に追加され、依存関係が可視化されている。

手順(推奨)
1. リモートサーバー準備: Docker/Docker Compose の有無をチェックし、`deploy/.env` の本番値を用意する。
2. ローカルへ `scripts/deploy/fin_remote_bootstrap.sh` を実装し、`server_deploy.sh` を呼び出す SSH/rsync フローを構築する。
3. ドキュメント: `docs/dev/runbooks/fin_general_release.md` に前提条件・コマンド例・CI 連携方法を記述する。`docs/dev/deploy_server.md` に FIN 自動化セクションを追記する。
4. 管理資料更新: WBS/TASK_INDEX/status.json/adm.dot へ FIN.1.0 を追加し、CI.4/CI.5/QA.6 からの依存を明記する。

参照
- docs/dev/runbooks/fin_general_release.md
- docs/dev/deploy_server.md
- scripts/deploy/server_deploy.sh

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FIN.1.0 General Release - Remote Automation

依頼文:
- `fin_remote_bootstrap.sh` を実装し、指定サーバーで `server_deploy.sh` が走る一般配布用のリモート自動化フローを整備してください。
- ランブックと管理ドキュメント（WBS/TASK_INDEX/status/adm.dot）の FIN 領域更新も含めて対応してください。

提出物:
- スクリプト差分、実行ログ（テスト環境でのデプロイ確認）
- 更新したドキュメント一式
