-- Create system_modules table to store available system capabilities
CREATE TABLE public.system_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_schema JSONB,
  output_schema JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tool_workflows table to store user-created workflows
CREATE TABLE public.tool_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow_executions table to track execution history
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.tool_workflows(id),
  user_id UUID NOT NULL,
  execution_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create workflow_logs table for detailed step logging
CREATE TABLE public.workflow_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id),
  step_index INTEGER NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warn', 'error', 'debug')),
  source TEXT NOT NULL CHECK (source IN ('ui', 'api', 'ai', 'execution', 'validation')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for tool_workflows
ALTER TABLE public.tool_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workflows" 
ON public.tool_workflows 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for workflow_executions
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own executions" 
ON public.workflow_executions 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for workflow_logs
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for their executions" 
ON public.workflow_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workflow_executions we 
  WHERE we.id = workflow_logs.execution_id 
  AND we.user_id = auth.uid()
));

-- Add RLS for system_modules (read-only for authenticated users)
ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view system modules" 
ON public.system_modules 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert initial system modules
INSERT INTO public.system_modules (name, category, description, capabilities) VALUES
('register_client', 'client_management', 'Register new clients in the system', '["client_creation", "validation", "data_persistence"]'::jsonb),
('create_connection', 'integrations', 'Establish connections to external services', '["api_integration", "credential_management", "connection_testing"]'::jsonb),
('build_dashboard', 'analytics', 'Create analytical dashboards and reports', '["data_visualization", "chart_creation", "report_generation"]'::jsonb),
('ai_chat', 'communication', 'AI-powered chat and assistance', '["natural_language", "context_understanding", "response_generation"]'::jsonb);

-- Add trigger for updated_at
CREATE TRIGGER trigger_update_tool_workflows_updated_at
  BEFORE UPDATE ON public.tool_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_system_modules_updated_at
  BEFORE UPDATE ON public.system_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Performance indexes as suggested
CREATE INDEX idx_tool_workflows_user_id ON public.tool_workflows (user_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions (status);
CREATE INDEX idx_workflow_logs_execution_id ON public.workflow_logs (execution_id);
CREATE INDEX idx_workflow_logs_level_source ON public.workflow_logs (log_level, source);