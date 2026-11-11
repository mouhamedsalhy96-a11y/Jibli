begin;
alter table public.jibli_requests drop constraint jibli_requests_status_check;
alter table public.jibli_requests add constraint jibli_requests_status_check check (
 status in ('awaiting_quote','quote_ready','declined','awaiting_payment','payment_review','ordered','in_transit','delivered')
);
alter table public.jibli_requests drop constraint accepted_quote_version;
alter table public.jibli_requests add constraint accepted_quote_version check (
 (status in ('awaiting_payment','payment_review','ordered','in_transit','delivered') and accepted_version is not null and accepted_version=current_version)
 or (status in ('awaiting_quote','quote_ready','declined') and accepted_version is null)
);

-- These records are test evidence only. They cannot represent real payments.
create table public.jibli_simulations (
 request_id uuid primary key references public.jibli_requests(id) on delete cascade,
 quote_version integer not null,
 simulation boolean not null default true check (simulation=true),
 amount bigint not null check (amount>0),
 reference text not null unique default ('TEST-' || gen_random_uuid()::text),
 declared_at timestamptz not null default clock_timestamp(),
 confirmed_at timestamptz,
 confirmed_by uuid references auth.users(id),
 tracking text check (tracking ~ '^DEMO-[A-Za-z0-9-]{3,95}$'),
 foreign key(request_id,quote_version) references public.jibli_quotes(request_id,version),
 check ((confirmed_at is null and confirmed_by is null) or (confirmed_at is not null and confirmed_by is not null))
);
create table public.jibli_simulation_events (
 request_id uuid not null references public.jibli_requests(id) on delete cascade,
 kind text not null check (kind in ('payment_review','ordered','in_transit','delivered')),
 created_at timestamptz not null default clock_timestamp(),
 primary key(request_id,kind)
);
alter table public.jibli_simulations enable row level security;
alter table public.jibli_simulation_events enable row level security;
revoke all on public.jibli_simulations, public.jibli_simulation_events from anon, authenticated;
grant select on public.jibli_simulations, public.jibli_simulation_events to authenticated;
create policy simulation_read on public.jibli_simulations for select to authenticated
using (exists(select 1 from public.jibli_requests r where r.id=request_id));
create policy simulation_event_read on public.jibli_simulation_events for select to authenticated
using (exists(select 1 from public.jibli_requests r where r.id=request_id));

create function public.jibli_declare_simulation(p_request uuid,p_quote_version integer,p_delivery_revision integer)
returns text language plpgsql security definer set search_path='' as $$
declare r public.jibli_requests; q public.jibli_quotes; d public.jibli_deliveries;
begin
 select * into r from public.jibli_requests where id=p_request for update;
 if not found or r.owner_id is distinct from auth.uid() then raise exception 'Accès refusé' using errcode='42501'; end if;
 if p_quote_version is null or p_quote_version is distinct from r.accepted_version or r.accepted_version is distinct from r.current_version then raise exception 'Devis accepté requis'; end if;
 if exists(select 1 from public.jibli_simulations where request_id=p_request and quote_version=p_quote_version) then return r.status; end if;
 if r.status <> 'awaiting_payment' then raise exception 'Simulation indisponible à cette étape'; end if;
 select * into d from public.jibli_deliveries where request_id=p_request;
 if not found or p_delivery_revision is null or p_delivery_revision<>d.revision then raise exception 'Livraison absente ou modifiée : actualisez la page'; end if;
 select * into q from public.jibli_quotes where request_id=p_request and version=r.accepted_version;
 if not found then raise exception 'Devis introuvable'; end if;
 insert into public.jibli_simulations(request_id,quote_version,amount) values(p_request,q.version,q.total);
 insert into public.jibli_simulation_events(request_id,kind) values(p_request,'payment_review');
 update public.jibli_requests set status='payment_review' where id=p_request;
 return 'payment_review';
end; $$;
revoke all on function public.jibli_declare_simulation(uuid,integer,integer) from public,anon;
grant execute on function public.jibli_declare_simulation(uuid,integer,integer) to authenticated;

create function public.jibli_advance_simulation(p_request uuid,p_expected text,p_tracking text default '')
returns text language plpgsql security definer set search_path='' as $$
declare r public.jibli_requests; s public.jibli_simulations; next_status text; event_at timestamptz;
begin
 if not public.jibli_is_admin() then raise exception 'Accès administrateur requis' using errcode='42501'; end if;
 select * into r from public.jibli_requests where id=p_request for update;
 if not found then raise exception 'Demande introuvable'; end if;
 if p_expected is null or r.status<>p_expected then raise exception 'Étape modifiée : actualisez la page'; end if;
 select * into s from public.jibli_simulations where request_id=p_request;
 if not found or not s.simulation or s.quote_version is distinct from r.accepted_version then raise exception 'Simulation de paiement requise'; end if;
 if not exists(select 1 from public.jibli_deliveries where request_id=p_request) then raise exception 'Livraison requise'; end if;
 next_status := case r.status when 'payment_review' then 'ordered' when 'ordered' then 'in_transit' when 'in_transit' then 'delivered' else null end;
 if next_status is null then raise exception 'Étape indisponible'; end if;
 event_at := clock_timestamp();
 if next_status='ordered' then
   update public.jibli_simulations set confirmed_at=event_at,confirmed_by=auth.uid() where request_id=p_request;
 else
   if s.confirmed_at is null then raise exception 'Confirmation simulée requise'; end if;
   if next_status='in_transit' then
     if p_tracking is null or btrim(p_tracking) !~ '^DEMO-[A-Za-z0-9-]{3,95}$' then raise exception 'Utilisez une référence fictive DEMO- suivie de 3 à 95 lettres, chiffres ou tirets'; end if;
     update public.jibli_simulations set tracking=btrim(p_tracking) where request_id=p_request;
   end if;
   if next_status='delivered' and s.tracking is null then raise exception 'Référence fictive requise'; end if;
 end if;
 insert into public.jibli_simulation_events(request_id,kind,created_at) values(p_request,next_status,event_at);
 update public.jibli_requests set status=next_status where id=p_request;
 return next_status;
end; $$;
revoke all on function public.jibli_advance_simulation(uuid,text,text) from public,anon;
grant execute on function public.jibli_advance_simulation(uuid,text,text) to authenticated;
commit;
