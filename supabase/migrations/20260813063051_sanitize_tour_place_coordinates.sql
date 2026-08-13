create or replace function public.sanitize_tour_place_coordinates()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.latitude is null or new.longitude is null
     or new.latitude < 32 or new.latitude > 40
     or new.longitude < 124 or new.longitude > 132 then
    new.latitude := null;
    new.longitude := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sanitize_tour_place_coordinates_trigger on public.tour_places;
create trigger sanitize_tour_place_coordinates_trigger
before insert or update of latitude, longitude on public.tour_places
for each row execute function public.sanitize_tour_place_coordinates();

update public.tour_places
set latitude = null,
    longitude = null,
    updated_at = now()
where latitude is null or longitude is null
   or latitude < 32 or latitude > 40
   or longitude < 124 or longitude > 132;