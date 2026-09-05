alter table public.app_service_status
  drop column if exists ios_min_version,
  drop column if exists ios_force_update,
  drop column if exists ios_store_url;
