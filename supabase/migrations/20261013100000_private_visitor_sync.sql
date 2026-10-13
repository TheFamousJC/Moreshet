create table public.visitor_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  saved_site_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(saved_site_ids) = 'array'),
  user_notes jsonb not null default '{}'::jsonb check (jsonb_typeof(user_notes) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.visitor_state enable row level security;
grant select, insert, update, delete on public.visitor_state to authenticated;
create policy own_visitor_state on public.visitor_state for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
