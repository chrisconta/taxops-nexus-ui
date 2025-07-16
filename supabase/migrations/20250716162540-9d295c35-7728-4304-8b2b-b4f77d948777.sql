-- Create file_mapping_templates table for storing user mapping configurations
CREATE TABLE public.file_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.file_mapping_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for file_mapping_templates
CREATE POLICY "Users can view their own mapping templates"
  ON public.file_mapping_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = file_mapping_templates.client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mapping templates for their clients"
  ON public.file_mapping_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = file_mapping_templates.client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own mapping templates"
  ON public.file_mapping_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = file_mapping_templates.client_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own mapping templates"
  ON public.file_mapping_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = file_mapping_templates.client_id
        AND c.user_id = auth.uid()
    )
  );

-- Create transactions_mercury detail table for Mercury-specific fields
CREATE TABLE public.transactions_mercury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  category_code TEXT,
  merchant_name TEXT,
  account_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions_mercury ENABLE ROW LEVEL SECURITY;

-- Create policy for transactions_mercury
CREATE POLICY "Users can view Mercury details for their transactions"
  ON public.transactions_mercury
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.sync_requests sr ON t.sync_request_id = sr.id
      WHERE t.id = transactions_mercury.transaction_id
        AND sr.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert Mercury transaction details"
  ON public.transactions_mercury
  FOR INSERT
  WITH CHECK (true);

-- Add description field to transactions if it doesn't exist
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for performance
CREATE INDEX idx_file_mapping_templates_client_connection ON public.file_mapping_templates(client_id, connection_type);
CREATE INDEX idx_transactions_mercury_transaction_id ON public.transactions_mercury(transaction_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_file_mapping_templates_updated_at
  BEFORE UPDATE ON public.file_mapping_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();