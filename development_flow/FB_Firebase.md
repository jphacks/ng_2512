# FB: Firebase（認証/業務データ/リアルタイムの権威）

最終更新: 2025-09-02

## FB.1 Firestoreスキーマ
- FB.1.1 proposals/{id} + audiences + slots
  - 目的: 提案と受信者反応、日時候補を正規化。
  - 入出力: create/react/cancel/status/approve_and_send の Functions が利用。
  - 受け入れ: status 遷移（draft→pending→agreed/rejected/canceled）が一意に定まる。
- FB.1.2 groups/{id}, groupMembers, groupMessages/{id}/messages/{id}
  - 目的: 合意成立後のチャット用スキーマ。
  - 入出力: groups生成トリガ、RN購読。
  - 受け入れ: メンバー以外は取得不可、並び順/ページング満たす。
- FB.1.3 presence/{userId}
  - 目的: online/lastSeen/typingIn のリアルタイム表示。
  - 入出力: RN が本人書込、他はread。
  - 受け入れ: セッション切断で適切に lastSeen 更新。
- FB.1.4 friendships / friend_requests
  - 目的: 相互承認（F15）モデル。
  - 入出力: friends.* Functions（申請/承認/取消/解除）。
  - 受け入れ: 同一ペア pending 重複禁止、承認で確定関係作成。

## FB.2 セキュリティルール
- FB.2.1 Groups 読取/書込ACL
  - ルール: isGroupMember(groupId) のみ read/write。messages は作者のみ更新/削除可。
- FB.2.2 Proposals 当事者ACL
  - ルール: proposer または audience に限定。
- FB.2.3 Presence 本人のみ書込
  - ルール: request.auth.uid == doc.userId のみ write。

## FB.3 Cloud Functions
- FB.3.1 proposals.create/react/cancel/status/approve_and_send
  - 詳細: audienceIds はフレンド限定、AI draft の `approve_and_send` を author のみ許可し、匿名集計を維持。
- FB.3.2 proposals.agreed トリガ
  - 詳細: status=agreed 検出→ groups 作成、members 登録、初期Botメッセージ。
- FB.3.3 friends.*
  - 詳細: 申請作成/承認/却下/取消、一覧/解除。通知連携。
- FB.3.4 S3 署名URL
  - 詳細: journal/photos 用の PUT 署名を発行、期限短寿命。
- FB.3.5 通知トリガ
  - 詳細: 申請/承認/提案/合意/リマインド/AIドラフト通知。preferences.friend 等のトグル尊重。
- FB.3.6 Journal→AI Draft オーケストレーション
  - 詳細: ジャーナル投稿を検知→AIドラフト生成APIを呼び出し→Firestore保存→通知アウトボックス enqueue。

## FB.4 Auth 統合
- Google Sign-In → signInWithCredential。RN 側 useAuth で状態流。

## FB.5 運用
- デプロイ: `firebase deploy`、Rules/Functions を分離。
- ロギング: Cloud Logging、Error Reporting。
- エミュレータ: ローカル統合試験で使用。
