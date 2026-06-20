-- Central, shared storage for the JM House of Fashion app.
-- The whole application state is kept as a single JSON document in one row
-- (id = 'main'), so every device reads and writes the same data.
CREATE TABLE IF NOT EXISTS app_state (
  id         TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  rev        BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
