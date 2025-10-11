# RN.3.3 Service — Notifications

概要
- FCM 登録/受信ハンドラ/ナビゲーション連携の整備。
- AI ドラフト通知の3アクション（送信/詳細を見る/今はしない）をハンドリングし、`POST /proposals/{id}/approve_and_send` を直接呼び出すショートパスを提供する。

依存
- FB.3.5

成果物
- src/services/notifications.ts, 設定画面連携
- Deep Link/Navigation マップ（`proposal.ai_draft` → ProposalsDetail）

受け入れ条件
- 初回起動時に通知権限を確認し、拒否/許可の結果を RN.2.6 の設定画面へ反映する。トークンが更新された場合はサーバに再登録する。
- AI ドラフト通知（タイトル:「AIからの提案があります」等）がフォア/バック/終了状態いずれでも docs/features/ai_proposal.md の 3 アクションを正しく処理する。`送信する` はバックグラウンドでも `POST /proposals/{id}/approve_and_send` を実行し、完了後にローカル通知でフィードバックする。
- `詳細を見る` アクションはデータ付きディープリンク（`proposal.ai_draft/{id}`）で RN.2.1 の詳細画面を開き、AI 生成要素（提案文、候補日時、confidence）を表示できる。
- 「今はしない」は通知を閉じ、ドラフトは Firestore 上に残る。ユーザーの操作ログを送信しないまま終了できる。
- AI カテゴリが設定で OFF の場合やサインアウト状態では、通知を受信してもユーザーに表示せず破棄する。再ログイン後に未処理ドラフトがある場合は RN.2.1 の一覧から確認できるようバッジを表示する。

手順(推奨)
1) トークン登録/権限
2) 受信ハンドラ/Deep Link
3) 通知アクションごとの処理（送信→approveAndSend 呼び出し、詳細→画面遷移、今はしない→dismiss のみ）

参照
- docs/features/notification.md
- docs/features/ai_proposal.md
- docs/features/friend.md
- docs/features/group.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.3.3 Service — Notifications

依頼文:
- FCM のトークン登録/権限/受信ハンドラと Deep Link 連携を実装し、フォア/バック/終了状態での動作と AI ドラフト通知アクション（送信/詳細/今はしない）の処理を確認してください。

提出物:
- 実装差分、確認ログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
