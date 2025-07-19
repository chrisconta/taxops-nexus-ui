-- Fix user_id defaults for workflow tables
ALTER TABLE public.tool_workflows ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.workflow_executions ALTER COLUMN user_id SET DEFAULT auth.uid();