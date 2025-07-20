
-- Create table to persist AI conversation state
CREATE TABLE public.ai_conversation_states (
  conversation_id uuid PRIMARY KEY REFERENCES ai_conversations(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add trigger to update timestamps
CREATE TRIGGER update_ai_conversation_states_updated_at
BEFORE UPDATE ON public.ai_conversation_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.ai_conversation_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policy that allows users to manage conversation state for their own conversations
CREATE POLICY "Users can manage conversation state" ON public.ai_conversation_states
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM ai_conversations WHERE id = conversation_id)
  ) WITH CHECK (
    auth.uid() IN (SELECT user_id FROM ai_conversations WHERE id = conversation_id)
  );
