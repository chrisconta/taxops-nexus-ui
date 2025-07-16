-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the INSERT policy to be more restrictive
DROP POLICY IF EXISTS "System can insert tool logs" ON public.agent_tool_logs;

CREATE POLICY "Users can insert their own tool logs" 
ON public.agent_tool_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Optional: Add a policy for admins to view all logs (if needed later)
-- CREATE POLICY "Admins can view all tool logs" 
-- ON public.agent_tool_logs 
-- FOR SELECT 
-- USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));