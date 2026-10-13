alter table public.heritage_stories
  add column if not exists owner_archived_at timestamptz;

create index if not exists heritage_stories_owner_archive_idx
  on public.heritage_stories (user_id, owner_archived_at, updated_at desc);

create or replace function public.set_heritage_story_owner_archived(p_story_id uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.heritage_story_status;
begin
  select status into v_status
  from public.heritage_stories
  where id=p_story_id and user_id=auth.uid()
  for update;

  if not found then raise exception 'Story not found'; end if;
  if p_archived and v_status not in ('withdrawn','rejected') then
    raise exception 'Only withdrawn or rejected stories can be archived';
  end if;

  update public.heritage_stories
  set owner_archived_at=case when p_archived then now() else null end
  where id=p_story_id and user_id=auth.uid();
end;
$$;

revoke all on function public.set_heritage_story_owner_archived(uuid,boolean) from public,anon;
grant execute on function public.set_heritage_story_owner_archived(uuid,boolean) to authenticated;

comment on column public.heritage_stories.owner_archived_at is 'Contributor-only list archive state; does not delete revisions, consent, media or moderation evidence.';
comment on function public.set_heritage_story_owner_archived(uuid,boolean) is 'Hides or restores a withdrawn/rejected story in its contributor account without deleting audit evidence.';
