create extension if not exists pgcrypto;

create table if not exists public.mc_tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'not_done' check (status in ('not_done','ongoing','done')),
  owner_agent_id text,
  parent_id uuid null references public.mc_tickets(id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mc_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.mc_tickets(id) on delete cascade,
  author_user_id uuid null,
  author_agent_id text null,
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mc_chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  sender_type text not null check (sender_type in ('user','agent')),
  sender_user_id uuid null,
  sender_agent_id text null,
  body text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mc_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  payload jsonb not null,
  created_by uuid not null,
  status text not null default 'queued',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mc_tickets enable row level security;
alter table public.mc_comments enable row level security;
alter table public.mc_chat_messages enable row level security;
alter table public.mc_requests enable row level security;

do $$ begin
  create policy "auth users can read/write tickets" on public.mc_tickets for all using (auth.uid() is not null) with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "auth users can read/write comments" on public.mc_comments for all using (auth.uid() is not null) with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "auth users can read/write chat" on public.mc_chat_messages for all using (auth.uid() is not null) with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "auth users can read/write requests" on public.mc_requests for all using (auth.uid() is not null) with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;
