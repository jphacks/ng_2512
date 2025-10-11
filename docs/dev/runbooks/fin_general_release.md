# FIN Release Runbook - 一般配布自動化

最終更新: 2025-09-05 (Asia/Tokyo)

---

## 1. 目的
- Recall を一般配布する際、指定サーバーに Flask API（docker compose 経由）を自動で立ち上げる。
- 手元のマシンから `scripts/deploy/fin_remote_bootstrap.sh` を呼び出すだけで、必要なファイル同期とコンテナ再起動を完了する。
- 配布作業の属人化を防ぎ、CI/CD で利用できる自動化ステップを確立する。

---

## 2. 前提条件
- リモートサーバーに Docker と docker compose v2（または docker-compose）がインストール済み。
- デプロイ先のユーザーが `/opt/recall`（デフォルト）以下に書き込み可能。
- GitHub Container Registry（GHCR）へアクセスするためのトークンがサーバー側に設定済み、または匿名 Pull が可能。
- ローカルマシンに `ssh` と `rsync` がインストールされている。
- `.env` の本番値を別途用意し、リポジトリにはコミットしない。

---

## 3. 事前準備
1. **サーバーに初回ログインし、Docker 動作を確認する**
   ```bash
   ssh deploy@example.com "docker info > /tmp/docker-info.txt"
   ```
2. **GHCR 認証が必要な場合**、サーバー側で一度 `docker login ghcr.io` を実行し、資格情報を保存する。
3. **本番用環境変数ファイルの準備**
   - ローカルで `deploy/.env.production` として管理（例: `IMAGE_REPO`, `IMAGE_TAG`, `DATABASE_URL` 等）。
   - Script 実行時に `--env-file deploy/.env.production` で転送できる。

---

## 4. 利用手順
1. リポジトリ直下で下記コマンドを実行（例）:
   ```bash
   scripts/deploy/fin_remote_bootstrap.sh \
     --host api.example.com \
     --user deploy \
     --remote-path /opt/recall \
     --image-repo ghcr.io/acme/recall/api \
     --image-tag sha-abcdef123 \
     --env-file deploy/.env.production
   ```
   - `.env.production` がアップロードされ、`server_deploy.sh` がリモートで実行される。
   - `--no-sync` を指定すると `deploy/` `scripts/deploy/` の同期をスキップ可能（CI からの再デプロイ用途）。
2. 進捗ログで `docker compose up -d api` とヘルスチェック成功メッセージを確認する。
3. 成功後、ブラウザまたは `curl` で `/readyz` を確認。
   ```bash
   curl -fsS https://api.example.com/readyz
   ```

---

## 5. 自動化（CI/CD）
- GitHub Actions から利用する場合、事前に `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`, `DEPLOY_PATH` 等の Secrets を登録。
- ワークフロー例:
  ```yaml
  - name: Deploy to production
    uses: appleboy/ssh-action@v1.0.3
    with:
      host: ${{ secrets.DEPLOY_HOST }}
      username: ${{ secrets.DEPLOY_USER }}
      key: ${{ secrets.DEPLOY_KEY }}
      script: |
        cd ${{ secrets.DEPLOY_PATH }}
        scripts/deploy/fin_remote_bootstrap.sh \
          --host ${{ secrets.DEPLOY_HOST }} \
          --user ${{ secrets.DEPLOY_USER }} \
          --remote-path /opt/recall \
          --image-repo ghcr.io/${{ github.repository }}/api \
          --image-tag sha-${{ github.sha }} \
          --no-sync
  ```
- CI では事前に `deploy/` `scripts/deploy/` をリポジトリごとサーバーに配置しておき、`--no-sync` + `git pull` での更新に切り替えることも可能。

---

## 6. トラブルシューティング
- **`docker compose` が見つからない**: `sudo apt-get install docker-compose-plugin` を実行し、`docker compose version` が成功することを確認。
- **GHCR Pull に失敗**: サーバーで `echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USERNAME --password-stdin` を再実行。
- **ヘルスチェック失敗でロールバック**: `deploy/releases.log` を確認し、`scripts/deploy/server_rollback.sh --to-tag <prev>` を手動実行。
- **ファイル同期を飛ばしたい**: `--no-sync` を付けてコマンドを再実行。遠隔側で `deploy/` `scripts/deploy/` を最新化していることを前提とする。

---

## 7. 参照
- `scripts/deploy/fin_remote_bootstrap.sh`
- `scripts/deploy/server_deploy.sh`
- `docs/dev/deploy_server.md`
- `development_flow/tasks/FIN/FIN.1_General_Distribution/FIN.1.0_general_release_automation.md`
