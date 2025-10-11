# F14: 思い出ジャーナル

最終更新: 2025-09-02 (Asia/Tokyo)

> ユーザーが過去の写真を投稿・整理し、それを元に再会のきっかけを作ることができる機能。ユーザーが自発的に写真をアップロードする動機付けとなることを目指す。

---

## 1. 目的
- ユーザーにアプリを定期的に利用する楽しみを提供し、エンゲージメントを高める。
- 過去の楽しい体験をリマインドすることで、知人との再会提案への自然な動線を創出する。
- 提案の元となる写真やコンテキストを、ユーザーが自発的にアプリ内に蓄積するインセンティブを提供する。

---

## 2. 機能概要
- ユーザーは、アプリ内に思い出の写真と簡単なメモを投稿し、プライベートなジャーナルとして保存できる。
- 投稿された写真は、写っている人物（F11の技術を利用）や日付で自動的に整理・タグ付けされる。
- 「1年前の今日の思い出」のように、過去の出来事をプッシュ通知（F06）で知らせる。
- ジャーナルに記録された思い出から、ワンタップで写っているメンバーへの再会提案（F12）を簡単に作成できる。

---

## 3. UI/UX
- アプリのメインナビゲーションに「ジャーナル」タブを新設する。
- ジャーナル画面は、投稿された思い出が日付の降順で表示されるタイムライン形式とする。
- 思い出の投稿画面では、写真の選択、写っている人物のタグ付け（AIによる候補表示あり）、日付の指定、メモの入力が可能。
- 各思い出の詳細画面には、「このメンバーでまた集まろう」ボタンを配置。タップすると、F12（AI提案自動送信）の確認画面に遷移する。

---

## 4. API 定義

### 4.1 `POST /journal_entries`
新しい思い出を投稿します。
- **Request**: `multipart/form-data` で画像ファイル、日付、メモ、人物タグなどを送信。

### 4.2 `GET /journal_entries`
自分の思い出ジャーナルの一覧を、ページネーションで取得します。

### 4.3 `PUT /journal_entries/{id}`
既存の思い出のメモなどを編集します。

### 4.4 `DELETE /journal_entries/{id}`
思い出を削除します。

### 4.5 `POST /journal_entries/{id}/create_proposal`
特定の思い出から、再会の提案を生成します。
- **Processing**: バックエンドは指定された思い出の情報を元に、F12の提案生成ロジックを呼び出し、生成された提案内容をクライアントに返す。

---

## 5. データモデル

### `journal_entries` テーブル
```sql
CREATE TABLE journal_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_path TEXT NOT NULL,
    note TEXT,
    entry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### `journal_entry_tags` テーブル
```sql
CREATE TABLE journal_entry_tags (
    entry_id BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    tagged_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tagged_user_id)
);
```

---

## 6. 他機能との連携
- **F11 (知人マッチング)**: 思い出の写真を投稿する際、`POST /contacts/match_from_image` を内部的に利用し、写っている人物を自動で検出してタグ付けを補助する。
- **F06 (通知)**: バッチ処理で、毎日「〇年前の今日の思い出」をチェックし、該当するユーザーにプッシュ通知を送信する。
- **F12 (AI提案)**: 「このメンバーでまた集まろう」機能で、思い出の写真と人物タグをコンテキストとして、精度の高い再会提案を自動生成する。

---

## 7. 受け入れ基準（AC）
- ✅ ユーザーは写真とメモをジャーナルに投稿できる。
- ✅ 投稿時に、写真に写っている友人が自動でタグ候補として表示される。
- ✅ 過去の同じ日付の思い出がある場合、プッシュ通知が届く。
- ✅ 思い出の詳細画面から、写っているメンバーへの再会提案をワンタップで作成できる。
- ✅ 自分のジャーナルは、他のユーザーからは見えない。
