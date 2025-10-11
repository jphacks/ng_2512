# RN.2.3 Screen — Friends

概要
- 申請/承認/取消/解除 UI と Functions 連携。

依存
- docs/firestore/friendships_schema.md
- FB.3.3 Cloud Functions — Friends Flow

成果物
- src/app/friends/*

受け入れ条件
- 当事者のみ操作可能で、docs/features/friend.md のペンディング/承認/却下/解除フローに追従する。
- 重複申請は UI 上で防ぎ、ブロック状態では申請できない。
- 通知タップから該当画面に遷移し、申請/承認結果が即座に反映される。
- フレンド一覧にユーザー名検索バーを設置し、部分一致で絞り込みできる。
- 申請送信は UID ではなく `@username` 入力で行い、存在しない・自分自身への申請はバリデーションで防ぐ。

手順(推奨)
1) 一覧/申請/承認UI
2) functions 呼び出し
3) トースト/エラー

参照
- docs/features/friend.md

---
依頼テンプレート（Codex向け・コピペ可）

タスクID: RN.2.3 Screen — Friends

依頼文:
- 申請/承認/取消/解除 UI と Functions 連携を実装し、当事者のみ操作可能であることを確認してください。

提出物:
- 画面/呼出コード、動作確認動画orログ
- テスト実行ログ（該当テストを実行した場合はログを添付）
