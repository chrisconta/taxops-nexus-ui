-- Add connection_code column to public.transactions for multi-source support
ALTER TABLE public.transactions
  ADD COLUMN connection_code text NOT NULL DEFAULT 'mercury';

-- Index for common queries (provider + date)
CREATE INDEX idx_transactions_connection_code_posted_at
  ON public.transactions (connection_code, posted_at DESC);

-- Back-fill existing rows
UPDATE public.transactions
SET connection_code = 'mercury'
WHERE connection_code IS NULL;