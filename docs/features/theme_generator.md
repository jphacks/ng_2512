# F10: 遊びテーマ生成（写真共有から）

最終更新: 2025-09-02 (Asia/Tokyo)

> ユーザーが外部アプリ（フォトライブラリ等）から**OSの共有機能を通じて受け取った写真**の文脈を、Flaskサーバー上のローカルAI（CLIPモデル）が解釈し、関連性の高い「遊びのテーマ」を自動で提案する機能。外部AIサービスは利用しません。

---

## 1. 目的
- 提案のアイデア出しを支援し、「何をしようか」と考える心理的ハードルを下げる。
- ユーザーが普段使っている写真アプリから、シームレスな操作で提案を作成できるようにする。

---

## 2. 機能概要
- ユーザーは、写真アプリで写真を共有し、共有先として本アプリを選ぶ。
- 画像はアップロード済みの `asset_id` に紐付けられ、Flask AI サービスはDBの `image_embeddings` を参照して近傍検索を行う（必要に応じて埋め込み再計算）。
- chatgpt-oss-20b により候補テーマ名を生成し、上位候補を返す。
- ユーザーは提示されたテーマから 1 つ選び、提案作成（F13）のテンプレに適用。

---

## 3. UI/UX
- **主フロー（共有機能）**: 
  1. ユーザーが外部アプリで写真を選択し、「共有」→ Recallアプリを選択。
  2. Recallアプリが起動し、即座にテーマ解析が開始される（必要に応じてローディング画面を表示）。
  3. 解析完了後、類似度順にソートされたテーマのリストがモーダル等で表示される。
- **補助フロー（アプリ内）**: 
  - 従来通り、提案作成画面に「写真からテーマを選ぶ」ボタンを配置することも可能。この場合、ボタンはOSの画像ギャラリーを起動する。

---

## 4. API 定義

### 4.1 `POST /themes/suggest_from_image`
選択された画像（または `asset_id`）をサーバーに渡し、類似するテーマ候補を取得します。
- Request: `multipart/form-data`（画像） もしくは `{ "asset_id": "ulid" }`
- Response: `{ "suggested_themes": ["カフェ", "ボドゲ", ...] }`

---

## 5. データモデル

テーマ語彙と埋め込み、サジェスト結果のログを管理します。詳細は `docs/backend/data-model.md` の該当節も参照。

1) テーマ語彙（候補のマスタ）
```sql
CREATE TABLE theme_vocab (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  lang       TEXT NOT NULL DEFAULT 'ja',
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name, lang)
);

CREATE TABLE theme_embeddings (
  theme_id   BIGINT NOT NULL REFERENCES theme_vocab(id) ON DELETE CASCADE,
  model      TEXT NOT NULL,
  embedding  VECTOR(768) NOT NULL, -- CLIP 次元
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (theme_id, model)
);

CREATE INDEX theme_embed_ivf ON theme_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
```

2) サジェストログ（監査・チューニング用途）
```sql
CREATE TABLE theme_suggestions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  asset_id    TEXT REFERENCES assets(id) ON DELETE SET NULL,
  model       TEXT NOT NULL,             -- 使用モデル（openclip_vitb32 等）
  topk        JSONB NOT NULL,            -- [{"theme_id":1, "score":0.92}, ...]
  selected_id BIGINT REFERENCES theme_vocab(id), -- ユーザが選択したテーマ（任意）
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. AI/MLモデルと実装フロー

1.  クライアント: OSの共有機能で画像を受け取り、署名URLでS3へアップロードし `asset_id` を得る。
2.  バックエンド: ワーカーが `asset_id` の画像を取得し、CLIP で `V_query` を計算。
3.  バックエンド: `themes` ベクトルと類似検索し上位N件を返却。

---

## 7. 受け入れ基準（AC）
- ✅ スマートフォンの写真アプリから「共有」機能で本アプリを選択すると、テーマ生成が開始される。
- ✅ コーヒーカップの写真を共有すると、「カフェ」「コーヒー」に関連するテーマが上位に表示される。
- ✅ ボードゲームの箱の写真を共有すると、「ボードゲーム」「インドア遊び」に関連するテーマが上位に表示される。
