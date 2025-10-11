# データベース概要

バックエンドの永続化層には PostgreSQL を使用し、高次元ベクトルの類似検索を行うために `pgvector` 拡張機能を有効化しています。ORM モデルは `backend/db/models.py` に定義されており、初期化用の SQL スクリプトは `backend/db/schema.sql` にまとまっています。アプリケーションは外部に存在する `users` テーブル（ここでは `id` 列のみを参照）との外部キー連携を前提としています。

## 拡張機能と補助関数

- `CREATE EXTENSION vector`: `vector` 型と IVFFlat インデックスを利用可能にします。
- トリガー関数 `set_updated_at_vlm_observations()` は `vlm_observations.updated_at` を更新前に自動で最新化します。

## テーブル定義

### users

| 列             | 型     | 制約・補足                             |
| -------------- | ------ | -------------------------------------- |
| id             | BIGINT | 主キー（オートインクリメント）。       |
| assets_id      | TEXT   | 必須。`assets.id` への外部キー。       |
| account_id     | TEXT   | 必須。アカウントを一意に識別する ID。  |
| display_name   | TEXT   | 必須。ユーザー表示名。                 |
| icon_asset_url | TEXT   | 任意。プロフィールアイコン画像の URL。 |
| face_asset_url | TEXT   | 任意。本人顔写真の URL。               |
| profile_text   | TEXT   | 任意。プロフィール文章。               |

- リレーション: `icon_asset_id` と `face_asset_id` を通じて `assets` を参照し、ユーザーの画像資産を紐付ける。

### assets

| 列           | 型          | 制約・補足                                             |
| ------------ | ----------- | ------------------------------------------------------ |
| id           | TEXT        | 主キー（ULID を文字列で保存）。                        |
| owner_id     | BIGINT      | 必須。`users.id` への外部キー（`ON DELETE CASCADE`）。 |
| content_type | TEXT        | 必須。メディアの MIME タイプ。                         |
| storage_key  | TEXT        | 必須。オブジェクトストレージ上のキー。                 |
| created_at   | TIMESTAMPTZ | 既定値 `now()` 。                                      |

- リレーション: `image_embeddings` とは 1 対 1、`face_embeddings` とは 1 対多。`theme_suggestions` や `vlm_observations` から任意参照あり。ユーザーの `icon_asset_id` / `face_asset_id` からも参照され、プロフィール画像の実体として利用される。`owner_id` の外部キーにより、所有ユーザー削除時は関連アセットも `CASCADE` で削除される。

### image_embeddings

| 列         | 型          | 制約・補足                                                |
| ---------- | ----------- | --------------------------------------------------------- |
| asset_id   | TEXT        | 主キー。`assets.id` への外部キー（`ON DELETE CASCADE`）。 |
| model      | TEXT        | 必須。使用モデルの識別子。                                |
| embedding  | VECTOR(768) | 必須。pgvector によるベクトル。                           |
| created_at | TIMESTAMPTZ | 既定値 `now()` 。                                         |

- インデックス: pgvector の演算子が利用可能な場合、`image_embeddings_ivf`（IVFFlat, `vector_l2_ops`, `lists=100`）。

### face_embeddings

| 列         | 型          | 制約・補足                                              |
| ---------- | ----------- | ------------------------------------------------------- |
| id         | BIGSERIAL   | 主キー。                                                |
| asset_id   | TEXT        | 必須。`assets.id` への外部キー（`ON DELETE CASCADE`）。 |
| bbox       | JSONB       | 任意。バウンディングボックス情報。                      |
| embedding  | VECTOR(512) | 必須。pgvector によるベクトル。                         |
| created_at | TIMESTAMPTZ | 既定値 `now()` 。                                       |

- インデックス: pgvector の演算子が利用可能な場合、`face_embeddings_ivf`（IVFFlat, `vector_ip_ops`, `lists=100`）。

### theme_vocab_sets

| 列           | 型          | 制約・補足               |
| ------------ | ----------- | ------------------------ |
| id           | BIGSERIAL   | 主キー。                 |
| code         | TEXT        | 必須。セットごとに一意。 |
| lang         | TEXT        | 必須。既定値 `'ja'`。    |
| description  | TEXT        | 任意。説明文。           |
| is_active    | BOOLEAN     | 既定値 `false`。         |
| activated_at | TIMESTAMPTZ | 任意。アクティブ化日時。 |
| created_at   | TIMESTAMPTZ | 既定値 `now()` 。        |

- インデックス: `uniq_active_vocab_set_per_lang`（部分一意、`WHERE is_active = true`）で言語ごとにアクティブなセットを 1 つに制限。
- リレーション: `theme_vocab` の親。`theme_suggestions` から任意参照あり。

### theme_vocab

| 列         | 型          | 制約・補足                                                        |
| ---------- | ----------- | ----------------------------------------------------------------- |
| id         | BIGSERIAL   | 主キー。                                                          |
| set_id     | BIGINT      | 必須。`theme_vocab_sets.id` への外部キー（`ON DELETE CASCADE`）。 |
| name       | TEXT        | 必須。表示名。                                                    |
| normalized | TEXT        | 任意。正規化済み文字列。                                          |
| tags       | JSONB       | 任意。タグや属性情報。                                            |
| created_at | TIMESTAMPTZ | 既定値 `now()` 。                                                 |

- 制約: `(set_id, name)` の組み合わせで一意。
- リレーション: `theme_embeddings` を所有し、`theme_suggestions.selected_id` から参照される。

### theme_embeddings

| 列         | 型          | 制約・補足                                                               |
| ---------- | ----------- | ------------------------------------------------------------------------ |
| theme_id   | BIGINT      | 複合主キーの一部。`theme_vocab.id` への外部キー（`ON DELETE CASCADE`）。 |
| model      | TEXT        | 複合主キーの一部。埋め込みモデルを識別。                                 |
| embedding  | VECTOR(768) | 必須。pgvector によるベクトル。                                          |
| current    | BOOLEAN     | 既定値 `true`。ボキャブラリ項目の現行埋め込みを示す。                    |
| created_at | TIMESTAMPTZ | 既定値 `now()` 。                                                        |

- 制約: `(theme_id, model)` の複合主キー。
- インデックス: `uniq_current_theme_embed`（部分一意、`WHERE current = true`）、任意で IVFFlat `theme_embeddings_ivf`。

### theme_suggestions

| 列          | 型          | 制約・補足                                                         |
| ----------- | ----------- | ------------------------------------------------------------------ |
| id          | BIGSERIAL   | 主キー。                                                           |
| user_id     | BIGINT      | 任意。`users.id` への外部キー。                                    |
| asset_id    | TEXT        | 任意。`assets.id` への外部キー（`ON DELETE SET NULL`）。           |
| set_id      | BIGINT      | 任意。`theme_vocab_sets.id` への外部キー（`ON DELETE SET NULL`）。 |
| model       | TEXT        | 必須。提案を生成したモデル名。                                     |
| topk        | JSONB       | 必須。ランキング済み候補の記録。                                   |
| selected_id | BIGINT      | 任意。`theme_vocab.id` への外部キー（`ON DELETE SET NULL`）。      |
| created_at  | TIMESTAMPTZ | 既定値 `now()` 。                                                  |

- 提案提示とユーザー選択の監査ログを保持。

### proposals

| 列          | 型          | 制約・補足                                     |
| ----------- | ----------- | ---------------------------------------------- |
| id          | BIGSERIAL   | 主キー。                                       |
| title       | TEXT        | 必須。提案のタイトル。                         |
| event_date  | DATE        | 必須。提案の開催予定日。                       |
| location    | TEXT        | 任意。イベント予定地のテキスト表現。           |
| creator_id  | BIGINT      | 必須。提案を作成した `users.id` への外部キー。 |
| created_at  | TIMESTAMPTZ | 既定値 `now()` 。作成日時を保持。              |
| deadline_at | TIMESTAMPTZ | 任意。回答締切日時。                           |

- リレーション: `creator_id` を通じて提案作者に紐づき、参加者は別テーブル `proposal_participants` で管理する。

### proposal_participants

| 列          | 型          | 制約・補足                                                                                                                       |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| proposal_id | BIGINT      | 複合主キーの一部。`proposals.id` への外部キー（`ON DELETE CASCADE`）。                                                           |
| user_id     | BIGINT      | 複合主キーの一部。`users.id` への外部キー（`ON DELETE CASCADE`）。                                                               |
| status      | ENUM        | 必須。提案参加の状態を表す列挙（例: `0:'invited'`, `1:'accepted'`, `2:'declined'`）。アプリ側で ENUM を定義し 3 状態を強制する。 |
| updated_at  | TIMESTAMPTZ | 既定値 `now()`。状態更新日時。                                                                                                   |

- 制約: `(proposal_id, user_id)` の複合主キーで重複登録を防ぎ、`status` 列はアプリケーションまたは DB の ENUM 型で 3 値に限定する。

### user_friendships

| 列             | 型          | 制約・補足                                                                                                                                                                                  |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| user_id        | BIGINT      | 複合主キーの一部。`users.id` への外部キー（`ON DELETE CASCADE`）。                                                                                                                          |
| friend_user_id | BIGINT      | 複合主キーの一部。`users.id` への外部キー（`ON DELETE CASCADE`）。                                                                                                                          |
| status         | TEXT        | 必須。フレンド状態を表す ENUM（`'none'`〔既定値: 関係なし〕、`'recommended'`〔AI による候補提示〕、`'requested'`〔申請待ち〕、`'accepted'`〔フレンド確定〕、`'blocked'`〔ブロック済み〕）。 |
| updated_at     | TIMESTAMPTZ | 既定値 `now()`。状態更新日時。                                                                                                                                                              |
|                |

- 制約: `(user_id, friend_user_id)` の複合主キーで同一方向の重複を防ぎつつ、`user_id != friend_user_id` をチェック制約で保証する。`status` は DB の ENUM 型または CHECK 制約で定義し、AI 推薦状態（`'recommended'`）を含む 5 状態をアプリケーション側と同期させる。
- 運用: A→B と B→A のレコードを別々に保持できる（双方向で同一状態を維持したい場合はアプリ側またはトリガーで同期させる）。

### albums

| 列         | 型          | 制約・補足                                                       |
| ---------- | ----------- | ---------------------------------------------------------------- |
| id         | BIGSERIAL   | 主キー。                                                         |
| title      | TEXT        | 必須。アルバムのタイトル（ジャーナル機能内でのアルバムを表現）。 |
| creator_id | BIGINT      | 必須。アルバム作成者の `users.id` への外部キー。                 |
| created_at | TIMESTAMPTZ | 既定値 `now()` 。アルバムの作成日時。                            |

- リレーション: 作成者以外にも共有できるよう、`album_shared_users` テーブルと 1 対多で接続する。ジャーナル機能の一部として、アルバム内のエントリ（例: `journal_entries`）や写真を別テーブルで管理する場合は `album_contents` のようなリレーションを追加検討する。

### album_shared_users

| 列       | 型          | 制約・補足                                                                   |
| -------- | ----------- | ---------------------------------------------------------------------------- |
| album_id | BIGINT      | 複合主キーの一部。`albums.id` への外部キー（`ON DELETE CASCADE`）。          |
| user_id  | BIGINT      | 複合主キーの一部。`users.id` への外部キー（`ON DELETE CASCADE`）。           |
| role     | TEXT        | 任意。共有ユーザーの役割（例: `'viewer'`, `'editor'`）を保持する場合に利用。 |
| added_at | TIMESTAMPTZ | 既定値 `now()` 。共有追加日時。                                              |

- 制約: `(album_id, user_id)` の複合主キーで重複を防ぎ、共有範囲を明確にする。必要に応じて `role` 列に ENUM を設定して権限区分を表現する。

### album_photos

| 列          | 型          | 制約・補足                                                          |
| ----------- | ----------- | ------------------------------------------------------------------- |
| id          | BIGINT      | 主キー。                                                            |
| album_id    | BIGINT      | 複合主キーの一部。`albums.id` への外部キー（`ON DELETE CASCADE`）。 |
| photo_url   | TEXT        | 複合主キーの一部。アルバム内で一意となる写真 URL。                  |
| captured_at | TIMESTAMPTZ | 任意。撮影日時。                                                    |
| uploaded_at | TIMESTAMPTZ | 既定値 `now()` 。アップロード日時。                                 |

- 制約: `(album_id, photo_url)` の複合主キーで同一写真の重複登録を防止。`captured_at` が不明な場合でも `uploaded_at` で時系列管理可能。
- 運用: 写真の実体は `assets` やオブジェクトストレージに保存し、このテーブルではアルバムとの紐付けとメタデータのみを保持する。

### chat_groupes

| 列         | 型          | 制約・補足                                |
| ---------- | ----------- | ----------------------------------------- |
| id         | BIGSERIAL   | 主キー。チャットルームを識別する ID。     |
| title      | TEXT        | 必須。チャットのタイトル。                |
| icon_url   | TEXT        | 任意。チャットのアイコン画像 URL。        |
| created_at | TIMESTAMPTZ | 既定値 `now()` 。チャットルーム作成日時。 |

- リレーション: チャット参加ユーザーを管理する場合は別テーブル（例: `chat_member_users`）で `id` を外部キーとして参照させる。

### chat_members

| 列                     | 型        | 制約・補足                                                         |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| chat_groupe_id         | BIGSERIAL | 複合主キーの一部。`chat_groupes.id` への外部キー。                 |
| user_id                | BIGSERIAL | 複合主キーの一部。`users.id` への外部キー                          |
| last_viewed_message_id | BIGSERIAL | 必須。`chat_messages.id` への外部キー。最後に見たメッセージの id。 |

- リレーション: チャット参加ユーザーを管理する場合は別テーブル（例: `chat_member_users`）で `id` を外部キーとして参照させる。

### chat_messages

| 列        | 型          | 制約・補足                                                    |
| --------- | ----------- | ------------------------------------------------------------- |
| id        | BIGSERIAL   | 主キー。                                                      |
| chat_id   | BIGINT      | 必須。`chat_groupes.id` への外部キー（`ON DELETE CASCADE`）。 |
| sender_id | BIGINT      | 必須。`users.id` への外部キー（`ON DELETE CASCADE`）。        |
| body      | TEXT        | 任意。チャット本文。                                          |
| image_url | TEXT        | 任意。添付画像の URL。                                        |
| posted_at | TIMESTAMPTZ | 既定値 `now()` 。メッセージ送信日時。                         |

- 制約: 1 件のメッセージにつき本文と画像のどちらか、または両方を保持できる。既定では投稿順ソート用に `posted_at` を使用する。

### vlm_observations

| 列                  | 型          | 制約・補足                                               |
| ------------------- | ----------- | -------------------------------------------------------- |
| observation_id      | TEXT        | 主キー。                                                 |
| asset_id            | TEXT        | 任意。`assets.id` への外部キー（`ON DELETE SET NULL`）。 |
| observation_hash    | TEXT        | 必須。一意なハッシュで重複排除。                         |
| model_version       | TEXT        | 必須。VLM モデルのバージョン。                           |
| prompt_payload      | JSONB       | 任意。プロンプトや処理詳細。                             |
| schedule_candidates | JSONB       | 任意。スケジュール候補。                                 |
| member_candidates   | JSONB       | 任意。メンバー候補。                                     |
| notes               | JSONB       | 任意。付随メモ。                                         |
| extra_metadata      | JSONB       | 任意の追加メタデータ。                                   |
| initiator_user_id   | BIGINT      | 任意。起案ユーザー。                                     |
| latency_ms          | INTEGER     | 任意。処理遅延 (ms)。                                    |
| processed_at        | TIMESTAMPTZ | 既定値 `now()` 。                                        |
| created_at          | TIMESTAMPTZ | 既定値 `now()` 。                                        |
| updated_at          | TIMESTAMPTZ | 既定値 `now()`。トリガーで最新化。                       |

- インデックス: `vlm_observations_asset_processed_idx`（`asset_id, processed_at DESC`）、`vlm_observations_processed_idx`（`processed_at DESC`）。
- トリガー: `vlm_observations_set_updated_at` が更新前に `set_updated_at_vlm_observations()` を実行。

### vlm_detection_entities

| 列             | 型               | 制約・補足                                                                    |
| -------------- | ---------------- | ----------------------------------------------------------------------------- |
| id             | BIGSERIAL        | 主キー。                                                                      |
| observation_id | TEXT             | 必須。`vlm_observations.observation_id` への外部キー（`ON DELETE CASCADE`）。 |
| entity_type    | TEXT             | 必須。検出したエンティティ種別。                                              |
| entity_hash    | TEXT             | 任意。一意ハッシュで重複排除。                                                |
| payload        | JSONB            | 必須。検出結果の内容。                                                        |
| score          | DOUBLE PRECISION | 任意。信頼度スコア。                                                          |
| extra_metadata | JSONB            | 任意。追加メタデータ。                                                        |
| created_at     | TIMESTAMPTZ      | 既定値 `now()` 。                                                             |

- インデックス: `vlm_detection_entities_observation_idx`（`observation_id`）、`vlm_detection_entities_entity_type_idx`（`entity_type`）。
