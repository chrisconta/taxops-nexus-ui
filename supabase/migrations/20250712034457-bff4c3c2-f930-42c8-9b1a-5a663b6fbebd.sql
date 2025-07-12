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

-- Create unique constraint on client_credentials to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_credentials_unique 
ON public.client_credentials (client_id, code);

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