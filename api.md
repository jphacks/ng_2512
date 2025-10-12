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
        deadline_at: datetime,
        status: enum,
        participants: [
            {
                user_id: int,
                account_id: string,
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
UPDATE
/api/proposal/[proposal_id]
{
    user_id: int,
    status: enum
},
{
    とくになし
}
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
POST
/api/chat/groupe
{
    title: string,
    member_ids: string[]
},
{
    とくになし
}
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
        sender_icon_url: string,
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
    user_id: int
},
[
    {
        body: string,
        image: binary
    },
    ...
]
```

```
POST
/api/chat/[groupe_id]/member
{
    invite_user_id: int
},
{
    とくになし
}
グループにフレンドを追加するエンドポイント
```

## アルバム

```
GET
/api/album
{
    user_id: int,
    oldest_album_id: int/null
},
[
    {
        album_id: int,
        title: string,
        last_uploaded_image_url: string,
        image_num: int,
        shared_user_num: int
    },
    ...
]
新しいアルバムが上に来るように。
oldest_album_id以前のチャットを10件ずつ取得。
```

```
POST
/api/album
{
    user_id: int,
    title: string
},
{
    とくになし
}
アルバム作成エンドポイント
```

```
GET
/api/album/[album_id]
{
    user_id: int,
    oldest_image_id: int/null
},
[
    {
        is_creator: boolen  #アルバム作成者かどうかのbool値
        image_id: int,
        image_url: string
    },
    ...
]
新しい写真が上に来るように。
oldest_image_id以前の写真を30件ずつ取得。
```

```
POST
/api/album/[album_id]
{
    photo: binary[]
},
{
    とくになし
}
アルバムに写真を追加するエンドポイント
```

```
UPDATE
/api/album/[album_id]
{
    title: string
    shared_user_ids: string[]
},
{
    とくになし
}
アルバム設定を変更するエンドポイント。タイトルを更新するとともにリクエストに含まれているユーザーをalbum_shared_usersに登録し、含まれていないユーザーを削除する
```

## フレンド

```
GET
/api/friend
{
    user_id: int,
},
{
    friend: [
        {
            user_id: int,
            account_id: string,
            display_name: string,
            icon_asset_url: string,
            updated_at: datetime
        },
        ...
    ],
    friend_requested: [
        {
            user_id: int,
            account_id: string,
            display_name: string,
            icon_asset_url: string,
            updated_at: datetime
        },
        ...
    ],
    friend_recommended: [
        {
            user_id: int,
            account_id: string,
            display_name: string,
            icon_asset_url: string,
            updated_at: datetime
        },
        ...
    ],
    friend_requesting: [
        {
            user_id: int,
            account_id: string,
            display_name: string,
            icon_asset_url: string,
            updated_at: datetime
        },
        ...
    ],
    friend_blocked: [
        {
            user_id: int,
            account_id: string,
            display_name: string,
            icon_asset_url: string,
            updated_at: datetime
        },
        ...
    ]
}
各種フレンド情報をまとめて取得
```

```
POST
/api/friend/search
{
    input_text: string
},
[
    {
        user_id: int,
        account_id: string,
        display_name: string,
        icon_asset_url: string
    },
    ...
]
新しいアルバムが上に来るように。
oldest_album_id以前のチャットを10件ずつ取得。
```

```
UPDATE
/api/friend/request
{
    user_id: int,
    friend_user_id: int,
    updated_status: enum
}
```

## 設定

```
POST
/api/user/create
{
    account_id: string,
    display_name: string,
    icon_image: binary/null,
    face_image: binary,
    profile_text: string/null
},
{
    user_id: int
}
認証の代わりにユーザーを登録する仮のエンドポイント
同じaccoun_idがDBに存在していたらデータを上書き
```

```
UPDATE
/api/user
{
    user_id: int,
    account_id: string,
    display_name: string,
    icon_image: binary/null,
    face_image: binary/null,
    profile_text: string/null
},
{
    とくになし
}
```
