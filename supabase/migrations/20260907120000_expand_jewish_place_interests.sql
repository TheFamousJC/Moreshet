-- Expand the shared CMS and visitor interest taxonomy for Jewish places and amenities.
alter type public.interest_key add value if not exists 'museum';
alter type public.interest_key add value if not exists 'kosher_food';
alter type public.interest_key add value if not exists 'community';
alter type public.interest_key add value if not exists 'education';
alter type public.interest_key add value if not exists 'archaeology';
alter type public.interest_key add value if not exists 'archives';
alter type public.interest_key add value if not exists 'culture';
