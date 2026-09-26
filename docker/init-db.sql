-- Enable pgvector and uuid extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ====================================================================
-- Event Store (Append-Only Immutable Ledger for CQRS / Event Sourcing)
-- ====================================================================
CREATE TABLE IF NOT EXISTS event_store (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    event_version BIGINT NOT NULL,
    payload_json JSONB NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_aggregate_version UNIQUE (tenant_id, aggregate_id, event_version)
);

CREATE INDEX IF NOT EXISTS idx_event_store_tenant_aggregate 
    ON event_store(tenant_id, aggregate_id, event_version ASC);

CREATE INDEX IF NOT EXISTS idx_event_store_tenant_type 
    ON event_store(tenant_id, aggregate_type);

CREATE INDEX IF NOT EXISTS idx_event_store_occurred_at 
    ON event_store(occurred_at DESC);

-- ====================================================================
-- Aggregate Snapshots (For Fast Replay Acceleration)
-- ====================================================================
CREATE TABLE IF NOT EXISTS aggregate_snapshots (
    tenant_id VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(64) NOT NULL,
    version BIGINT NOT NULL,
    state_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, aggregate_id)
);

-- ====================================================================
-- Semantic Embeddings (pgvector Store for LangChain4j Agentic RAG)
-- ====================================================================
CREATE TABLE IF NOT EXISTS financial_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    source_id VARCHAR(64) NOT NULL,
    source_type VARCHAR(64) NOT NULL, -- e.g. TRANSACTION, RECEIPT, NOTE
    text_content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding vector(768), -- standard 768-dim embeddings for Gemini / text-embedding-004 / all-MiniLM
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_tenant 
    ON financial_embeddings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_source 
    ON financial_embeddings(tenant_id, source_id);

-- Create HNSW index for high performance approximate cosine similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_hnsw 
    ON financial_embeddings USING hnsw (embedding vector_cosine_ops);



-- ============================================================================
-- SPREADSHEET MATRIX STATE (PERSISTENCE & ZERO DATA LOSS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS spreadsheet_state (
    tenant_id VARCHAR(64) NOT NULL,
    year INT NOT NULL,
    data_json JSONB NOT NULL,
    members_json JSONB DEFAULT '[]',
    base_initial_reserve NUMERIC(15, 2) NOT NULL DEFAULT 15500.00,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, year)
);

-- ============================================================================
-- EXPENSE CATALOG (CATÁLOGO DE DESPESAS COM VALOR PADRÃO & RESPONSÁVEL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS expense_catalog (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    default_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    owner VARCHAR(32) NOT NULL DEFAULT 'Compartilhado',
    category VARCHAR(64) NOT NULL DEFAULT 'GERAL',
    icon VARCHAR(16) DEFAULT '💳',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_catalog_tenant ON expense_catalog(tenant_id, owner);




