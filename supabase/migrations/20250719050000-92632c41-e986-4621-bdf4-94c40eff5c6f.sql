-- Create table to persist AI conversation state
create table public.ai_conversation_states (
  conversation_id uuid primary key references ai_conversations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger update_ai_conversation_states_updated_at
before update on public.ai_conversation_states
for each row
execute function public.update_updated_at_column();
