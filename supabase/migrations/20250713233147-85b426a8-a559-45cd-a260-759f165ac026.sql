-- Create transactions table for persisting Mercury data
CREATE TABLE public.transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_request_id  uuid NOT NULL REFERENCES public.sync_requests(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES public.clients(id),
  posted_at        timestamp with time zone NOT NULL,
  amount_cents     bigint NOT NULL,
  counterparty     text,
  note             text,
  status           text,
  raw              jsonb,
  created_at       timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own transactions
CREATE POLICY "Users can read own transactions"
  ON public.transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sync_requests sr
      WHERE sr.id = transactions.sync_request_id
        AND sr.user_id = auth.uid()
    )
  );

-- Policy for edge functions to insert transactions
CREATE POLICY "Edge functions can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_transactions_sync_request_id ON public.transactions(sync_request_id);
CREATE INDEX idx_transactions_client_id ON public.transactions(client_id);
CREATE INDEX idx_transactions_posted_at ON public.transactions(posted_at DESC);