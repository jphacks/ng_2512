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

},
{
    proposal_num: int,      # 未回答の提案の数
    new_chat_num: int,      # 未読のチャットの総数
    friend_request_num: int # requestedのフレンド申請の数
}
```
