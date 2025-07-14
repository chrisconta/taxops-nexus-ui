-- Add mercury_transaction_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN mercury_transaction_id text;

-- Create unique constraint to prevent duplicate transactions
CREATE UNIQUE INDEX idx_transactions_unique_per_client_connection 
ON public.transactions(client_id, connection_code, mercury_transaction_id)
WHERE mercury_transaction_id IS NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_transactions_mercury_id ON public.transactions(mercury_transaction_id)
WHERE mercury_transaction_id IS NOT NULL;