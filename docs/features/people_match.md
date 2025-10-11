# F11: 知人マッチング（写真共有から）

最終更新: 2025-09-02 (Asia/Tokyo)

> ユーザーが外部アプリから**OSの共有機能を通じて受け取った写真**に写っている人物を、Flaskサーバー上のローカルAIによって解析し、提案の宛先候補として提示する機能。外部AIサービスは利用しません。

---

## 1. 目的
- グループ写真を元に、提案したい相手を一度に選択できるようにする。
- 提案の宛先を手動で一人ずつ検索・追加する手間を大幅に削減する。

---

## 2. 機能概要（フレンド内）
- 共有画像は `asset_id` で管理。Flask AI サービスはDBの `face_embeddings` を参照して候補を検索（必要に応じて再計算）。
- 候補は「現在ユーザーのフレンド（friendships）」の中から、かつオプトイン済ユーザに限定。
- **オプトイン必須**: 照合対象はオプトイン済ユーザのみ（DBに基準顔ベクトルを保持）。

---

## 3. プライバシーとオプトイン

本機能はプライバシーに大きく関わるため、以下の原則を厳守する。

- **オプトイン必須**: デフォルトOFF。設定から明示的にON。
- **基準写真の登録**: サーバAPI経由で1枚登録し、サーバで埋め込みを生成・保存（`users.face_embedding` など）。
- **利用目的の明示**: 顔データはサーバ内で安全に保管し、照合用途のみに使用。削除請求で完全削除。

---

## 4. UI/UX
- **主フロー（共有機能）**: 
  1. ユーザーが外部アプリで写真を選択し、「共有」→ Recallアプリを選択。
  2. Recallアプリが起動し、即座に顔解析が開始される。
  3. 解析完了後、写真の上に検出された顔領域が四角で囲われ、それぞれに候補ユーザーのアイコンと名前が表示される。
- **補助フロー（アプリ内）**: 
  - 宛先選択画面に「写真に写っている人を選ぶ」ボタンを配置することも可能。この場合、ボタンはOSの画像ギャラリーを起動する。

---

## 5. API 定義（フレンド制約）

### 5.1 `POST /users/me/face_embedding`
オプトインしたユーザーが、顔検索の基準となる自分の顔写真を登録/更新。
- Request: `multipart/form-data` 画像
- Processing: サーバで顔検出→埋め込み生成→DB保存

### 5.2 `POST /contacts/match_from_image`
写真をアップロードし、写っている人物の候補リストを取得。
- Request: `multipart/form-data` 画像 or `{ "asset_id": "ulid" }`
- Response: `matched_faces`（顔領域+候補ユーザ）。候補は「リクエストユーザのフレンド ∩ オプトイン済み」に限定。

---

## 6. データモデル

### `users` への拡張
```sql
ALTER TABLE users ADD COLUMN face_embedding_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN face_embedding VECTOR(512);
```
または `face_embeddings` テーブルに分離し、複数枚に対応。

検索時の条件（例）
```sql
-- requester_id のフレンドで、かつ face_embedding が存在するユーザのみを対象
SELECT u.id, u.display_name, 1 - (fe.embedding <=> :q) AS score
FROM friendships f
JOIN users u ON (u.id = CASE WHEN f.user_id_a = :requester THEN f.user_id_b ELSE f.user_id_a END)
JOIN face_embeddings fe ON fe.user_id = u.id
WHERE (f.user_id_a = :requester OR f.user_id_b = :requester)
ORDER BY fe.embedding <-> :q
LIMIT :k;
```

---

## 7. AI/MLモデルと実装フロー

1.  事前準備（オプトイン）: 設定で機能ON→基準顔を `POST /users/me/face_embedding` で登録。
2.  クライアント: 共有画像をアップロード（署名URL/`asset_id`）。
3.  サーバ: 顔検出→埋め込み生成→`face_embedding_enabled = true` のユーザと照合→候補返却。

---

## 8. 受け入れ基準（AC）
- ✅ スマートフォンの写真アプリから「共有」機能で本アプリを選択すると、顔認識が開始される。
- ✅ オプトインしていないユーザーの顔写真は、登録も検索もされない。
- ✅ 設定画面から、いつでも顔検索機能をOFFにできる。
- ✅ 登録済みのユーザーA, Bが写った写真を共有すると、AとBがそれぞれの顔候補として正しく表示される。
- ✅ アプリに未登録の人物や、オプトインしていないユーザーが写っていても、候補としては表示されない。
