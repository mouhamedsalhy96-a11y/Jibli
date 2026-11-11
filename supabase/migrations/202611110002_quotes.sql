begin;
alter table public.jibli_requests drop constraint jibli_requests_status_check;
alter table public.jibli_requests add constraint jibli_requests_status_check
check (status in ('awaiting_quote','quote_ready','declined','awaiting_payment'));
alter table public.jibli_requests add column current_version integer not null default 0 check (current_version >= 0);
alter table public.jibli_requests add column accepted_version integer;
alter table public.jibli_requests add column decided_at timestamptz;
alter table public.jibli_requests add constraint accepted_quote_version check (
  (status = 'awaiting_payment' and accepted_version is not null and accepted_version = current_version)
  or (status <> 'awaiting_payment' and accepted_version is null)
);

create table public.jibli_quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.jibli_requests(id) on delete cascade,
  version integer not null check (version > 0),
  unit_prices jsonb not null,
  costs jsonb not null,
  total bigint not null check (total > 0 and total <= 1000000000000),
  valid_until timestamptz not null,
  min_days integer not null check (min_days between 1 and 180),
  max_days integer not null check (max_days between min_days and 180),
  note text not null check (length(note) <= 1000),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid not null references auth.users(id),
  unique (request_id, version)
);
alter table public.jibli_quotes enable row level security;
revoke all on public.jibli_quotes from anon, authenticated;
grant select on public.jibli_quotes to authenticated;
create policy quote_read on public.jibli_quotes for select to authenticated
using (exists(select 1 from public.jibli_requests r where r.id = request_id));

create function public.jibli_publish_quote(p_request uuid, p_expected integer, p_prices jsonb, p_costs jsonb, p_valid_days integer, p_min_days integer, p_max_days integer, p_note text)
returns integer language plpgsql security definer set search_path = '' as $$
declare r public.jibli_requests; i public.jibli_request_items; k text; v jsonb; amount bigint; total bigint := 0; version integer;
begin
  if not public.jibli_is_admin() then raise exception 'Accès administrateur requis' using errcode='42501'; end if;
  select * into r from public.jibli_requests where id=p_request for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if r.status not in ('awaiting_quote','quote_ready') then raise exception 'Devis verrouillé'; end if;
  if p_expected is null or p_expected <> r.current_version then raise exception 'Version modifiée : actualisez la page'; end if;
  if p_valid_days is null or p_valid_days not between 1 and 30 or p_min_days is null or p_max_days is null or p_min_days < 1 or p_max_days < p_min_days or p_max_days > 180 then raise exception 'Délais invalides'; end if;
  if p_note is null or length(p_note)>1000 then raise exception 'Note invalide'; end if;
  if jsonb_typeof(p_prices) is distinct from 'object' or jsonb_typeof(p_costs) is distinct from 'object' then raise exception 'Montants invalides'; end if;
  if (select count(*) from jsonb_object_keys(p_prices)) <> (select count(*) from public.jibli_request_items where request_id=p_request) then raise exception 'Chiffrez chaque article'; end if;
  for i in select * from public.jibli_request_items where request_id=p_request loop
    v := p_prices->i.id::text;
    if jsonb_typeof(v) is distinct from 'number' or v::text !~ '^[0-9]{1,9}$' then raise exception 'Prix invalide'; end if;
    amount := v::text::bigint;
    if amount <= 0 then raise exception 'Prix supérieur à zéro requis'; end if;
    total := total + amount * i.quantity;
  end loop;
  if (select count(*) from jsonb_object_keys(p_costs)) <> 4 then raise exception 'Frais invalides'; end if;
  foreach k in array array['transport','customs','service','delivery'] loop
    v := p_costs->k;
    if jsonb_typeof(v) is distinct from 'number' or v::text !~ '^[0-9]{1,9}$' then raise exception 'Frais invalides'; end if;
    total := total + v::text::bigint;
  end loop;
  version := r.current_version+1;
  insert into public.jibli_quotes(request_id,version,unit_prices,costs,total,valid_until,min_days,max_days,note,created_by)
  values(p_request,version,p_prices,p_costs,total,clock_timestamp()+make_interval(days=>p_valid_days),p_min_days,p_max_days,btrim(p_note),auth.uid());
  update public.jibli_requests set status='quote_ready',current_version=version where id=p_request;
  return version;
end; $$;
revoke all on function public.jibli_publish_quote(uuid,integer,jsonb,jsonb,integer,integer,integer,text) from public, anon;
grant execute on function public.jibli_publish_quote(uuid,integer,jsonb,jsonb,integer,integer,integer,text) to authenticated;

create function public.jibli_decide_quote(p_request uuid, p_version integer, p_accept boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.jibli_requests; q public.jibli_quotes; next_status text;
begin
  select * into r from public.jibli_requests where id=p_request for update;
  if not found or r.owner_id is distinct from auth.uid() then raise exception 'Accès refusé' using errcode='42501'; end if;
  if r.status <> 'quote_ready' or p_version is null or p_version <> r.current_version then raise exception 'Version modifiée : actualisez la page'; end if;
  select * into q from public.jibli_quotes where request_id=p_request and version=p_version;
  if not found or clock_timestamp() >= q.valid_until then raise exception 'Devis expiré : demandez une nouvelle proposition'; end if;
  if p_accept is null then raise exception 'Décision requise'; end if;
  next_status := case when p_accept then 'awaiting_payment' else 'declined' end;
  update public.jibli_requests set status=next_status,accepted_version=case when p_accept then p_version else null end,decided_at=clock_timestamp() where id=p_request;
  return next_status;
end; $$;
revoke all on function public.jibli_decide_quote(uuid,integer,boolean) from public, anon;
grant execute on function public.jibli_decide_quote(uuid,integer,boolean) to authenticated;
commit;
