CREATE TABLE IF NOT EXISTS boamp_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boamp_id_web        TEXT NOT NULL,
    description     TEXT NOT NULL,
    montant         NUMERIC,
    embedding       vector(1024) NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_boamp_embeddings_boamp_id_web
    ON boamp_embeddings (boamp_id_web);

CREATE INDEX IF NOT EXISTS idx_boamp_embeddings_vector
    ON boamp_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_boamp_embeddings_created_at
    ON boamp_embeddings (created_at);