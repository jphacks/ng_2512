# デプロイ — 個人サーバ（Docker Compose）

このドキュメントと付属スクリプトは CI.4 を満たします：GHCR からの Pull、Compose Up、DB マイグレーション、ヘルスチェック、ロールバックを実施します。

## 前提条件
- サーバに Docker と Docker Compose v2 が導入済み（`docker compose version` で確認）
- `deploy/.env.deploy.example` を基にサーバ側で `deploy/.env` を作成
  - `IMAGE_REPO`（例: `ghcr.io/<owner>/<repo>/api`）を設定
  - `IMAGE_TAG` はロールバックしやすい `sha-<commit>` を推奨（`latest` でも可）
  - パッケージがプライベートなら `GHCR_USERNAME`/`GHCR_TOKEN` を設定
  - DB/Redis を使う場合は `DATABASE_URL` や `REDIS_URL` 等も設定（profiles を有効化）

## 追加ファイル
- `deploy/docker-compose.yml`: 本番用 Compose（api + 任意の db/redis/vllm は profiles で有効化）
- `deploy/.env.deploy.example`: サーバで `deploy/.env` として使用するテンプレート
- `scripts/deploy/server_deploy.sh`: 指定タグを配備し、マイグレーション・ヘルス確認・失敗時ロールバックを実行
- `scripts/deploy/server_rollback.sh`: 手動ロールバック用ヘルパー

## 基本的な配備手順（サーバ上）
1) リポジトリ（または `deploy/` と `scripts/deploy/`）をサーバへ配置
2) 環境変数を準備
```
cp deploy/.env.deploy.example deploy/.env
vi deploy/.env   # IMAGE_REPO / IMAGE_TAG などを設定
```
3) 新しいイメージを配備（`sha` タグ推奨）
```
scripts/deploy/server_deploy.sh \
  --image-repo ghcr.io/<owner>/<repo>/api \
  --image-tag sha-<commit>
```
4) ヘルス確認
```
curl -fsS $(grep HEALTHCHECK_URL deploy/.env | cut -d= -f2)
```

## ロールバック
- 自動: ヘルスチェック失敗時、`server_deploy.sh` が直前の `IMAGE_TAG` に戻し再作成します。
- 手動: 既知のタグへ戻す場合
```
scripts/deploy/server_rollback.sh --to-tag sha-<previous>
```

## 短時間停止での更新
- `docker compose up -d` により `api` コンテナを最小停止で再作成します。
- ゼロダウンを厳密に目指す場合は、リバースプロキシ（NGINX/Traefik 等）配下で Blue/Green や複数レプリカ＋ルーティングを構成してください（CI.4 の範囲外ですが拡張可能）。

## 任意: CI/GitHub Actions からのリモート配備
`.github/workflows/backend.yml` のイメージ Push 後に、サーバへ SSH して `server_deploy.sh` を `sha` タグで実行するジョブを追加できます。必要な Secrets:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY`（SSH 秘密鍵）
- `DEPLOY_PATH`（サーバ上のリポジトリパス）

例（スケッチ）:
```
- name: Deploy over SSH
  if: github.ref == 'refs/heads/main'
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_KEY }}
    script: |
      cd ${{ secrets.DEPLOY_PATH }}
      git pull --ff-only || true
      ./scripts/deploy/server_deploy.sh \
        --image-repo ghcr.io/${{ github.repository }}/api \
        --image-tag sha-${{ github.sha }}
```


## FIN: リモート自動化スクリプト
- `scripts/deploy/fin_remote_bootstrap.sh` を利用すると、ローカルからワンコマンドで deploy 資材を同期し `server_deploy.sh` をリモート実行できます。
- 典型的な利用例:
  ```bash
  scripts/deploy/fin_remote_bootstrap.sh \
    --host api.example.com \
    --user deploy \
    --remote-path /opt/recall \
    --image-repo ghcr.io/acme/recall/api \
    --image-tag sha-abcdef123 \
    --env-file deploy/.env.production
  ```
- 詳細な手順・CI 組み込み例は `docs/dev/runbooks/fin_general_release.md` を参照してください。

## 注意事項
- マイグレーションは `flask db upgrade` をベストエフォートで実行します。Flask-Migrate 未導入のスケルトンでは実質 no-op（または非ゼロ終了）になり得ます。
- リリース履歴は `deploy/releases.log` にタグやダイジェスト付きで追記されます。
- `deploy/.env` の実値はサーバ側のみで管理し、リポジトリにコミットしないでください。
