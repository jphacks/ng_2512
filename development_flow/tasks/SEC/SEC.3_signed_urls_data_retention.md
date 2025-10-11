# SEC.3 Policy — Signed URLs & Data Retention

概要
- 署名URLの寿命/権限/公開範囲とデータ保持/削除ポリシー策定。

依存
- なし（ポリシー先行。FB.3.4 / RN.2.4 は利用側）

成果物
- 運用ポリシー文書、設定例

受け入れ条件
- 短寿命/限定公開、削除請求フローが定義済み（docs/features/journal.md の要件に準拠）。
- メタデータ（owner/origin）、SSE、パス制約、ライフサイクルポリシー（オーファン掃除/Retention）が定義され、SEC.3 のサンプル設定を提供する。
- 削除請求（本人/退会/通報）と AI モデル再学習時のデータ扱いをドキュメント化する。

手順(推奨)
1) 期限/権限/パス制約
2) ライフサイクル/削除運用

参照
- docs/features/journal.md
- docs/features/ai_proposal.md
- development_flow/SEC_Security.md (SEC.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: SEC.3 Policy — Signed URLs & Data Retention

依頼文:
- 署名URLの寿命/権限/公開範囲とデータ保持/削除のポリシーを策定し、設定例と運用手順をまとめてください。

提出物:
- ポリシー文書、設定例、運用フロー図
- テスト実行ログ（該当テストを実行した場合はログを添付）