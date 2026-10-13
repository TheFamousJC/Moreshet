-- Remove PostgreSQL's default PUBLIC function execution before granting the
-- exact Stage 6A caller roles.

revoke all on function public.mark_tour_stop_completed(uuid, uuid, text) from public, anon;
revoke all on function public.submit_tour_rating(uuid, integer) from public, anon;
revoke all on function public.moderate_tour_rating(uuid, text, text) from public, anon;
revoke all on function public.withdraw_tour_rating(uuid) from public, anon;
revoke all on function public.get_tour_rating_summary(uuid) from public;

grant execute on function public.mark_tour_stop_completed(uuid, uuid, text) to authenticated;
grant execute on function public.submit_tour_rating(uuid, integer) to authenticated;
grant execute on function public.moderate_tour_rating(uuid, text, text) to authenticated;
grant execute on function public.withdraw_tour_rating(uuid) to authenticated;
grant execute on function public.get_tour_rating_summary(uuid) to anon, authenticated;
