alter table public.ai_conversation_states enable row level security;

create policy "Users can manage conversation state" on public.ai_conversation_states
  for all using (
    auth.uid() in (select user_id from ai_conversations where id = conversation_id)
  ) with check (
    auth.uid() in (select user_id from ai_conversations where id = conversation_id)
  );
