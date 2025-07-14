-- Add api_logs column to ai_messages table to store API request/response logs
ALTER TABLE public.ai_messages 
ADD COLUMN api_logs JSONB DEFAULT '{}'::jsonb;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.ai_messages.api_logs IS 'Stores API request and response logs as JSON structure with request and response fields';