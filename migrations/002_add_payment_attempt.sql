ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_attempt_id UUID;