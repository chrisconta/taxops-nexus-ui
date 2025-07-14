-- Delete all transaction data to start fresh
DELETE FROM public.transactions;

-- Drop the partial unique index
DROP INDEX IF EXISTS idx_transactions_unique_per_client_connection;

-- Create a proper unique constraint without WHERE clause
-- First, update existing rows to have a placeholder mercury_transaction_id if null
UPDATE public.transactions 
SET mercury_transaction_id = COALESCE(mercury_transaction_id, 'legacy_' || id::text)
WHERE mercury_transaction_id IS NULL;

-- Make mercury_transaction_id not null and set default
ALTER TABLE public.transactions 
ALTER COLUMN mercury_transaction_id SET NOT NULL,
ALTER COLUMN mercury_transaction_id SET DEFAULT 'unknown';

-- Create the unique constraint that works with upsert
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_unique_per_client_connection 
UNIQUE (client_id, connection_code, mercury_transaction_id);