# データモデル（ER 概要）

最終更新: 2025-09-02 (Asia/Tokyo)

PostgreSQL（`pgvector` 拡張）+ SQLAlchemy を前提に、主要エンティティとリレーションを定義します。機能仕様は `docs/features/` を参照。

---

## 1. ユーザ・認証

```sql
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  oauth_provider TEXT NOT NULL DEFAULT 'google',
  oauth_subject  TEXT NOT NULL,
  email          TEXT,
  email_verified BOOLEAN DEFAULT false,
  display_name   TEXT,
  photo_url      TEXT,
  locale         TEXT DEFAULT 'ja',
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (oauth_provider, oauth_subject)
);

CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  rotated_from TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE device_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios','android')),
  token       TEXT NOT NULL,
  locale      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, token)
);
```

---

## 2. 連絡先・ブロック

```sql
CREATE TABLE contacts (
  id         BIGSERIAL PRIMARY KEY,
  owner_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  email_hash TEXT,
  phone_hash TEXT,
  matched_user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE blocks (
  blocker_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
```

### 2.1 フレンド/リクエスト（相互承認型）

相互承認による対等なフレンド関係をサポートします。申請（リクエスト）と、承認後の確定関係（friendships）を分離します。

```sql
-- フレンド申請（片方向）
CREATE TABLE friend_requests (
  id            BIGSERIAL PRIMARY KEY,
  requester_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','accepted','declined','canceled')),
  message       TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id)
);

-- 同一ペア間の重複保護（保留中のみ）
CREATE UNIQUE INDEX uniq_pending_friend_request_pair
  ON friend_requests (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
  WHERE (status = 'pending');

-- 確定したフレンド関係（対等）
CREATE TABLE friendships (
  user_id_a  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_b  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  since      TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (user_id_a < user_id_b),
  PRIMARY KEY (user_id_a, user_id_b)
);
```

整合性メモ
- ブロック成立時は関連する `friend_requests`（pending）を自動で `canceled` に、`friendships` は削除（アプリ層 or トリガ）
- 申請の承認で `friendships` に INSERT、却下/取消で INSERT なし
- `contacts` と `friendships` は独立。提案対象は通常 `contacts` ベースだが、フレンドは優先表示や検索補助に利用可能

---

## 3. 提案・合意（F02/F03/F13）

```sql
CREATE TABLE proposals (
  id           BIGSERIAL PRIMARY KEY,
  proposer_id  BIGINT NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  theme        TEXT,
  place        TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|agreed|rejected|canceled
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE proposal_audiences (
  proposal_id  BIGINT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction     TEXT CHECK (reaction IN ('like','dislike')),
  reacted_at   TIMESTAMPTZ,
  PRIMARY KEY (proposal_id, user_id)
);

CREATE TABLE proposal_slots (
  id           BIGSERIAL PRIMARY KEY,
  proposal_id  BIGINT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL
);

CREATE TABLE slot_votes (
  slot_id     BIGINT NOT NULL REFERENCES proposal_slots(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value       TEXT NOT NULL CHECK (value IN ('ok','maybe','ng')),
  PRIMARY KEY (slot_id, user_id)
);
```

---

## 4. グループ・チャット（F04）

```sql
CREATE TABLE groups (
  id           BIGSERIAL PRIMARY KEY,
  origin_proposal_id BIGINT REFERENCES proposals(id),
  title        TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE messages (
  id        BIGSERIAL PRIMARY KEY,
  group_id  BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL REFERENCES users(id),
  kind      TEXT NOT NULL DEFAULT 'text',
  text      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. ジャーナル・画像（F14）

```sql
CREATE TABLE assets (
  id         TEXT PRIMARY KEY, -- ulid
  owner_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,  -- s3 key
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE journal_entries (
  id         BIGSERIAL PRIMARY KEY,
  owner_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id   TEXT REFERENCES assets(id) ON DELETE SET NULL,
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. ベクトル・AI（F10–F12）

`pgvector` を用いた埋め込み格納。CLIP（画像）/ArcFace（顔）を想定。

```sql
-- 1536 次元などモデルに応じて
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE image_embeddings (
  asset_id   TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  model      TEXT NOT NULL,
  embedding  VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE face_embeddings (
  id         BIGSERIAL PRIMARY KEY,
  asset_id   TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  bbox       JSONB,           -- 顔領域
  embedding  VECTOR(512) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 検索インデックス
CREATE INDEX ON image_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX ON face_embeddings  USING ivfflat (embedding vector_ip_ops) WITH (lists = 100);
```

---

## 7. テーマ語彙・サジェスト（F10）

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
  embedding  VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (theme_id, model)
);

CREATE INDEX theme_embed_ivf ON theme_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

CREATE TABLE theme_suggestions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  asset_id    TEXT REFERENCES assets(id) ON DELETE SET NULL,
  model       TEXT NOT NULL,
  topk        JSONB NOT NULL,
  selected_id BIGINT REFERENCES theme_vocab(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

運用メモ
- 語彙は `active` で無効化可能。プロジェクトやロケールごとに `lang` を切り替え。
- 埋め込みはモデル別に保持し、入替時はバックフィルをジョブで実行。
- サジェストログは A/B チューニングや誤り分析に活用（PII 最小化）。

---

## 8. 通知・設定

```sql
CREATE TABLE notification_preferences (
  user_id  BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  proposal BOOLEAN NOT NULL DEFAULT true,
  group    BOOLEAN NOT NULL DEFAULT true,
  reminder BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id        BIGSERIAL PRIMARY KEY,
  user_id   BIGINT REFERENCES users(id),
  action    TEXT NOT NULL,   -- 'proposal.create', 'schedule.confirm' など
  actor_ip  INET,
  meta      JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 9. 整合性・制約の要点

- 提案対象は作成者のフレンド（`friendships`）に限定。ブロック関係は不可
- 申請/承認に伴う整合（ブロック時のキャンセル・解除）
- ブロック関係は提案対象に含めない（アプリ層でバリデーション + DB 制約）
- 提案合意はトランザクションで一括更新（重複グループ生成防止）
- 埋め込みはモデル名でスキーマ分離 or カラム `model` で多モデル共存
- 画像は署名付きURLでアクセス（永続URLは CDN 配下の `asset_id`）
