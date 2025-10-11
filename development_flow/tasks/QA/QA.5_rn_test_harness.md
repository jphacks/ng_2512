# QA.5 React Native Test Harness

概要
- React Native (Expo) クライアントのユニット/コンポーネント/Jest テストと lint を体系化し、CI で再現可能にする。
- RN.2.* 画面と RN.3.* サービスが最低限のテストカバレッジを持つようにする。

依存
- RN.2.*, RN.3.* 実装完了
- CI.7（docker-compose.mobile）

成果物
- `mobile/package.json` のテストスクリプト整備、Jest 設定
- Lint/TypeCheck/Jest を実行する CI ジョブ（GitHub Actions or scripts）
- テストカバレッジレポート出力と README への手順

受け入れ条件
- `npm run lint`, `npm run test -- --ci`, `npm run typecheck` が `docker-compose.mobile` 内/外で安定実行。
- コンポーネント/フックの代表ケース（Proposals/Journals/Notifications）に対する Jest テストが存在。
- CI で失敗時にログとアーティファクト（coverage/outputs）が取得可能。

手順(推奨)
1) Jest/React Testing Library 設定、モック（Firebase/Expo）整備。
2) 各画面/サービスの代表シナリオテストを追加。
3) CI ジョブ追加（`actions/setup-node` + `npm ci` + lint/test）。
4) カバレッジ閾値や失敗時のデバッグガイドを README に追記。

参照
- docs/dev/ci-cd.md
- development_flow/RN_ReactNative.md (RN.2/3)
- development_flow/CI_CICD.md (CI.2, CI.7)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.5 React Native Test Harness

依頼文:
- React Native クライアントの lint/typecheck/Jest テストを整備し、CI.7 の環境と GitHub Actions で再現できるようにしてください。主要画面/フックのサンプルテストとカバレッジレポートも含めてください。

提出物:
- テスト・スクリプト差分、CI 設定、カバレッジレポート例、README 更新
- テスト実行ログ（該当テストを実行した場合はログを添付）
