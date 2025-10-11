# Backend DB Schema

This directory stores the idempotent SQL definition for the auxiliary PostgreSQL database that powers the Flask AI service. The schema focuses on asset metadata, vector embeddings, and theme vocabularies used by the AI pipelines.

## Sections

- **FL.1.1 Assets / Embeddings** — `assets`, `image_embeddings`, `face_embeddings` tables plus pgvector indexes.
- **FL.1.2 Theme Vocabulary** — `theme_vocab_sets`, `theme_vocab`, `theme_embeddings`, `theme_suggestions` for managing active vocab bundles, per-model embeddings, and audit logs.
- **FL.1.3 Journal Entries** — `journal_entries`, `journal_entry_tags` capturing user-authored memories and tagged friends.

Each statement is written with `CREATE ... IF NOT EXISTS` so the file can be re-applied safely. When new tables or indexes are introduced, extend `schema.sql` while keeping idempotency.

## Applying the Schema

1. Ensure the `vector` extension is installed on the target PostgreSQL instance.
2. Run `psql "$DATABASE_URL" -f backend/db/schema.sql`.
3. Future tasks (theme vocabulary, journal entries, VLM observations, etc.) will append to this file following the same format.

### Operational Notes for Theme Vocabulary

- Toggle active vocab sets per locale by flipping `is_active`; the partial unique index guarantees only one active set per language.
- When shipping a new embedding model, insert the vectors with `current=false`, validate via backfill jobs, and flip the relevant rows to `current=true` in a single transaction.
- `theme_suggestions` retains the raw `topk` payload for auditability and A/B comparisons; periodically archive if volume grows large.
- Journal entries index by `(user_id, entry_date)` to keep timeline queries fast; tagged-user lookups use `journal_entry_tags_tagged_user_idx` for anniversary notifications or mention discovery.

The Flask application initialises SQLAlchemy via `backend/database.py`. ORM models for these tables live in `backend/db/models.py`.
