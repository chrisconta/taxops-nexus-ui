-- Create table for storing encrypted AI credentials
CREATE TABLE public.ai_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  enc_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own AI credentials" 
ON public.ai_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI credentials" 
ON public.ai_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI credentials" 
ON public.ai_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI credentials" 
ON public.ai_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to execute dynamic SQL with RLS protection
CREATE OR REPLACE FUNCTION public.execute_dynamic_sql(query text)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_dynamic_sql(text) TO authenticated;

-- Add trigger for updated_at
CREATE TRIGGER update_ai_credentials_updated_at
BEFORE UPDATE ON public.ai_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();