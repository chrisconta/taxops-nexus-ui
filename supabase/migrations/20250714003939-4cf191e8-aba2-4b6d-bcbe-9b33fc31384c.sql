-- Allow null posted_at and add new columns for better transaction handling
ALTER TABLE public.transactions
  ALTER COLUMN posted_at DROP NOT NULL;

-- Add transaction_type column to identify connector source
ALTER TABLE public.transactions
  ADD COLUMN transaction_type TEXT DEFAULT 'mercury';

-- Add effective_at as fallback timestamp when posted_at is null
ALTER TABLE public.transactions
  ADD COLUMN effective_at TIMESTAMPTZ NULL;

-- Create index for efficient date range queries on effective_at
CREATE INDEX IF NOT EXISTS idx_transactions_effective_at
  ON public.transactions(effective_at DESC);

-- Update existing records to have effective_at = posted_at
UPDATE public.transactions 
SET effective_at = posted_at 
WHERE effective_at IS NULL AND posted_at IS NOT NULL;