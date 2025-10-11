# QA.6 Full-Stack Release Verification（RN + FB + FL）

概要
- RN（クライアント）、FB（Firebase Functions/Firestore）、FL（Flask AI）の全タスク完了後に実施する最終統合テストを定義し、リリース前の品質ゲートとする。

依存
- RN.2.*, RN.3.*, RN.4 完了
- FB.2〜FB.5 完了
- FL.2〜FL.5 完了
- QA.2, QA.3, QA.5

成果物
- 統合テスト手順書（シナリオ: ジャーナル投稿→AIドラフト通知→承認→合意→チャット開始）
- 自動化スクリプト or デトックス/Playwright 組合せでの最終スモーク
- リリース判定チェックリスト（SLO 検証、ログ確認、回帰サマリ）

受け入れ条件
- RN/FB/FL の本番相当構成（docker-compose.test + mobile compose）でシナリオが再現される。
- AI 提案ドラフト→通知→`approve_and_send`→チャットまでがエラーなく完了し、ログ/メトリクスが収集される。
- 失敗時のトリアージ手順とロールバック条件がドキュメント化。
- リリース判定のサインオフテンプレートが整備され、CI/CD で実行結果を確認できる。

手順(推奨)
1) RN/FB/FL を含む Compose + Emulator スタックの起動スクリプト作成。
2) ジャーナル投稿→AIドラフト通知→承認→グループ生成→チャット送信の自動テスト化。
3) ログ/メトリクス収集ポイントの確認（Functions/Flask logs, Expo logs, monitoring dashboards）。
4) リリースチェックリストとサインオフプロセスを README/Runbook に追加。

参照
- docs/features/ai_proposal.md
- docs/features/journal.md
- development_flow/FB_Firebase.md, FL_FlaskAI.md, RN_ReactNative.md
- development_flow/tasks/QA/QA.2_integration.md, QA.3_e2e_detox.md, QA.5_rn_test_harness.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.6 Full-Stack Release Verification（RN + FB + FL）

依頼文:
- RN/FB/FL が揃った環境でジャーナル投稿からAI提案、承認、グループチャットまでの最終統合テストを自動化し、リリース判定チェックリストを整備してください。

提出物:
- テストスクリプト/ログ、チェックリストドキュメント、CI 実行結果
- テスト実行ログ（該当テストを実行した場合はログを添付）
