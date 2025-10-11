# FB.3.5 Cloud Functions — Notifications

概要
- 申請/承認/提案/合意/リマインド/AI ドラフト通知を送出。
- docs/features/ai_proposal.md の通知 UX を実現するペイロード/アクションを整備する。

依存
- FB.3.1〜3.4 のイベント

成果物
- functions: notifications.dispatch(event)
- 通知ペイロード規約（`proposal.ai_draft.ready` の `[送信する][詳細を見る][今はしない]` アクション含む）

受け入れ条件
- 当事者のみに送信し、通知設定（`notifications.preferences`）が OFF の場合は送信しない。
- docs/features/notification.md のイベント一覧（提案/リアクション/合意/メッセージ/スケジュール/リマインダー/フレンド申請・承認/ジャーナル記念日）すべてに対応し、重複送信を防止する。
- AI ドラフト通知は 3 つのアクションを含み、`送信する` は `proposals.approveAndSend` を呼び出すディープリンク/HttpsCallable、`詳細を見る` は RN の提案詳細画面を開く。
- 「今はしない」は通知を閉じ、ドラフトは `expiresAt` まで残す（再通知しない）。
- 失敗時のリトライ/バックオフと監査ログ出力を行い、メトリクスで配信成功率を監視できる。

手順(推奨)
1) イベント購読/共通フォーマッタ（`proposal.ai_draft.ready` を含める）。
2) FCM 送出/トピック設計（アクションボタンと Deep Link パラメータ）と通知設定チェック。
3) エラーログ/再送制御、メトリクス連携。
4) Emulator で AI ドラフト通知のアクション挙動とフレンド/メッセージ通知を検証。

参照
- docs/features/notification.md
- docs/features/proposal.md
- docs/features/group.md
- docs/features/friend.md
- docs/features/ai_proposal.md
- development_flow/FB_Firebase.md (FB.3.5)

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.5 Cloud Functions — Notifications

依頼文:
- 主要イベント（申請/承認/提案/合意/リマインド/AIドラフト）の通知送出を実装し、重複防止と再送制御を組み込んでください。AI ドラフト通知の3アクションの動作確認も含めてください。

提出物:
- 通知ディスパッチャ、設定、テスト、運用メモ
- テスト実行ログ（該当テストを実行した場合はログを添付）
