# FB.3.1 Cloud Functions — Proposals Lifecycle

概要
- create/react/cancel/status/approve_and_send など、提案のライフサイクル API/トリガを実装。
- F12 で生成された `draft` を `pending` へ昇格させ、F02/F03 の通常フローへ連結する。

依存
- docs/firestore/proposals_schema.md
- FB.2.2 Firestore Rules — Proposals ACL

成果物
- functions: proposals.create, proposals.react, proposals.cancel, proposals.updateStatus, proposals.approveAndSend

受け入れ条件
- `draft`→`pending` への遷移は `approve_and_send` コールのみ許可し、通知経由の権限（author のみ）を検証する。
- `pending`→`agreed|rejected|canceled` の遷移が docs/features/proposal.md の状態図に従い、一意に管理される。
- 反応集計が正しく反映され、全員 Like で `agreed`、Dislike または期限切れで `rejected` となる。匿名性ポリシー（提案者/リアクターは pending 中に公開しない）を守る。
- `approve_and_send` 実行時に F06 通知の送信完了（FB.3.5）を待たず Firestore 書き込みを完了し、遅延通知は outbox で再送制御する。
- すべての API で監査ログと詳細なエラーコード（docs/features/proposal.md の期待）を出力し、`draftContext` を含む。

手順(推奨)
1) HTTPS Callable or HTTPS endpoint 設計（`approve_and_send` は通知アクション/ディープリンクから呼び出す）。
2) バリデーション/権限チェック（draft の所有者のみ実行可）、匿名レスポンスのマスキング、期限チェック。
3) 監査ログ/エラーコード規約（AI 生成の識別用 source/draftContext を含める）と通知アウトボックス連携。

参照
- docs/features/proposal.md
- docs/features/ai_proposal.md
- development_flow/FB_Firebase.md (FB.3.1)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.1 Cloud Functions — Proposals Lifecycle

依頼文:
- proposals.create/react/cancel/updateStatus/approveAndSend の Functions を実装し、不正遷移の拒否と監査ログ出力を含めてください。AI ドラフトの `draft`→`pending` 遷移のテストも追加してください。

提出物:
- Functions コード、テスト、README（エラーコード/監査方針）
- エミュレータでの動作ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
