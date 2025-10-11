# F06: 通知（Push）

最終更新: 2025-09-02 (Asia/Tokyo)

> アプリケーションの重要なイベントを、ユーザーがアプリを開いていなくてもプッシュ通知によって知らせる機能。

---

## 1. 目的
- ユーザーエンゲージメントを高め、重要な情報（新しい提案、合意成立、メッセージなど）を見逃さないようにする。
- アプリの利用を促し、コミュニケーションを活性化させる。

---

## 2. 機能概要
- バックエンドの各機能（提案、合意、チャット等）で発生したイベントをトリガーとして、プッシュ通知を送信する。
- Firebase Cloud Messaging (FCM) や Apple Push Notification service (APNs) と連携し、iOSおよびAndroidデバイスに対応する。
- ユーザーはアプリの設定画面から、通知の種類ごとにON/OFFを切り替えられる。

---

## 3. 通知のトリガーと内容

| 機能 | イベント             | 通知タイトル                  | 通知ボディ                                 |
|------|----------------------|-------------------------------|--------------------------------------------|
| F02  | 新しい提案の受信     | 新しい提案があります          | 「（提案タイトル）」が届きました。          |
| F03  | 提案へのリアクション | リアクションがありました      | 「（提案タイトル）」に新しい反応があります。|
| F03  | 合意成立             | 合意が成立しました！          | 「（提案タイトル）」の参加者が揃いました。  |
| F03  | 合意不成立           | 提案が不成立となりました      | 「（提案タイトル）」は残念ながら不成立です。|
| F04  | 新着メッセージ       | （ユーザー名）さんから新着    | 「（グループ名）」にメッセージがあります。  |
| F05  | 日程決定             | 日程が決定しました            | 「（グループ名）」は（日付）に決まりました。|
| F05  | 予定のリマインダー   | 予定のリマインダー            | 「（グループ名）」は明日です。              |
| F15  | フレンド申請の受信 | フレンド申請が届きました      | 「（ユーザー名）」さんからフレンド申請です。 |
| F15  | フレンド承認       | フレンドになりました          | 「（ユーザー名）」さんとフレンドになりました。|

---

## 4. 内部インターフェース
この機能は外部APIを公開せず、バックエンド内のサービスとして提供されます。

**`NotificationService.send(user_ids, title, body, data)`**
- `user_ids` (list): 通知を送信するユーザーIDのリスト。
- `title` (str): 通知のタイトル。
- `body` (str): 通知の本文。
- `data` (dict): 通知をタップした際の画面遷移先など、追加データ。（例: `{"screen": "ProposalDetail", "id": 123}`）

イベント別 `data` 例
- Proposal: `{ "screen": "ProposalDetail", "proposal_id": 123 }`
- Group Message: `{ "screen": "GroupChat", "group_id": 99 }`
- Schedule Confirmed: `{ "screen": "GroupDetail", "group_id": 99 }`
- Friend Request: `{ "screen": "FriendRequests", "request_id": 555 }`
- Friend Accepted: `{ "screen": "FriendList" }`

---

## 5. データモデル

### `notification_tokens` テーブル
```sql
CREATE TABLE notification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_type TEXT NOT NULL, -- 'ios' or 'android'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## 6. 実装フロー

1.  **クライアント**: 
    - アプリ起動時に、OSからプッシュ通知の許可をユーザーに求める。
    - 許可された場合、FCM/APNsからデバイストークンを取得する。
    - 取得したトークンを、バックエンドの `POST /me/devices` に送信する。
2.  **バックエンド**:
    - クライアントから受け取ったトークンを `notification_tokens` テーブルに保存（Upsert）。
    - 各機能で通知イベントが発生したら、`NotificationService` を呼び出す。
    - `NotificationService` は、対象ユーザーのトークンをDBから取得し、FCM/APNsのAPIを叩いて通知を送信する。

---

## 7. セキュリティとプライバシー
- 通知の本文に、機密性の高い個人情報（メールアドレス、氏名など）を含めない。
- ユーザーがアプリの設定で通知を簡単に無効化できるようにする。

---

## 8. 受け入れ基準（AC）
- ✅ ユーザーは通知設定をON/OFFできる。
- ✅ 「新しい提案」を受信した際に、プッシュ通知が届く。
- ✅ 「合意が成立」した際に、参加者全員にプッシュ通知が届く。
- ✅ 「新着メッセージ」を受信した際に、グループメンバー（送信者を除く）にプッシュ通知が届く。
- ✅ 「予定のリマインダー」が、予定の前日に届く。
- ✅ 通知をタップすると、アプリの関連画面が正しく開く。
- ✅ フレンド申請を受信した際に、相手の表示名付きで通知が届く。
- ✅ フレンド承認された際に、通知が届き、友だち一覧へ遷移できる。
