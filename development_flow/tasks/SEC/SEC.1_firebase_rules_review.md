# SEC.1 Review — Firebase Rules/ACL

概要
- Firestore ルールの最小権限/例外ケースのレビューとテスト。

依存
- FB.2.*

成果物
- ルール改善提案/差分、テストケース

受け入れ条件
- 権限昇格/情報漏えいの主要パスが封じられており、docs/features/proposal.md / group.md / friend.md / journal.md のアクセス要件を満たす。
- ルール変更が自動テスト（rules-unit-testing）で検証され、CI に組み込まれる。

手順(推奨)
1) 読み/書き/リストの境界検査
2) 単体/統合の負テスト

参照
- docs/features/proposal.md
- docs/features/group.md
- docs/features/friend.md
- docs/features/journal.md
- development_flow/SEC_Security.md (SEC.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: SEC.1 Review — Firebase Rules/ACL

依頼文:
- Firestore ルールの最小権限レビューを行い、権限昇格/情報漏えいの主要パスを負テストで封じてください。

提出物:
- 改善差分、テスト、検証ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）