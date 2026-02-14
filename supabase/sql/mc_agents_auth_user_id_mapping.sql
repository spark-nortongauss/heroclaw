alter table public.mc_agents
add column if not exists auth_user_id uuid;

create unique index if not exists mc_agents_auth_user_id_key
on public.mc_agents(auth_user_id)
where auth_user_id is not null;

with human_agent as (
  select id
  from public.mc_agents
  where role = 'human'
     or display_name ilike '%(Human)%'
     or display_name ilike '%Tayroni%'
  order by
    case
      when role = 'human' then 0
      when display_name ilike '%(Human)%' then 1
      else 2
    end,
    id
  limit 1
)
update public.mc_agents m
set auth_user_id = auth.uid()
from human_agent h
where m.id = h.id
  and m.auth_user_id is null;

notify pgrst, 'reload schema';
