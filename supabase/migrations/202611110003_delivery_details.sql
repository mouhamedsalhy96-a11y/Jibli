begin;
create table public.jibli_deliveries (
  request_id uuid primary key references public.jibli_requests(id) on delete cascade,
  address text not null check (length(btrim(address)) between 10 and 500),
  city text not null check (length(btrim(city)) between 2 and 100),
  postcode text not null check (postcode ~ '^[0-9]{4}$'),
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default clock_timestamp()
);
create table public.jibli_delivery_events (
  request_id uuid not null references public.jibli_requests(id) on delete cascade,
  revision integer not null check (revision > 0),
  created_at timestamptz not null default clock_timestamp(),
  primary key(request_id, revision)
);
alter table public.jibli_deliveries enable row level security;
alter table public.jibli_delivery_events enable row level security;
revoke all on public.jibli_deliveries, public.jibli_delivery_events from anon, authenticated;
grant select on public.jibli_deliveries, public.jibli_delivery_events to authenticated;
create policy delivery_read on public.jibli_deliveries for select to authenticated
using (exists(select 1 from public.jibli_requests r where r.id=request_id));
create policy delivery_event_read on public.jibli_delivery_events for select to authenticated
using (exists(select 1 from public.jibli_requests r where r.id=request_id));

-- Lock the request so quote decisions and address changes are serialized.
-- The destination city must match the city used to prepare the accepted quote.
create function public.jibli_save_delivery(p_request uuid, p_quote_version integer, p_expected_revision integer, p_address text, p_city text, p_postcode text)
returns integer language plpgsql security definer set search_path = '' as $$
declare r public.jibli_requests; d public.jibli_deliveries; next_revision integer; saved_at timestamptz;
begin
  select * into r from public.jibli_requests where id=p_request for update;
  if not found or r.owner_id is distinct from auth.uid() then raise exception 'Accès refusé' using errcode='42501'; end if;
  if r.status <> 'awaiting_payment' or p_quote_version is null or p_quote_version <> r.accepted_version or r.accepted_version <> r.current_version then raise exception 'Acceptez le devis actuel avant de renseigner la livraison'; end if;
  if p_address is null or length(btrim(p_address)) not between 10 and 500 or p_postcode is null or btrim(p_postcode) !~ '^[0-9]{4}$' then raise exception 'Coordonnées de livraison invalides'; end if;
  if p_city is null or lower(btrim(p_city)) <> lower(btrim(r.city)) then raise exception 'La ville doit correspondre au devis accepté'; end if;
  select * into d from public.jibli_deliveries where request_id=p_request;
  if p_expected_revision is null or p_expected_revision <> coalesce(d.revision,0) then raise exception 'Les coordonnées ont changé : actualisez la page'; end if;
  -- A repeated identical save does not create misleading duplicate history.
  if d.request_id is not null and d.address=btrim(p_address) and d.city=r.city and d.postcode=btrim(p_postcode) then return d.revision; end if;
  next_revision := coalesce(d.revision,0)+1;
  saved_at := clock_timestamp();
  insert into public.jibli_deliveries(request_id,address,city,postcode,revision,updated_at)
  values(p_request,btrim(p_address),r.city,btrim(p_postcode),next_revision,saved_at)
  on conflict(request_id) do update set address=excluded.address,city=excluded.city,postcode=excluded.postcode,revision=excluded.revision,updated_at=excluded.updated_at;
  insert into public.jibli_delivery_events(request_id,revision,created_at) values(p_request,next_revision,saved_at);
  return next_revision;
end; $$;
revoke all on function public.jibli_save_delivery(uuid,integer,integer,text,text,text) from public, anon;
grant execute on function public.jibli_save_delivery(uuid,integer,integer,text,text,text) to authenticated;
commit;
