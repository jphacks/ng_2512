## 通知

```
GET
/api/notification
{
    user_id: int
},
{
    proposal_num: int,      # 未回答の提案の数
    new_chat_num: int,      # 未読のチャットの総数
    friend_request_num: int # requestedのフレンド申請の数
}
```

## 提案

```
GET
/api/proposal
{
    user_id: int
},
[
    {
        id: int,
        title: string,
        event_date: date,
        location: string,
        creator_id: int,
        created_at: datetime,
        deadline_at: datetime
        participants: [
            {
                user_id: int,
                status: enum,
                display_name: string,
                icon_asset_url: string
            },
            ...
        ]
    },
    ...
]

ユーザーに提案された提案をすべて取得。
(締切日を超えたもの、成立したもの、不成立のものは除く)
```

```
POST
/api/proposal
{
    user_id: int,
    title: string,
    event_date: datetime,
    location: string,
    participant_ids: string[]
},
{
    とくになし
}
```

```
GET
/api/proposal/ai
{
    user_id: int,
},
{
    title: string,
    event_date: datetime,
    location: string,
    participant_ids: string[]
}
```

## チャット

```
GET
/api/chat
{
    user_id: int,
},
[
    {
        chat_groupe_id: int,
        title: string,
        icon_url: string,
        last_message: string,         最新のチャットメッセージ
        last_message_date: datetime,  最新のチャットが送信された時間
        new_chat_num: string          未読のチャット数
    },
    ...
]
last_message_dateが遅い順でソート(最近更新されたグループが上に来るように)
```

```
GET
/api/chat/[groupe_id]
{
    oldest_chat_id: int/null
},
[
    {
        chat_id: int,
        sender_id: int,
        sender_name: string,
        body: string,
        image_url: string,
        posted_at: datetime
    },
    ...
]
oldest_chat_id以前のチャットを20件ずつ取得
```

```
POST
/api/chat/[groupe_id]
{
    user_id: string
},
[
    {
        body: string,
        image: binary
    },
    ...
]
```
