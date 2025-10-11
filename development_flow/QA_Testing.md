# QA / Testing

最終更新: 2025-09-02

## QA.1 Unit
- Functions（ロジック）、Flask（services/repositories）、RN hooks/utils。

## QA.2 Integration
- docker-compose.test で API + vLLM + DB + Redis を起動、/ai/* を中心に検証。

## QA.3 E2E（Detox）
- ログイン→提案→Like→合意→チャットのハッピーシナリオ。

## QA.4 性能・SLO
- 近傍検索k=20 p95 ≤ 150ms、通知バースト、監視ダッシュボード。

## QA.5 React Native Test Harness
- Expo クライアントの lint/typecheck/Jest を整備し、主要画面/フックのテストを実行。

## QA.6 Full-Stack Release Verification
- RN/FB/FL を統合した最終シナリオ（ジャーナル→AI提案→承認→チャット）を自動化し、リリース判定基準を確認。
