-- RLS callers need execute permission on the private boolean policy helper.
revoke all on function private.is_public_organization(uuid) from public;
grant execute on function private.is_public_organization(uuid) to anon,authenticated;
