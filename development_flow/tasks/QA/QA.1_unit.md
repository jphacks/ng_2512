# QA.1 Testing — Unit

概要
- Functions/Flask/RN hooks/utils のユニットテストを整備。

依存
- 各対象モジュール

成果物
- tests/unit/*, coverage 設定

受け入れ条件
- 主要分岐/エラー系を網羅し、docs/dev/testing-plan.md に記載のカバレッジ閾値を満たす。
- ドメイン仕様（docs/features/*）のビジネスルールをユニットレベルで検証する。

手順(推奨)
1) テストケース設計
2) 実装/CI 連携

参照
- docs/dev/testing-plan.md
- development_flow/QA_Testing.md (QA.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.1 Testing — Unit

依頼文:
- Functions/Flask/RN hooks/utils のユニットテストを追加し、主要分岐/エラー系を網羅、カバレッジ閾値を満たしてください。

提出物:
- テストコード、カバレッジレポート
- テスト実行ログ（該当テストを実行した場合はログを添付）