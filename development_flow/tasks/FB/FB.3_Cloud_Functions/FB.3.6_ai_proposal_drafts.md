# FB.3.6 Cloud Functions — Journal → AI Proposal Drafts

概要
- F14 ジャーナル投稿（`journalEntries/{entryId}` など）をトリガに、Flask AI の `POST /ai/proposal_drafts` を呼び出して提案ドラフトを生成し、Firestore に `status='draft'` で保存する。
- 保存後に通知アウトボックスへキューイングして、docs/features/ai_proposal.md に記載のプッシュ通知（送信/詳細/今はしない）を送る。
- 二重生成防止やエラー再試行、ドラフト有効期限管理を担う。

依存
- docs/firestore/proposals_schema.md（draftContext 定義）
- FB.3.4（journal asset の署名URL/メタデータ登録）
- FL.3.3（AI ドラフト生成 API）
- FL.3.4（`/journal_entries` create_proposal 起動）
- FB.3.5（通知アウトボックス/送信）

成果物
- functions: `aiProposals.onJournalEntryCreated`, `aiProposals.enqueueDraft`, `aiProposals.persistDraft`
- Firestore ドキュメント: `journalEntries/{id}`→`proposals/{proposalId}` の関連付け（`draftContext.journalEntryId`）
- 再試行/抑止のためのメタデータ（例: `journalEntries/{id}/aiDraftState`）

受け入れ条件
- ジャーナル投稿ごとに最大1件の AI ドラフトを生成し、既に `status!='draft'` な提案が存在する場合は再生成しない。
- Flask API 呼び出しで失敗した場合、指数バックオフで最大3回再試行し、永久失敗は監視対象ログ+DLQ（コレクション）へ記録する。
- 生成したドラフトを `proposals/{id}` に保存し、`source='ai'`, `draftContext`（journalEntryId, assetId, confidence, expiresAt）を設定する。
- 通知アウトボックスへ `proposal.ai_draft.ready` イベントを enqueue し、FB.3.5 が `[送信する][詳細を見る][今はしない]` の3アクションを持つ通知を送信できる状態にする。
- `expiresAt` を過ぎた `draft` は自動でクリーンアップ（状態 `draft-expired` 付与 or Firestore 削除）され、通知を再送しない。

手順(推奨)
1) Firestore/Storage トリガの選定（journal entry 作成 or asset メタ書き込み）と入力データの正規化。
2) Flask API 呼び出しのためのサービスアカウント HMAC/認証情報準備、およびリトライ制御実装。
3) Firestore 書き込みと通知アウトボックス enqueue、DLQ/メトリクスの整備。
4) Emulator での統合テスト（ジャーナル投稿→draft保存→通知イベント確認）。

参照
- docs/features/ai_proposal.md
- docs/features/journal.md
- development_flow/FB_Firebase.md (FB.3.6)
- development_flow/FL_FlaskAI.md (FL.3.3)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.6 Cloud Functions — Journal → AI Proposal Drafts

依頼文:
- ジャーナル投稿トリガから AI 提案ドラフトを生成し、Firestore への保存と通知アウトボックス enqueue、再試行/抑止を含めたワーカーを実装してください。

提出物:
- Functions コード、設定、テスト、エミュレータ検証ログ
- 失敗時再試行/抑止ポリシーのドキュメント
- テスト実行ログ（該当テストを実行した場合はログを添付）
