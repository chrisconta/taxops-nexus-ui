-- Add missing fields to clients table for sync tracking
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS last_sync_successful boolean DEFAULT null,
ADD COLUMN IF NOT EXISTS last_sync_at timestamp with time zone DEFAULT null;

-- Add credentials field to client_credentials table and rename it to client_connections
ALTER TABLE public.client_credentials 
ADD COLUMN IF NOT EXISTS credentials jsonb DEFAULT '{}';

-- Update the existing RLS policies to be more specific
DROP POLICY IF EXISTS "Users can view credentials for their clients" ON public.client_credentials;
DROP POLICY IF EXISTS "Users can create credentials for their clients" ON public.client_credentials;
DROP POLICY IF EXISTS "Users can update credentials for their clients" ON public.client_credentials;
DROP POLICY IF EXISTS "Users can delete credentials for their clients" ON public.client_credentials;

-- Create new RLS policies for client_credentials (treating as client_connections)
CREATE POLICY "Users can access connections for their clients" 
ON public.client_credentials FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = client_credentials.client_id 
  AND clients.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients 
  WHERE clients.id = client_credentials.client_id 
  AND clients.user_id = auth.uid()
));

-- Add trigger for client_credentials updated_at
CREATE TRIGGER update_client_credentials_updated_at
  BEFORE UPDATE ON public.client_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();