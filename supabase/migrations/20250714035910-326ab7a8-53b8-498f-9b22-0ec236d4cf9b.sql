
-- Fix Function Search Path Mutable warnings by adding SET search_path to all functions
-- This prevents potential security vulnerabilities from search path manipulation

-- 1. execute_dynamic_sql function
CREATE OR REPLACE FUNCTION public.execute_dynamic_sql(query text)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Execute the query and return as jsonb
  EXECUTE format('SELECT jsonb_agg(t) FROM (%s) as t', query) INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'SQL execution error: %', SQLERRM;
END;
$$;

-- 2. decrypt_credentials function
CREATE OR REPLACE FUNCTION public.decrypt_credentials(encrypted_data text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
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

-- 3. encrypt_credentials function
CREATE OR REPLACE FUNCTION public.encrypt_credentials(data jsonb, key_id text DEFAULT 'default')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- For now, we'll use base64 encoding as a placeholder
  -- In production, this should use proper encryption with Supabase Vault
  RETURN encode(data::text::bytea, 'base64');
END;
$$;

-- 4. save_client_credentials function
CREATE OR REPLACE FUNCTION public.save_client_credentials(
  p_client_id uuid,
  p_connection_code text,
  p_credentials jsonb,
  p_connection_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_credential_id uuid;
  v_client_owner uuid;
BEGIN
  -- Verify the client belongs to the current user
  SELECT user_id INTO v_client_owner
  FROM public.clients
  WHERE id = p_client_id;
  
  IF v_client_owner IS NULL OR v_client_owner != auth.uid() THEN
    RAISE EXCEPTION 'Client not found or access denied';
  END IF;
  
  -- Insert or update credentials using the unique constraint
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
    p_credentials,
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

-- 5. update_connection_status function
CREATE OR REPLACE FUNCTION public.update_connection_status(
  p_client_id uuid,
  p_connection_code text,
  p_status text,
  p_last_sync_at timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
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

-- Set proper ownership and grants for all functions
ALTER FUNCTION public.execute_dynamic_sql(text) OWNER TO postgres;
ALTER FUNCTION public.decrypt_credentials(text) OWNER TO postgres;
ALTER FUNCTION public.encrypt_credentials(jsonb, text) OWNER TO postgres;
ALTER FUNCTION public.save_client_credentials(uuid, text, jsonb, text) OWNER TO postgres;
ALTER FUNCTION public.update_connection_status(uuid, text, text, timestamptz) OWNER TO postgres;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_dynamic_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credentials(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_credentials(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_client_credentials(uuid, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_connection_status(uuid, text, text, timestamptz) TO authenticated;
