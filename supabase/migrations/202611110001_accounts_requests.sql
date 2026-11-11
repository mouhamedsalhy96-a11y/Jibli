begin;

create table public.jibli_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.jibli_admins enable row level security;
revoke all on public.jibli_admins from anon, authenticated;

create function public.jibli_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.jibli_admins where user_id = (select auth.uid())); $$;
revoke all on function public.jibli_is_admin() from public, anon;
grant execute on function public.jibli_is_admin() to authenticated;

create table public.jibli_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reference text generated always as ('JB-' || upper(replace(id::text, '-', ''))) stored unique,
  customer_name text not null check (length(btrim(customer_name)) between 2 and 100),
  email text not null check (length(email) <= 254),
  phone text not null check (phone ~ '^(\+216)?[0-9]{8}$'),
  city text not null check (length(btrim(city)) between 2 and 100),
  status text not null default 'awaiting_quote' check (status = 'awaiting_quote'),
  created_at timestamptz not null default now()
);
create index jibli_requests_owner_created_idx on public.jibli_requests(owner_id, created_at desc);
create index jibli_requests_created_idx on public.jibli_requests(created_at desc);

create table public.jibli_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.jibli_requests(id) on delete cascade,
  title text not null check (length(btrim(title)) between 2 and 120),
  variant text not null check (length(btrim(variant)) between 1 and 200),
  quantity integer not null check (quantity between 1 and 20),
  shop text not null check (shop in ('shein', 'aliexpress')),
  url text not null check (
    length(url) <= 2000 and
    ((shop = 'shein' and url ~ '^https://([a-zA-Z0-9-]+\.)*shein\.com([/?]|$)') or
     (shop = 'aliexpress' and url ~ '^https://([a-zA-Z0-9-]+\.)*aliexpress\.com([/?]|$)'))
  ),
  note text not null default '' check (length(note) <= 500),
  position integer not null check (position between 1 and 20),
  unique(request_id, position)
);
alter table public.jibli_requests enable row level security;
alter table public.jibli_request_items enable row level security;
revoke all on public.jibli_requests, public.jibli_request_items from anon, authenticated;
grant select on public.jibli_requests, public.jibli_request_items to authenticated;
create policy request_read on public.jibli_requests for select to authenticated
using (owner_id = (select auth.uid()) or (select public.jibli_is_admin()));
create policy item_read on public.jibli_request_items for select to authenticated
using (exists(select 1 from public.jibli_requests r where r.id = request_id));

-- Only this transaction can create a request. Owner, email, status, reference,
-- timestamps and item IDs are determined by the database, never by the browser.
create function public.jibli_create_request(p_id uuid, p_name text, p_phone text, p_city text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_email text; v_item jsonb; v_position integer := 0; v_existing public.jibli_requests;
begin
  select email into v_email from auth.users where id = v_user and email_confirmed_at is not null;
  if v_user is null or v_email is null then raise exception 'Compte confirmé requis' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Panier invalide'; end if;
  if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Panier invalide'; end if;
  -- Same submission key makes retries idempotent; a foreign key cannot be reused.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into v_existing from public.jibli_requests where id = p_id;
  if found then
    if v_existing.owner_id <> v_user then raise exception 'Identifiant indisponible' using errcode = '42501'; end if;
    return v_existing.id;
  end if;
  insert into public.jibli_requests(id, owner_id, customer_name, email, phone, city)
  values(p_id, v_user, btrim(p_name), v_email, p_phone, btrim(p_city));
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_position := v_position + 1;
    if jsonb_typeof(v_item->'quantity') is distinct from 'number' or (v_item->>'quantity') !~ '^[0-9]+$' then raise exception 'Quantité invalide'; end if;
    insert into public.jibli_request_items(request_id,title,variant,quantity,shop,url,note,position)
    values(p_id,btrim(v_item->>'title'),btrim(v_item->>'variant'),(v_item->>'quantity')::integer,v_item->>'shop',v_item->>'url',coalesce(v_item->>'note',''),v_position);
  end loop;
  return p_id;
end; $$;
revoke all on function public.jibli_create_request(uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.jibli_create_request(uuid,text,text,text,jsonb) to authenticated;
commit;
