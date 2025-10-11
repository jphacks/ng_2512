# QA.3 Testing — E2E (Detox)

概要
- ログイン→提案→合意→チャットの E2E を Detox で自動化。

依存
- RN.1〜2, FB.3.*

成果物
- e2e テスト、シナリオ/データ準備、CI 実行手順

受け入れ条件
参照
- docs/features/proposal.md / ai_proposal.md / group.md の主要ユーザフロー（ログイン→提案作成→AIドラフト承認→合意→グループチャット）が端末上で再現可能。
- 通知タップからの遷移、匿名表示、既読/typing の確認を含む。
- シナリオが CI デバイス（Android/iOS シミュレータ）で安定して通る。

手順(推奨)
1) テストID/遷移の設計
2) シナリオ実装/エミュレータ設定

- docs/features/proposal.md
- docs/features/ai_proposal.md
- docs/features/group.md
- development_flow/QA_Testing.md (QA.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: QA.3 Testing — E2E (Detox)

依頼文:
- ログイン→提案→合意→チャットの E2E シナリオをDetoxで自動化し、安定して通る状態にしてください。

提出物:
- E2E テスト、シナリオ、実行ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）