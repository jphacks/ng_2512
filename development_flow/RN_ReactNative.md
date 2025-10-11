# RN: React Native（Expo）

最終更新: 2025-09-02

## RN.1 認証（Firebase Auth）
- Google Sign-In → signInWithCredential。初期化・エラーハンドリング・再サインイン。

## RN.2 画面
- RN.2.1 Proposals
  - 一覧/詳細/作成/反応。Functions 呼び出し、匿名可視化、期限バッジ。
  - AI ドラフト通知からのディープリンク受け取りと `approve_and_send` のワンタップ承認に対応。
- RN.2.2 Groups & Chat
  - Firestore 購読、送信、既読/未読、Typing 表示。
- RN.2.3 Friends
  - 申請/承認/取消/解除、フレンド一覧。
- RN.2.4 Journal
- RN.2.5 Profile & Username
  - 初回サインインで username を登録し、以降の画面で表示できるプロフィール編集 UI。
- RN.2.6 Settings/Notifications
  - 通知トグル、言語、ダークモード。
- RN.2.7 Journal Timeline & Detail
  - `/journal_entries` のタイムライン/詳細/編集、通知ディープリンク、提案導線。

## RN.3 サービス/フック
- RN.3.1 useAuth（Firebase）
- RN.3.2 apiClient（/ai/* 用、再試行/タイムアウト）
- RN.3.3 notifications（FCM登録/ハンドラ、提案・ジャーナル通知アクション処理）
- RN.3.4 presence/typing 更新（定期）

## RN.4 その他
- i18n/アクセシビリティ、React Context/React Query、エラートースト。
- Expo + Firebase エミュレータ compose スタックは CI.7 で提供。

## RN.5 Web/E2E（CI）
- Expo Web（`expo start --web`）でのE2E（Playwright）をGitHub Actionsに統合。
- ワークフロー: `.github/workflows/mobile-web-e2e.yml`
- 設定: `mobile/playwright.config.ts`（webServerでExpoを起動）
- テスト: `mobile/tests/e2e/*`
  - `app-smoke`: タブ表示のスモーク確認
  - `firebase`: Firebase 初期化確認（`window.__APP_TEST_INFO`）
  - `api-integration`: バックエンド `/healthz` の疎通確認
- バックエンドは `docker-compose.ci.yml` と `deploy/docker-compose.mobile-e2e.yml` を組合せ、`8000` をホストに公開。
 - Node 要件: Firebase SDK の事情により CI/ローカルとも Node 20 系を推奨（`engines: ">=20 <23"`）。
