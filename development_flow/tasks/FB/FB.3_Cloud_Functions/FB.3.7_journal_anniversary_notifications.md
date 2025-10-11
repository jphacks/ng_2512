# FB.3.7 Cloud Functions — Journal Anniversary Notifications

概要
- docs/features/journal.md の要件に基づき、「1年前/数年前の今日の思い出」を毎日チェックしてユーザーへプッシュ通知（F06）を送信するバッチ Function を実装する。
- ジャーナル通知は AI 提案導線（F12）と連携し、「このメンバーでまた集まろう」ボタンで提案作成画面へ遷移できる deeplink を含める。

依存
- FB.3.4（署名URLメタデータ）
- FB.3.5（通知ディスパッチャ）
- FL.3.4（`/journal_entries` API）

成果物
- `functions/src/journal/anniversary.ts`（または同等の Cloud Functions スケジュールジョブ）
- Firestore/Firebase Storage から参照するためのサービスアカウント設定、環境変数

受け入れ条件
- 毎日 JST 9:00 等の所定時刻に scheduler から起動し、`journal_entries` の `entry_date` と現在日付が一致するエントリを本人分だけ取得して通知をキューイングする。
- 通知は docs/features/notification.md に準拠し、タイトル/本文に思い出の概要とタグ付けした友人名を含める。`details` アクションで RN ジャーナル詳細画面を開き、`propose_again` アクションで F12 提案フローへ遷移する。
- 通知設定で Journal リマインドが OFF のユーザーには送信しない。AI カテゴリが OFF でも journal リマインドは送れるが、`propose_again` アクションは非表示にする。
- 送信済みエントリは重複通知しないよう Firestore に `notifications/journalAnniversary/{entryId}` 等のステートを記録し、ユーザーが通知から提案を作成した場合にも記録を更新する。
- 失敗時は再試行バックオフとログ出力を行い、Cloud Monitoring で通知成功率/エラーをトラックする。

手順(推奨)
1) Scheduler + Pub/Sub or `functions.pubsub.schedule` のジョブ定義
2) `/journal_entries` API から対象データを取得し、`notifications.dispatch` に送るペイロードを生成
3) 重複防止ステートの Firestore 設計と更新処理
4) Emulator でテストデータを用意し、擬似日付で通知キューイングを検証

参照
- docs/features/journal.md
- docs/features/notification.md
- development_flow/tasks/FB/FB.3_Cloud_Functions/FB.3.5_notifications.md
- development_flow/tasks/FL/FL.3_API/FL.3.4_journal_entries.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: FB.3.7 Cloud Functions — Journal Anniversary Notifications

依頼文:
- ジャーナルの記念日通知ジョブを実装し、重複防止と通知設定の反映、提案フローへの deeplink を含めてください。Emulator またはローカルでの検証ログも提示してください。

提出物:
- Cloud Functions 実装、スケジュール設定、Firestore ステート設計
- テスト実行ログ（エミュレーションまたはユニットテスト）
