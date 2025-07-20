-- Phase 2: SQL Schema for User-Defined Tools

-- Create enum for tool status
CREATE TYPE public.tool_status AS ENUM ('draft', 'active', 'disabled');

-- Create user_tools table for custom tools
CREATE TABLE public.user_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  execution_schema JSONB NOT NULL DEFAULT '{}',
  conversation_config JSONB NOT NULL DEFAULT '{}',
  status tool_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;

-- Create policies for user_tools
CREATE POLICY "Users can manage their own tools" 
ON public.user_tools 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create tool_conversations table for tool-specific conversations
CREATE TABLE public.tool_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.user_tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  execution_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tool_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.tool_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for tool_conversations
CREATE POLICY "Users can manage tool conversations for their tools" 
ON public.tool_conversations 
FOR ALL
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.user_tools 
    WHERE id = tool_conversations.tool_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.user_tools 
    WHERE id = tool_conversations.tool_id AND user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE TRIGGER update_user_tools_updated_at
BEFORE UPDATE ON public.user_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_conversations_updated_at
BEFORE UPDATE ON public.tool_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();