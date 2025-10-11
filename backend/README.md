# Backend Docker Targets

このディレクトリの Dockerfile は Flask バックエンドのテスト/本番コンテナをマルチステージで提供します。

## 事前準備
- ルートで `cp .env.example .env` などの環境設定を行う前提です。
- テストステージでは `pytest` を実行し、プロダクションステージでは Gunicorn を起動します。

## イメージのビルドと実行例

### テストターゲット
```bash
docker build -f backend/Dockerfile --target test -t recall-backend:test .
docker run --rm recall-backend:test
```

### プロダクションターゲット
```bash
docker build -f backend/Dockerfile --target prod -t recall-backend:prod .
docker run --rm -p 8000:8000 recall-backend:prod
```

## ローカル開発ノート
- Gunicorn は `app:create_app()` をエントリポイントとしており、ポート `8000` で待ち受けます。
- `tests/` 配下に pytest スモークテストがあり、テストターゲットで自動実行されます。
- 依存インストールは wheel を事前構築してキャッシュし、テスト/プロダクションで再利用します。
