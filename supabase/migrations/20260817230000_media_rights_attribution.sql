-- Tudela Global: retain and display the legal provenance of tour imagery.

alter table public.media_assets
  add column rights_status text not null default 'unknown',
  add column creator_name text,
  add column source_url text,
  add column license_name text,
  add column license_url text,
  add column attribution_text text,
  add column rights_notes text;

alter table public.media_assets
  add constraint media_assets_rights_status_check
    check (rights_status in ('unknown', 'own_work', 'public_domain', 'cc_by', 'cc_by_sa', 'permission_granted', 'other_licensed')),
  add constraint media_assets_creator_length check (creator_name is null or char_length(creator_name) <= 200),
  add constraint media_assets_source_url_length check (source_url is null or char_length(source_url) <= 2000),
  add constraint media_assets_license_name_length check (license_name is null or char_length(license_name) <= 150),
  add constraint media_assets_license_url_length check (license_url is null or char_length(license_url) <= 2000),
  add constraint media_assets_attribution_length check (attribution_text is null or char_length(attribution_text) <= 500),
  add constraint media_assets_rights_notes_length check (rights_notes is null or char_length(rights_notes) <= 2000),
  add constraint media_assets_approval_requires_rights check (
    validation_status <> 'approved'
    or (
      rights_status <> 'unknown'
      and nullif(btrim(attribution_text), '') is not null
      and (
        rights_status not in ('cc_by', 'cc_by_sa', 'other_licensed')
        or (
          nullif(btrim(source_url), '') is not null
          and nullif(btrim(license_name), '') is not null
          and nullif(btrim(license_url), '') is not null
        )
      )
    )
  ) not valid;

comment on column public.media_assets.rights_status is 'Legal basis for reusing the media asset.';
comment on column public.media_assets.attribution_text is 'Exact public-facing image credit retained with the asset.';
comment on constraint media_assets_approval_requires_rights on public.media_assets is
  'New media cannot be approved without a reusable rights basis and public credit. NOT VALID preserves legacy approved pilot assets.';
