-- =========================
-- ORDERS
-- =========================
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

  state TEXT NOT NULL CHECK (
    state IN ('CREATED','PAYMENT_PENDING','PAID','FAILED')
  ),

  version BIGINT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- OUTBOX
-- =========================
CREATE TABLE outbox (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,

  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,

  payload JSONB NOT NULL,

  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial index (better)
CREATE INDEX idx_outbox_unpublished
ON outbox (created_at)
WHERE published = false;

CREATE INDEX idx_orders_state
ON orders (state);

-- =========================
-- PROCESSED EVENTS
-- =========================
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  worker_id TEXT
);
