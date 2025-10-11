# FB.3.2 Cloud Functions — Agreed → Group Creation

概要
- proposal が agreed になった際に group を自動生成し、F04（グループ&チャット）の要件どおりメンバー登録と初期Botメッセージ投稿まで完了させるトリガ。

依存
- docs/firestore/proposals_schema.md
- docs/firestore/groups_messages_schema.md
- FB.2.1 Firestore Rules — Groups ACL
- FB.2.2 Firestore Rules — Proposals ACL
- FB.3.1 Cloud Functions — Proposals Lifecycle

成果物
- onWrite/onUpdate トリガ: proposals.status==agreed → groups と members の作成、および Bot の初期メッセージ挿入

受け入れ条件
- 冪等（再実行でも重複しない）。`originProposalId` ごとに一意な group を生成。
- グループとメンバーが正しく作成され、メンバーは提案者と audiences 全員（いずれも proposer のフレンド）である。
- Bot（system user）が docs/features/group.md に記載されたスタイルの初期メッセージ（合意成立通知）を投稿する。
- エラー時は監査ログとリトライ戦略が記録され、重複メッセージが作成されない。

手順(推奨)
1) トリガ実装（条件: status 遷移検出）
2) 冪等キー（proposalId）で保護
3) 監査ログとエラーハンドリング

参照
- docs/features/proposal.md
- docs/features/group.md
- development_flow/FB_Firebase.md (FB.3.2)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.2 Cloud Functions — Agreed → Group Creation

依頼文:
- proposal の status が agreed へ遷移した際、冪等に group と members を作成するトリガを実装してください。

提出物:
- トリガコード、冪等性検証、監査ログ
- エミュレータの検証手順/ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
