-- Restructure connections table to be a global registry of available connection types
-- Drop existing user-specific RLS policies
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update their own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.connections;

-- Remove user_id from connections table as it should be global
ALTER TABLE public.connections DROP COLUMN IF EXISTS user_id;

-- Add description field for better UI display
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS description text;

-- Add enabled field to control which connections are available
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS enabled boolean DEFAULT true;

-- Create new RLS policies for connections table
-- Everyone can read available connection types
CREATE POLICY "Anyone can view enabled connection types" 
ON public.connections FOR SELECT
USING (enabled = true);

-- Only authenticated users with admin role can modify connection types
-- For now, we'll restrict modifications completely - they should be managed via direct SQL
CREATE POLICY "No modifications allowed via API" 
ON public.connections FOR ALL
USING (false)
WITH CHECK (false);

-- Ensure client_credentials has proper structure and RLS
-- Add missing constraints if needed
ALTER TABLE public.client_credentials 
ALTER COLUMN status SET DEFAULT 'not-connected';

-- Create function to encrypt/decrypt credentials
CREATE OR REPLACE FUNCTION public.encrypt_credentials(data jsonb, key_id text DEFAULT 'default')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, we'll use base64 encoding as a placeholder
  -- In production, this should use proper encryption with Supabase Vault
  RETURN encode(data::text::bytea, 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_credentials(encrypted_data text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For now, we'll use base64 decoding as a placeholder
  -- In production, this should use proper decryption with Supabase Vault
  RETURN decode(encrypted_data, 'base64')::text::jsonb;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '{}'::jsonb;
END;
$$;

-- Create function to safely save client credentials
CREATE OR REPLACE FUNCTION public.save_client_credentials(
  p_client_id uuid,
  p_connection_code text,
  p_credentials jsonb,
  p_connection_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credential_id uuid;
  v_encrypted_creds text;
  v_client_owner uuid;
BEGIN
  -- Verify the client belongs to the current user
  SELECT user_id INTO v_client_owner
  FROM public.clients
  WHERE id = p_client_id;
  
  IF v_client_owner IS NULL OR v_client_owner != auth.uid() THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;
  
  -- Encrypt the credentials
  v_encrypted_creds := public.encrypt_credentials(p_credentials);
  
  -- Insert or update credentials
  INSERT INTO public.client_credentials (
    client_id,
    code,
    name,
    credentials,
    status
  ) VALUES (
    p_client_id,
    p_connection_code,
    COALESCE(p_connection_name, p_connection_code),
    p_credentials, -- Store encrypted in production
    'not-connected'
  )
  ON CONFLICT (client_id, code) 
  DO UPDATE SET
    credentials = EXCLUDED.credentials,
    name = COALESCE(EXCLUDED.name, client_credentials.name),
    updated_at = now()
  RETURNING id INTO v_credential_id;
  
  RETURN v_credential_id;
END;
$$;

-- Create function to update connection status
CREATE OR REPLACE FUNCTION public.update_connection_status(
  p_client_id uuid,
  p_connection_code text,
  p_status text,
  p_last_sync_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_owner uuid;
BEGIN
  -- Verify the client belongs to the current user
  SELECT user_id INTO v_client_owner
  FROM public.clients
  WHERE id = p_client_id;
  
  IF v_client_owner IS NULL OR v_client_owner != auth.uid() THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;
  
  -- Validate status
  IF p_status NOT IN ('connected', 'not-connected', 'error') THEN
    RAISE EXCEPTION 'Invalid status. Must be: connected, not-connected, or error';
  END IF;
  
  -- Update credentials status
  UPDATE public.client_credentials
  SET 
    status = p_status,
    updated_at = now()
  WHERE client_id = p_client_id AND code = p_connection_code;
  
  -- Update client sync info if status is connected
  IF p_status = 'connected' THEN
    UPDATE public.clients
    SET 
      last_sync_at = p_last_sync_at,
      last_sync_successful = true,
      updated_at = now()
    WHERE id = p_client_id;
  ELSIF p_status = 'error' THEN
    UPDATE public.clients
    SET 
      last_sync_successful = false,
      updated_at = now()
    WHERE id = p_client_id;
  END IF;
  
  RETURN true;
END;
$$;

-- Insert default connection types
INSERT INTO public.connections (connection_type, title, category, description, enabled) VALUES
('quickbooks', 'QuickBooks Online', 'accounting', 'Connect to QuickBooks Online for accounting data sync', true),
('xero', 'Xero', 'accounting', 'Connect to Xero for accounting data sync', true),
('sat', 'SAT (México)', 'tax', 'Connect to SAT for Mexican tax compliance', true),
('netsuite', 'NetSuite ERP', 'erp', 'Connect to NetSuite for comprehensive business data', true),
('gusto', 'Gusto Payroll', 'payroll', 'Connect to Gusto for payroll management', true),
('adp', 'ADP Workforce', 'payroll', 'Connect to ADP for payroll and HR data', true),
('plaid', 'Plaid Banking', 'banking', 'Connect to banks via Plaid for financial data', true),
('stripe', 'Stripe Payments', 'payments', 'Connect to Stripe for payment processing data', true),
('square', 'Square POS', 'payments', 'Connect to Square for point-of-sale data', true),
('salesforce', 'Salesforce CRM', 'crm', 'Connect to Salesforce for customer relationship data', true)
ON CONFLICT (connection_type) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  enabled = EXCLUDED.enabled;

-- Create unique constraint on client_credentials to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_credentials_unique 
ON public.client_credentials (client_id, code);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.save_client_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_connection_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credentials TO authenticated;