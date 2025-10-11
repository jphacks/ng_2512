# CI.7 docker-compose.mobile — React Native Expo + Firebase Emulators

概要
- React Native (Expo) クライアントと Firebase エミュレータ群を Docker Compose で立ち上げる開発スタックを整備し、RN タスクの共通基盤とする。
- 開発者が Node/Firebase をローカルに直接インストールせずとも docs/dev/ci-cd.md のモバイル手順をコンテナで再現できることを目標とする。

依存
- CI.2（docker-compose.test のネットワーク/環境変数設計）
- FB.3.1（proposals Lifecycle Functions）
- FB.3.5（通知/FCM ディスパッチ）

成果物
- `docker-compose.mobile.yml`（Expo + Firebase emulators 構成）
- `.env.example` の Expo/Firebase エミュレータ向け環境変数
- 開発手順ドキュメント（README or `docs/dev/mobile-local.md`）

受け入れ条件
- `docker compose up mobile-web` で Expo Web/Metro が起動し、`http://localhost:19006` にアクセスできる。
- Firebase Auth/Firestore/Functions/UI エミュレータが `fb-emulators` サービスで自動起動し、React Native から `EXPO_PUBLIC_*` で接続できる。
- 初回起動時に `npm ci` を実行し、`node_modules` や Expo/NPM キャッシュが永続ボリュームで再利用される。
- Expo DevTools/Metro ログをホストへ出力し、Push 通知や Functions 呼び出しがローカルで検証できる。

手順(推奨)
1) Compose サービス設計（ポート、ボリューム、ヘルスチェック、依存）。
2) `.env.example` に Expo/Firebase 向けキーを整理し、起動手順を README に追記。
3) Firebase CLI セットアップと `npm ci` / Expo キャッシュ共有を実装。
4) `docker compose up` による起動ログと RN ホットリロード/通知フロー確認ログを取得。

参照
- docs/dev/ci-cd.md
- docs/mobile/rn-structure.md
- development_flow/RN_ReactNative.md (CI セクション参照)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: CI.7 docker-compose.mobile — React Native Expo + Firebase Emulators

依頼文:
- Expo + Firebase エミュレータを一括で起動する `docker-compose.mobile.yml` を整備し、.env と README を更新してください。初回/再起動のキャッシュ戦略やログ取得方法も明記してください。

提出物:
- Compose ファイル/スクリプト、ドキュメント差分、起動ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
