-- Chat + knowledge base (Source A = "deuvix", Source B = "agentfactory").
-- pgvector ships with Supabase; safe to CREATE EXTENSION on a project that has it.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- KB bookkeeping: one row per fetched page, used for idempotent re-indexing
-- and for deleting chunks whose page disappeared upstream.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_pages (
  source       text        NOT NULL CHECK (source IN ('deuvix', 'agentfactory')),
  url          text        NOT NULL,
  title        text,
  content_hash text        NOT NULL,
  chunk_count  integer     NOT NULL DEFAULT 0,
  last_fetched timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, url)
);

-- ---------------------------------------------------------------------------
-- Chunks. (source, url, chunk_index) is the idempotency key: a re-run either
-- updates the row or rewrites it in place, so nothing can duplicate.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_chunks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text        NOT NULL CHECK (source IN ('deuvix', 'agentfactory')),
  url         text        NOT NULL,
  chunk_index integer     NOT NULL,
  title       text,
  heading     text,
  text        text        NOT NULL,
  content_hash text       NOT NULL,
  embedding   vector(768),
  last_fetched timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, url, chunk_index)
);

CREATE INDEX IF NOT EXISTS kb_chunks_source_idx ON kb_chunks (source);

-- ---------------------------------------------------------------------------
-- Conversations (logged-in users only). user_id is the ownership boundary:
-- every read/write is filtered by it so one user can never see another's.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text        NOT NULL,
  title         text,
  summary       text,
  profile       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  abuse_strikes integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'ended')),
  ended_reason  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_idx
  ON conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text        NOT NULL,
  sources         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  feedback        text        CHECK (feedback IN ('up', 'down')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Leads handed to the founders. No card/bank data is ever accepted by the
-- chat, so there is nothing sensitive here beyond what the user typed.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_leads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  contact    text        NOT NULL,
  summary    text        NOT NULL,
  consent    boolean     NOT NULL DEFAULT false,
  channel    text        NOT NULL DEFAULT 'email',
  status     text        NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Lock everything down: on Supabase the public schema is reachable via
-- PostgREST, so the anon/authenticated roles must not see chat data.
-- Must run last, after every table exists.
-- ---------------------------------------------------------------------------
ALTER TABLE kb_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['kb_pages', 'kb_chunks', 'conversations', 'messages', 'chat_leads']
  LOOP
    EXECUTE format('REVOKE ALL ON %I FROM anon', t);
    EXECUTE format('REVOKE ALL ON %I FROM authenticated', t);
  END LOOP;
END $$;

-- HNSW index on the embedding column (needs pgvector 0.5+, present on Supabase).
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
  ON kb_chunks USING hnsw (embedding vector_cosine_ops);
