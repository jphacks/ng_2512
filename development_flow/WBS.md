# WBS（作業分解構成）

最終更新: 2025-09-26

本WBSは `docs/` 配下の仕様を起点に領域別タスクを階層化したものです。記号は領域略号.番号.番号…で階層を表します。docs が更新された場合は本WBSと `TASK_INDEX.md` を同歩調整してください。

## Features（F） — docs/features/*.md
- F01 認証（auth.md） — FB.4, RN.1, SEC.1
- F02 匿名提案（proposal.md） — FB.3.1, RN.2.1, RN.3.2
- F03 合意収集（agreement.md） — FB.3.2, RN.2.1, QA.2
- F04 グループ & チャット（group.md） — FB.3.2, RN.2.2
- F05 日程調整（scheduling.md） — FB.3.*, FL.3.5, RN.2.2, FL.2.5
- F06 通知（notification.md） — FB.3.5, RN.3.3, CI.3
- F07 連絡先取り込み（contacts.md） — FB.3.*, RN.2.x, SEC.3
- F08 プライバシー/通報（privacy.md） — SEC.*, QA.3
- F09 設定・アクセシビリティ（settings.md） — RN.2.6, RN.4.0
- F10 テーマ生成（theme_generator.md） — FL.2.3, FL.3.1, RN.2.12
- F11 類似人物マッチ（people_match.md） — FL.2.1, FL.3.2, RN.2.8
- F12 AI提案自動送信（ai_proposal.md） — FL.3.3, FB.3.6, RN.2.1
- F13 手動提案（user_proposal.md） — RN.2.1, FB.3.1
- F14 ジャーナル（journal.md） — FL.2.4, FL.3.4, RN.2.4, RN.2.7
- F15 フレンド（friend.md） — FB.3.3, RN.2.3

## Firebase（FB） — docs/firestore/*.md, docs/backend/api-spec.md
- FB.2 セキュリティルール
  - FB.2.1 Groups 読取/書込 ACL（メンバーのみ）
  - FB.2.2 Proposals 当事者 ACL
  - FB.2.3 Presence 本人のみ書込
- FB.3 Cloud Functions
  - FB.3.1 proposals.create / react / cancel / status / approve_and_send
  - FB.3.2 proposals.agreed トリガ → groups 自動生成
  - FB.3.3 friends.*（申請/承認/取消/解除 + 通知）
  - FB.3.4 署名URL 発行（journal/photos）
  - FB.3.5 通知トリガ（申請/承認/提案/合意/リマインド/AIドラフト）
  - FB.3.6 Journal → AI Draft（投稿検知 → Flask → Firestore 保存）
  - FB.3.7 記念日/リマインド通知（1年前の今日など）
- FB.4 Auth 統合（Google→signInWithCredential + Claims）
- FB.5 運用（デプロイ/モニタリング/エミュレータ）

## Flask AI（FL） — docs/backend/flask-architecture.md, flask-vector-arch.md, vllm-management.md
- FL.2 Repository/Service 層
  - FL.2.1 embedding_repo（近傍検索）
  - FL.2.2 asset_repo（S3 key / メタデータ）
  - FL.2.3 ai_service（CLIP/ArcFace + vLLM）
  - FL.2.4 journal_entry_repo（PostgreSQL/SQLAlchemy）
  - FL.2.5 vlm_schedule_service（VLM による予定・メンバー抽出パイプライン）
- FL.3 API 実装（/ai/*, /journal_entries）
  - FL.3.1 POST /ai/themes/suggest
  - FL.3.2 POST /ai/people/match（フレンド内）
  - FL.3.3 POST /ai/proposal_drafts（F12 自動提案）
  - FL.3.4 /journal_entries（F14 CRUD + create_proposal）
  - FL.3.5 POST /ai/schedule/from_image（画像から予定・メンバー抽出）
- FL.4 非同期（任意）: 再計算・バックフィル・VLM バッチ解析
- FL.5 運用: vLLM 起動/監視、Gunicorn/systemd、TLS、モデルロールアウト

## React Native（RN） — docs/mobile/*.md, docs/features/*.md
- RN.1 認証（Firebase Auth + useAuth）
- RN.2 画面
  - RN.2.1 Proposals（一覧/詳細/作成/AIドラフト）
  - RN.2.2 Groups & Chat（Firestore購読 + 日程パネル）
  - RN.2.3 Friends（申請/承認/解除）
  - RN.2.4 Journal（アップロード/閲覧/編集）
  - RN.2.5 Profile & Username
  - RN.2.6 Settings & Notifications
  - RN.2.7 Journal Timeline & Detail（API 一覧・提案導線）
  - RN.2.8 Journal Tag & Face Suggestions（F11 連携）
  - RN.2.9 Journal Detail & Editing（PUT/DELETE + deeplink）
  - RN.2.10 Journal Offline Draft Sync（ローカル保存/競合解決）
  - RN.2.11 Journal 投稿フロー（AI 補助含む）
  - RN.2.12 AI Assist Tools（テーマ/人物/VLM 情報提示）
  - RN.2.13 Journal Face Suggestions Runtime（既存）
  - RN.2.14 Scheduling Helper（VLM 抽出結果の表示・編集）
- RN.3 サービス/フック
  - RN.3.1 useAuth（認証状態 + プロファイル）
  - RN.3.2 apiClient（/ai/*, HMAC, リトライ）
  - RN.3.3 notifications（FCM 登録/ハンドラ）
  - RN.3.4 presence/typing（Realtime DB / Firestore）
  - RN.3.5 journalService（署名URL + キャッシュ）
- RN.4 プラットフォーム共通
  - RN.4.0 i18n / アクセシビリティ / 設定同期

## CI/CD（CI） — docs/dev/ci-cd.md, deploy_server.md, mobile-ci-testing.md
- CI.1 Backend Dockerfile（test/prod）
- CI.2 docker-compose.test（DB/Redis/vLLM/API/VLM ガーディアン）
- CI.3 GitHub Actions（Unit → Compose 統合 → GHCR push）
- CI.4 個人サーバ配備（Compose pull/up, migration, readiness）
- CI.5 本番移植（インフラ/シークレット/データ移行/カットオーバー）
- CI.6 Mobile Web/E2E（Detox/Expo）
- CI.7 docker-compose.mobile（Expo + Firebase エミュレータ + モック AI）

## Security（SEC） — docs/features/privacy.md, docs/backend/hmac-auth.md
- SEC.1 ルール/ACLレビュー（Firebase Rules, Firestore, Storage）
- SEC.2 API Key/HMAC 設計（Flask /ai/*, ローテーション）
- SEC.3 画像/署名URL/データ保持ポリシー（削除請求対応）
- SEC.4 ログ/レート制限/監査ログ（Flask + Firebase Functions）
- SEC.5 モデル/埋め込みアクセス権監査（VLM/顔データ）

## QA / 品質（QA） — docs/dev/testing-plan.md
- QA.1 Unit（Functions・Flask・RN hooks）
- QA.2 Integration（docker compose + vLLM/VLM モック）
- QA.3 E2E（Detox: ログイン→提案→合意→日程確定）
- QA.4 性能・監視 SLO（近傍検索 ≤150ms, 通知 p95 ≤20s）
- QA.5 React Native Test Harness（Storybook/Playwright）
- QA.6 Full-Stack Release Verification（セルフホスト確認）
- QA.7 Mobile⇔Firebase⇔Flask Diagnostics（Observability Runbook）

## Demo / Presentation（DE） — docs/dev/runbooks/demo_mode.md
- DE.1 Demo Mode（Presentation Toggle）
  - DE.1.0 Demo Mode フラグ & 即時トリガ

## Final Distribution（FIN） — docs/dev/runbooks/fin_general_release.md
- FIN.1 General Release Automation
  - FIN.1.0 Remote Bootstrap & Deploy
