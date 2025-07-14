-- Create conversation tables for AI chat
create table public.ai_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  title         text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  created_at      timestamptz default now()
);

-- Enable RLS
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- RLS policies
create policy "Users can manage their own conversations"
on public.ai_conversations
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage messages in their conversations"
on public.ai_messages
for all using (
  auth.uid() in (select user_id
                 from ai_conversations
                 where id = conversation_id)
)
with check (true);

-- Trigger for updating timestamps
create trigger update_ai_conversations_updated_at
before update on public.ai_conversations
for each row
execute function public.update_updated_at_column();