-- Blazer Bites: core schema. Money is integer cents; times are timestamptz, service hours are America/Chicago.

create type public.user_role as enum ('student', 'crew', 'lead', 'admin');
create type public.order_status as enum ('received', 'cooking', 'ready', 'picked_up', 'cancelled');
create type public.order_channel as enum ('app', 'walk_up');
create type public.payment_method as enum (
  'demo', 'card', 'apple_pay', 'google_pay', 'blazerbucks', 'dragon_cash', 'cash', 'walkup_card'
);
create type public.item_status as enum ('active', 'sold_out_global', 'archived');
create type public.prep_kind as enum ('taste', 'hot_hold', 'cold_hold', 'food_safety');

-- ---------------------------------------------------------------------------
-- Shared helpers (no table access)
-- ---------------------------------------------------------------------------

create function public.local_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Chicago')::date
$$;

-- PostgREST always sets request.jwt.claims, so "no claims" means a direct DB session (cron, SQL editor, seed).
create function public.is_trusted_caller() returns boolean
language sql stable set search_path = '' as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is null
      then session_user::text <> 'authenticator'
    else (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.users (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  display_name      text check (char_length(display_name) <= 60),
  phone             text check (char_length(phone) <= 20),
  role              public.user_role not null default 'student',
  is_uab            boolean generated always as (coalesce(email ilike '%@uab.edu', false)) stored,
  allergen_prefs    text[] not null default '{}',
  favorite_item_ids uuid[] not null default '{}',
  class_gaps        jsonb not null default '[]' check (jsonb_typeof(class_gaps) = 'array'),
  notify_ready      boolean not null default true,
  notify_reminder   boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.spots (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  notes          text,
  is_placeholder boolean not null default true,
  is_late_night  boolean not null default false
);

create table public.carts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  spot_id           uuid not null references public.spots (id),
  is_open           boolean not null default false,
  surge             boolean not null default false,
  surge_alert       boolean not null default false,
  walkup_line       integer not null default 0 check (walkup_line >= 0),
  sold_out_item_ids uuid[] not null default '{}',
  live_wait_min     numeric(6, 1) not null default 0,
  orders_ahead      integer not null default 0,
  next_window_start timestamptz,
  avg_handoff_sec   integer,
  updated_at        timestamptz not null default now()
);
create index carts_spot_id_idx on public.carts (spot_id);

create table public.service_days (
  id                 uuid primary key default gen_random_uuid(),
  cart_id            uuid not null references public.carts (id) on delete cascade,
  spot_id            uuid not null references public.spots (id),
  service_date       date not null,
  opens_at           time not null,
  closes_at          time not null,
  is_late_night      boolean not null default false,
  window_capacity    integer not null default 25 check (window_capacity > 0),
  next_pickup_number integer not null default 101,
  unique (cart_id, service_date, opens_at),
  check (closes_at > opens_at)
);
create index service_days_spot_id_idx on public.service_days (spot_id);
create index service_days_date_idx on public.service_days (service_date);

create table public.pickup_windows (
  id             uuid primary key default gen_random_uuid(),
  cart_id        uuid not null references public.carts (id) on delete cascade,
  service_day_id uuid not null references public.service_days (id) on delete cascade,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  capacity       integer not null check (capacity > 0),
  booked_count   integer not null default 0,
  unique (cart_id, starts_at),
  check (ends_at > starts_at),
  check (booked_count between 0 and capacity)
);
create index pickup_windows_service_day_idx on public.pickup_windows (service_day_id, starts_at);

-- A hold is active while expires_at > now(); expired rows are swept by cron and by hold_window_spot.
create table public.window_holds (
  id         uuid primary key default gen_random_uuid(),
  window_id  uuid not null references public.pickup_windows (id) on delete cascade,
  holder     text not null check (char_length(holder) between 1 and 200),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index window_holds_window_expires_idx on public.window_holds (window_id, expires_at);

create table public.menu_items (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  price_cents         integer not null check (price_cents > 0 and price_cents <= 800),
  plate_cost_cents    integer not null default 0 check (plate_cost_cents >= 0),
  photo_url           text,
  allergens           text[] not null default '{}',
  calories            integer check (calories >= 0),
  variants            text[] not null default '{}',
  is_five_dollar_item boolean not null default false,
  is_special          boolean not null default false,
  is_next_special     boolean not null default false,
  is_express          boolean not null default false,
  nutrition_verified  boolean not null default false,
  status              public.item_status not null default 'active',
  avg_rating          numeric(3, 2),
  rating_count        integer not null default 0,
  is_sample           boolean not null default false,
  created_at          timestamptz not null default now(),
  check (not is_five_dollar_item or price_cents = 500)
);

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.users (id),
  guest_name         text check (char_length(guest_name) <= 60),
  guest_phone        text check (guest_phone ~ '^[0-9]{10,15}$'),
  cart_id            uuid not null references public.carts (id),
  service_day_id     uuid not null references public.service_days (id),
  window_id          uuid references public.pickup_windows (id),
  original_window_id uuid references public.pickup_windows (id),
  moved_late         boolean not null default false,
  status             public.order_status not null default 'received',
  pickup_number      integer not null,
  channel            public.order_channel not null,
  payment_method     public.payment_method not null,
  payment_ref        text,
  subtotal_cents     integer not null check (subtotal_cents >= 0),
  discount_cents     integer not null default 0 check (discount_cents >= 0),
  total_cents        integer not null,
  loyalty_applied    boolean not null default false,
  access_token       uuid not null unique default gen_random_uuid(),
  placed_at          timestamptz not null default now(),
  ready_at           timestamptz,
  arrived_at         timestamptz,
  picked_up_at       timestamptz,
  reminder_sent_at   timestamptz,
  is_sample          boolean not null default false,
  unique (service_day_id, pickup_number),
  check (total_cents = subtotal_cents - discount_cents and total_cents >= 0),
  check ((channel = 'app') = (window_id is not null)),
  check (channel = 'walk_up' or user_id is not null or (guest_name is not null and guest_phone is not null))
);
create index orders_cart_placed_idx on public.orders (cart_id, placed_at);
create index orders_cart_picked_up_idx on public.orders (cart_id, picked_up_at);
create index orders_active_cart_idx on public.orders (cart_id) where status not in ('picked_up', 'cancelled');
create index orders_window_idx on public.orders (window_id);
create index orders_original_window_idx on public.orders (original_window_id);
create index orders_user_idx on public.orders (user_id);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  menu_item_id     uuid not null references public.menu_items (id),
  variant          text,
  qty              integer not null check (qty > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_menu_item_idx on public.order_items (menu_item_id);

create table public.ratings (
  id            uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  stars         smallint not null check (stars between 1 and 5),
  tags          text[] not null default '{}'
                check (tags <@ array['too_salty', 'perfect', 'cold', 'small_portion', 'order_again']),
  comment       varchar(500),
  created_at    timestamptz not null default now(),
  is_sample     boolean not null default false
);
create index ratings_created_idx on public.ratings (created_at);

create table public.loyalty_cards (
  user_id           uuid primary key references public.users (id) on delete cascade,
  punches           integer not null default 0 check (punches >= 0),
  rewards_available integer not null default 0 check (rewards_available >= 0),
  lifetime_meals    integer not null default 0 check (lifetime_meals >= 0)
);

create table public.wait_snapshots (
  id           bigint generated always as identity primary key,
  cart_id      uuid not null references public.carts (id) on delete cascade,
  window_id    uuid references public.pickup_windows (id) on delete set null,
  taken_at     timestamptz not null default now(),
  wait_min     numeric(6, 1) not null,
  orders_ahead integer not null,
  walkup_line  integer not null,
  is_sample    boolean not null default false
);
create index wait_snapshots_cart_taken_idx on public.wait_snapshots (cart_id, taken_at);
create index wait_snapshots_window_idx on public.wait_snapshots (window_id);

create table public.prep_checks (
  id           uuid primary key default gen_random_uuid(),
  cart_id      uuid not null references public.carts (id) on delete cascade,
  service_date date not null default public.local_today(),
  kind         public.prep_kind not null,
  menu_item_id uuid references public.menu_items (id),
  passed       boolean not null,
  temp_f       numeric(5, 1),
  notes        text,
  checked_by   uuid references public.users (id) default auth.uid(),
  checked_at   timestamptz not null default now(),
  check (kind <> 'taste' or menu_item_id is not null)
);
create index prep_checks_cart_date_idx on public.prep_checks (cart_id, service_date);
create index prep_checks_menu_item_idx on public.prep_checks (menu_item_id);
create index prep_checks_checked_by_idx on public.prep_checks (checked_by);

create table public.settings (
  id                     integer primary key default 1 check (id = 1),
  window_min             integer not null default 10 check (window_min > 0),
  orders_per_window      integer not null default 25 check (orders_per_window > 0),
  walkup_cutoff          integer not null default 15,
  max_wait_min           integer not null default 10,
  surge_trigger_min      integer not null default 6,
  surge_windows          integer not null default 2 check (surge_windows > 0),
  express_size           integer not null default 2,
  cut_threshold          numeric(2, 1) not null default 4.0,
  cut_days               integer not null default 14,
  fixed_menu_threshold   numeric(2, 1) not null default 4.3,
  loyalty_every          integer not null default 10 check (loyalty_every >= 2),
  hold_min               integer not null default 5 check (hold_min > 0),
  avg_walkup_service_sec integer not null default 45,
  default_handoff_sec    integer not null default 30,
  demo_mode              boolean not null default true
);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users (id) on delete cascade,
  order_id   uuid references public.orders (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index push_subscriptions_order_idx on public.push_subscriptions (order_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.tg_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_auth_user_created();

-- Email is locked too because is_uab (the UAB badge) derives from it. app_role() is defined in the RLS migration.
create function public.tg_users_lock_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.email is distinct from old.email)
     and not public.is_trusted_caller()
     and public.app_role() is distinct from 'admin' then
    raise exception 'FORBIDDEN';
  end if;
  return new;
end
$$;

create trigger users_lock_role
  before update on public.users
  for each row execute function public.tg_users_lock_role();

create function public.tg_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.tg_set_updated_at();

-- Statement-level so bulk inserts (seed) recompute once. Inserts refresh only the touched items;
-- deletes (usually cascades from orders) refresh every item because the order_items rows may be gone.
create function public.tg_ratings_refresh_menu() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_item_ids uuid[];
begin
  if tg_op = 'INSERT' then
    select array_agg(distinct oi.menu_item_id) into v_item_ids
      from new_rows n
      join public.order_items oi on oi.id = n.order_item_id;
  end if;

  update public.menu_items m
     set avg_rating = s.avg_rating,
         rating_count = s.rating_count
    from (
      select mi.id,
             round(avg(r.stars), 2) as avg_rating,
             count(r.id)::integer as rating_count
        from public.menu_items mi
        left join public.order_items oi on oi.menu_item_id = mi.id
        left join public.ratings r on r.order_item_id = oi.id
       where v_item_ids is null or mi.id = any (v_item_ids)
       group by mi.id
    ) s
   where m.id = s.id
     and (m.avg_rating, m.rating_count) is distinct from (s.avg_rating, s.rating_count);
  return null;
end
$$;

create trigger ratings_refresh_menu_ins
  after insert on public.ratings
  referencing new table as new_rows
  for each statement execute function public.tg_ratings_refresh_menu();

create trigger ratings_refresh_menu_del
  after delete on public.ratings
  for each statement execute function public.tg_ratings_refresh_menu();

-- local_today() stays executable: it is the prep_checks.service_date default, evaluated as the inserting role.
revoke execute on function
  public.is_trusted_caller(),
  public.tg_auth_user_created(),
  public.tg_users_lock_role(),
  public.tg_set_updated_at(),
  public.tg_ratings_refresh_menu()
from public, anon, authenticated;
