-- Enable UUID extension (safe if rerun)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- ORDERS (Domain State)
-- =========================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

  state TEXT NOT NULL CHECK (
    state IN (
      'created',
      'payment_pending',
      'paid',
      'failed'
    )
  ),

  version BIGINT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- OUTBOX (Guaranteed Delivery)
-- =========================
CREATE TABLE IF NOT EXISTS outbox (
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

-- =========================
-- PROCESSED EVENTS (Idempotency)
-- =========================
CREATE TABLE IF NOT EXISTS processed_events (
  event_id UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  worker_id TEXT
);

-- =========================
-- INDEXES
-- =========================



CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
ON outbox (aggregate_id);

CREATE INDEX IF NOT EXISTS idx_orders_state
ON orders (state);


CREATE INDEX IF NOT EXISTS idx_outbox_published
ON outbox (published);


CREATE INDEX IF NOT EXISTS idx_processed_events_event_id
ON processed_events (event_id);
