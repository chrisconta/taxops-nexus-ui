-- Create agent_tool_logs table for tracking tool invocations
CREATE TABLE public.agent_tool_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  invoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  result JSONB,
  execution_time_ms INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.agent_tool_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tool logs" 
ON public.agent_tool_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert tool logs" 
ON public.agent_tool_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_agent_tool_logs_user_id_invoked_at ON public.agent_tool_logs(user_id, invoked_at DESC);
CREATE INDEX idx_agent_tool_logs_tool_name ON public.agent_tool_logs(tool_name);