# RN.2.12 Screen — AI Assist Approvals

概要
- F12「AIアシスタントによる提案サジェスト」で生成されたドラフトはバックエンドジョブが起動し、ユーザーにはプッシュ通知で承認依頼だけが届く。モバイル側はAI推論や `/ai/*` を直接叩かず、承認/拒否（+必要に応じて詳細表示）に特化した体験を実装する。
- 通知から遷移した先でドラフト内容（宛先、タイトル、本文、候補日時など）を確認できるシンプルな画面を用意し、決定アクションが既存の提案フロー（F02/F03/F06）と一貫するようにする。
- 承認結果やキャンセルをサーバへ即時反映し、同じドラフトが重複して提示されないようにする。

依存
- RN.1.6（F06 通知ハンドリングとディープリンク遷移）
- RN.2.2（提案詳細/リスト表示の共通UIコンポーネント）
- RN.3.1（API クライアントの認証/リトライ基盤）

成果物
- `mobile/src/navigation/NotificationRoutes.ts` に AI 提案承認用ルートを追加
- `mobile/src/screens/ai/AiProposalReviewScreen.tsx`（通知から開くレビュー画面）
- `mobile/src/services/proposals.ts` へ `approveDraftProposal(id: string)` / `dismissDraftProposal(id: string)` を追加
- `mobile/src/i18n/*` に通知文言/ボタンテキスト/結果トーストの翻訳キーを登録

受け入れ条件
- プッシュ通知（`{ "screen": "AiProposalReview", "proposal_id": "..." }`）をタップすると、AI生成ドラフトの概要を表示する画面へ遷移できる。画面では宛先リスト、提案タイトル、本文、候補日時が読み取り可能であり、VoiceOver/TalkBack でも順序良く読み上げられる。
- 「送信する」を押すと `POST /proposals/{id}/approve_and_send` を呼び出し、成功後は送信完了のフィードバックを表示して `pending` 状態の通常提案一覧へ戻る。失敗時はリトライ/詳細表示付きのエラー表示を行い、再送を試みられる。
- 「今はしない」を押すか通知を閉じると、ドラフトがクライアント側で既読扱いとなり、`dismissDraftProposal`（サーバ側で通知済みフラグを更新するエンドポイント）を呼び出す。成功時はサイレントに閉じる。エラーが発生した場合でもユーザーにはログ保存/サポート連絡の導線を示し、同じ通知が無限に再表示されないようバックオフする。
- 主要文言（通知タイトル/本文、ボタン、結果トースト、エラー説明）は i18n 化され、日本語/英語のロケールで自然な表現が表示される。
- UI から直接 `/ai/themes/suggest` や `/ai/people/match` を呼び出す処理は存在せず、AI 推論に関する実装はサーバのみで完結していることが確認できる。

手順(推奨)
1. 通知ハンドラーに `AiProposalReview` ペイロードを追加し、該当 proposal_id をストアへ連携
2. `AiProposalReviewScreen` で提案ドラフトを取得（`GET /proposals/{id}`）し、承認/拒否ボタンと状態管理（ローディング・エラー・送信成功）を実装
3. `proposals.ts` に承認/却下 API ラッパーと例外処理を追加し、結果を既存の提案リストへ反映（キャッシュ無効化/再フェッチ）
4. トースト・アラート・アクセシビリティ文言を i18n へ追加し、ユニットテスト/スナップショットで承認フローをカバー

参照
- docs/features/ai_proposal.md
- docs/features/notification.md
- docs/backend/api-spec.md (`POST /proposals/{id}/approve_and_send`)
- mobile/tests/apiClient.test.mts（API ラッパーのテスト雛形）

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.12 Screen — AI Assist Approvals

依頼文:
- AI 提案通知から遷移する承認/拒否フローを実装し、`POST /proposals/{id}/approve_and_send` とドラフト却下エンドポイントを呼び出すようにしてください。クライアントから AI 推論 API を直接利用しないことを確認できる実装をお願いします。

提出物:
- 通知ハンドラー/画面/サービスの差分
- 承認/却下パスの動作確認ログ（任意）
