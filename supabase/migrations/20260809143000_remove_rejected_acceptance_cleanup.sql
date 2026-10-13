-- Remove the earlier local-only cleanup function. Audit-preserving closure is used instead.
drop function if exists public.cleanup_pilot_acceptance_organization(uuid);
