CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS decp_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decp_id         TEXT NOT NULL,
    description_projet     TEXT NOT NULL,
    code_cpv        TEXT,
    montant         NUMERIC,
    embedding       vector(1024) NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_decp_embeddings_decp_id
    ON decp_embeddings (decp_id);

CREATE INDEX IF NOT EXISTS idx_decp_embeddings_vector
    ON decp_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_decp_embeddings_created_at
    ON decp_embeddings (created_at);
