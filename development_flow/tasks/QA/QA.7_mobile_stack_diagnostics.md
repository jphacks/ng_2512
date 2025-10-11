# QA.7 QA — Mobile⇔Firebase⇔Flask Diagnostics

概要
- モバイルアプリから Firebase（Auth/Firestore/Functions）および Flask API への疎通状況を検証する開発者向けダイアグノスティクスを提供し、問題発生時の切り分けを容易にする。

依存
- RN.1.*（Firebase Auth 基盤）
- RN.3.2（apiClient HMAC 実装）
- RN.3.3（通知/Functions 呼び出し）

成果物
- `mobile/src/services/diagnostics.ts`（スタック疎通チェックロジック）
- 設定画面などから実行できる UI（結果表示/ログ出力）
- ドキュメント更新（追加タスクの案内が必要な場合）

受け入れ条件
- 署名済みユーザーで実行すると、以下 4 項目の成否が取得できる：
  - Firebase Auth セッション確認
  - Firestore 読み取り（例: `users/{uid}` の存在確認）
  - Cloud Functions 呼び出し（副作用のない関数で OK）
  - Flask `/healthz` への HTTP リクエスト
- 各項目は成功/失敗と詳細メッセージを返し、UI 上でリスト表示される。失敗時はログや再試行案内が表示される。
- ネットワーク遮断や未ログイン状態など代表ケースで適切なエラーメッセージが表示される。
- Web (Expo Web) で CORS 拒否が起きた場合は `scripts/qa/qa7_cors_probe.sh` によりプリフライト応答ヘッダを検証し、`Access-Control-Allow-Origin` などが正しく返ることを確認する。

手順(推奨)
1) Firebase/Flask へ個別リクエストする `runStackDiagnostics()` を実装
2) 設定画面に「スタック診断」ボタンを追加し、結果をカード/ダイアログで表示
3) 主要失敗パターンを手動確認し、ログ/ドキュメントに反映
4) Expo Web などブラウザ経由の CORS 問題については後述の CORS テスト手順で切り分ける

参照
- docs/mobile/firebase-architecture.md
- docs/backend/flask-architecture.md
- development_flow/RN_ReactNative.md（RN.2.6 Settings）

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.7 QA — Mobile⇔Firebase⇔Flask Diagnostics

依頼文:
- モバイルから Firebase/Firebase Functions/Flask API への疎通をまとめて確認できる診断フローを実装し、設定画面から実行できるようにしてください。

提出物:
- `diagnostics.ts` と UI 差分
- 動作確認ログ（成功/失敗ケースのスクショや記録）
- CORS 切り分けログ（`scripts/qa/qa7_cors_probe.sh` 実行結果など）

---

## CORS テスト手順（QA.7 拡張）

Expo Web などブラウザ環境で Flask への呼び出しが `CORS policy` により拒否された場合は、以下のプリフライトテストでサーバ構成を検証する。

```
# ORIGIN には Expo Web のホスト（例: http://localhost:19006）を指定
# BASE_URL には Flask サーバの URL を指定
ORIGIN=http://localhost:19006 scripts/qa/qa7_cors_probe.sh http://127.0.0.1:8000
```

期待される応答:
- ステータスコードが `204` または `200`
- `Access-Control-Allow-Origin` に `ORIGIN` と同じ値が含まれる
- `Access-Control-Allow-Headers` に `Content-Type,X-Api-Key,X-Timestamp,X-Nonce,X-Signature` が含まれる

異常時の確認ポイント:
- `.env` で `AI_ALLOWED_ORIGINS` に Expo Web のオリジン (例: `http://localhost:19006`) が含まれているか
- Expo Web が参照する `EXPO_PUBLIC_API_BASE_URL` と Flask 実サーバの URL が一致しているか
- `backend/app.py` の CORS ハンドラが最新の設定でデプロイされているか（`flask_cors` またはフォールバックロジック）
