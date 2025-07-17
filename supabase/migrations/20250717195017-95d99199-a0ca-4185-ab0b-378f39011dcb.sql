-- 1. Create action_logs table
CREATE TABLE IF NOT EXISTS action_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL DEFAULT auth.uid(),
  action     TEXT NOT NULL
               CHECK (action IN ('read','validate','edit','execute','error')),
  target     TEXT,
  tool       TEXT,
  params     JSONB DEFAULT '{}',
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_action_logs_updated_at
  BEFORE UPDATE ON action_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. RLS policies
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY insert_own_logs ON action_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY select_own_logs ON action_logs
  FOR SELECT USING (auth.uid() = user_id);