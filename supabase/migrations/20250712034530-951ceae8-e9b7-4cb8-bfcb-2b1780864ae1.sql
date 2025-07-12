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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.save_client_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_connection_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_credentials TO authenticated;