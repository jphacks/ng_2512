# FL.5.2 Ops — Gunicorn/Systemd + TLS

概要
- Flask API を Gunicorn+systemd で常駐、Caddy/Nginx で TLS 終端。

依存
- CI.4

成果物
- systemd unit, reverse proxy 設定, TLS 設定手順
- 作業・検証ログ（再起動/ログローテ/ゼロダウン更新）

受け入れ条件
- 再起動/ログローテーション/ゼロダウンデプロイが可能。
- `/ai/*` と `/healthz` `/readyz` `/version` の TLS 終端と HSTS/セキュリティヘッダ設定が docs/dev/ci-cd.md の方針に沿う。
- 監視とログ出力が整備され、systemd/プロキシ双方のアラート条件を定義する。

手順(推奨)
1) Gunicorn 設定/起動
2) Caddy/Nginx 設定（/ai/*, /healthz, /readyz, /version）
3) TLS（Caddy自動 or Nginx+certbot）
4) ログ/再起動/ゼロダウン更新テスト

参照
- docs/dev/ci-cd.md
- docs/features/ai_proposal.md
- development_flow/FL_FlaskAI.md (FL.5.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FL.5.2 Ops — Gunicorn/Systemd + TLS

依頼文:
- Gunicorn+systemd 常駐と Caddy/Nginx でのTLS終端を構築し、再起動/ログローテ/ゼロダウン更新を確認してください。

提出物:
- unit ファイル、リバプロ設定、手順、確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）

---

# 実装詳細（本リポ内の成果物）

- systemd unit テンプレート
  - `deploy/systemd/recall-api.service`
- Nginx 設定テンプレート（TLS 終端）
  - `deploy/nginx/recall-api.conf`
- Caddy 設定テンプレート（自動 TLS）
  - `deploy/caddy/Caddyfile`

---

# 手順（Ubuntu 22.04 例）

前提
- ドメイン: `example.com`
- デプロイ先: `/srv/recall`、アプリユーザ `recall`
- Python 3.11 + venv、`.env` は `/srv/recall/.env`

1) OS/ユーザ/ディレクトリ
- `sudo adduser --system --group recall`
- `sudo mkdir -p /srv/recall && sudo chown -R recall:recall /srv/recall`

2) アプリ配置 / 依存
- 仮想環境: `/srv/recall/venv`
- `pip install -r backend/requirements.txt`
- 実行に必要な `.env` を `/srv/recall/.env` へ配置

3) Gunicorn systemd
- `sudo cp deploy/systemd/recall-api.service /etc/systemd/system/`
- 必要なら `User`, `WorkingDirectory`, `EnvironmentFile`, `ExecStart` を実環境に合わせて修正
- 起動/自動起動: `sudo systemctl daemon-reload && sudo systemctl enable --now recall-api`
- 状態確認: `systemctl status recall-api`、ログ: `journalctl -u recall-api -f`

4) 逆プロキシ + TLS

選択肢A: Caddy（推奨・自動TLS）
- `sudo apt install -y caddy`
- `sudo cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile`（`example.com` を置換）
- `sudo systemctl reload caddy`

選択肢B: Nginx + certbot
- `sudo apt install -y nginx certbot python3-certbot-nginx`
- `sudo cp deploy/nginx/recall-api.conf /etc/nginx/sites-available/recall-api`
- `sudo ln -s /etc/nginx/sites-available/recall-api /etc/nginx/sites-enabled/recall-api`
- `sudo nginx -t && sudo systemctl reload nginx`
- 証明書取得: `sudo certbot --nginx -d example.com`

注:
- 本テンプレートは `/ai/*` と `/healthz` `/readyz` `/version` を 127.0.0.1:8000 へプロキシ
- Gunicorn は localhost バインド（外部公開せず、TLS 終端のみ公開）

5) ログ/ローテーション
- Gunicorn: systemd 経由で stdout/stderr を journald に記録（journald のローテーションポリシで管理）
- Nginx: `/var/log/nginx/*.log` は logrotate 既定設定で日次ローテーション（`/etc/logrotate.d/nginx`）
- 追加でファイル出力したい場合は `--access-logfile /var/log/recall/gunicorn.access.log` 等に変更し、logrotate ルールを作成

6) 再起動/ゼロダウン更新
- 設定再読み込み（ゼロダウン）: `sudo systemctl reload recall-api`
  - `ExecReload` が HUP を送信し、Gunicorn がワーカーをグレースフル再起動
- フル再起動: `sudo systemctl restart recall-api`
- Nginx/Caddy は `reload` で無停止反映

7) 確認ポイント
- ヘルス: `curl -fsS https://example.com/readyz` が 200
- アプリ: `/ai/*` エンドポイントが 200
- ログ: `journalctl -u recall-api|tail` にアクセスログが出力される

8) ゼロダウン検証（例）
- 別ターミナルで負荷を継続: `hey -z 60s https://example.com/readyz`
- 途中で `systemctl reload recall-api` を実施
- エラー/タイムアウトが発生しないことを確認（p95 レイテンシに有意な悪化がない）

9) 観測/保守（補足）
- 重要: `/healthz`（Liveness）と `/readyz`（依存確認）を監視
- CPUコア数に応じ `-w` 調整（目安: `CPU*2+1`）
- 長時間リクエストは `proxy_read_timeout` 等のタイムアウト値を調整

---

# 参考コマンド（確認ログ例）

```
# Gunicorn 起動/状態
sudo systemctl status recall-api --no-pager
journalctl -u recall-api -n 50 --no-pager

# Nginx/Caddy 構文チェック
sudo nginx -t
sudo caddy validate --config /etc/caddy/Caddyfile

# ヘルス
curl -i https://example.com/healthz
curl -i https://example.com/readyz

# ゼロダウン（リロード）
sudo systemctl reload recall-api
```

---

# 備考
- より厳密なゼロダウンを求める場合は、Gunicorn の USR2 ベースの再起動フローや systemd ソケットアクティベーションも検討
- ログをファイルに出す場合は logrotate 設定を追加（journald のみであれば不要）
- セキュリティヘッダや TLS 業界標準は運用ポリシに合わせて更新
