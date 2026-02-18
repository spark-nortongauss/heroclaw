-- Mission Control tickets RLS baseline for authenticated UI clients

alter table if exists public.mc_tickets enable row level security;

-- Remove broad policy if it exists so ownership checks can be enforced.
drop policy if exists "auth users can read/write tickets" on public.mc_tickets;

create policy "mc_tickets_select_authenticated"
on public.mc_tickets
for select
to authenticated
using (true);

create policy "mc_tickets_insert_owned"
on public.mc_tickets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.mc_agent_auth_map map
    where map.auth_user_id = auth.uid()
      and (map.agent_id = owner_agent_id or map.agent_id = reporter_agent_id)
  )
);

create policy "mc_tickets_update_owned"
on public.mc_tickets
for update
to authenticated
using (
  exists (
    select 1
    from public.mc_agent_auth_map map
    where map.auth_user_id = auth.uid()
      and (map.agent_id = owner_agent_id or map.agent_id = reporter_agent_id)
  )
)
with check (
  exists (
    select 1
    from public.mc_agent_auth_map map
    where map.auth_user_id = auth.uid()
      and (map.agent_id = owner_agent_id or map.agent_id = reporter_agent_id)
  )
);

create policy "mc_tickets_delete_owned"
on public.mc_tickets
for delete
to authenticated
using (
  exists (
    select 1
    from public.mc_agent_auth_map map
    where map.auth_user_id = auth.uid()
      and (map.agent_id = owner_agent_id or map.agent_id = reporter_agent_id)
  )
);
