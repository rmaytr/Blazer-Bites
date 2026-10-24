-- Blazer Bites: Slice-0 RPCs. Every RPC is SECURITY DEFINER with an empty search_path, checks the caller
-- itself, and raises an exception whose message is exactly the client error code:
--   WINDOW_FULL, WINDOW_CLOSED, HOLD_EXPIRED, SOLD_OUT, NOT_EXPRESS, SIGNOFF_MISSING, ALREADY_MOVED,
--   ALREADY_RATED, NOT_PICKED_UP, FORBIDDEN, DEMO_DISABLED, CART_CLOSED, NOT_FOUND, INVALID_INPUT
--
-- Lock order (prevents deadlocks): orders row -> pickup_windows rows (ascending starts_at)
-- -> window_holds -> service_days -> loyalty_cards -> carts (carts is always last, via the wait triggers).
--
-- p_items is a JSON array of {"menu_item_id": uuid, "variant": text|null, "qty": int}.

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------

create function public.require_role(variadic p_roles public.user_role[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_trusted_caller() and coalesce(public.app_role() <> all (p_roles), true) then
    raise exception 'FORBIDDEN';
  end if;
end
$$;

-- Validates and prices a basket. orderable = false means sold out everywhere or not on sale yet.
create function public.order_lines(p_items jsonb)
returns table (
  menu_item_id     uuid,
  variant          text,
  qty              integer,
  unit_price_cents integer,
  is_express       boolean,
  orderable        boolean
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'INVALID_INPUT';
  end if;

  if exists (
    select 1
      from jsonb_to_recordset(p_items) as l (menu_item_id uuid, variant text, qty integer)
      left join public.menu_items m on m.id = l.menu_item_id and m.status <> 'archived'
     where m.id is null
        or l.qty is null
        or l.qty not between 1 and 20
        or (cardinality(m.variants) > 0 and (l.variant is null or l.variant <> all (m.variants)))
        or (cardinality(m.variants) = 0 and l.variant is not null)
  ) then
    raise exception 'INVALID_INPUT';
  end if;

  return query
    select m.id, l.variant, l.qty, m.price_cents, m.is_express, (m.status = 'active' and not m.is_next_special)
      from jsonb_to_recordset(p_items) as l (menu_item_id uuid, variant text, qty integer)
      join public.menu_items m on m.id = l.menu_item_id;
exception
  when invalid_text_representation or invalid_parameter_value or datatype_mismatch then
    raise exception 'INVALID_INPUT';
end
$$;

create function public.order_json(p_order_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id,
    'cart_id', o.cart_id,
    'cart_name', c.name,
    'spot_name', s.name,
    'window_id', o.window_id,
    'window_starts_at', w.starts_at,
    'window_ends_at', w.ends_at,
    'original_window_id', o.original_window_id,
    'moved_late', o.moved_late,
    'status', o.status,
    'pickup_number', o.pickup_number,
    'channel', o.channel,
    'customer_name', coalesce(o.guest_name, u.display_name),
    'payment_method', o.payment_method,
    'subtotal_cents', o.subtotal_cents,
    'discount_cents', o.discount_cents,
    'total_cents', o.total_cents,
    'loyalty_applied', o.loyalty_applied,
    'access_token', o.access_token,
    'placed_at', o.placed_at,
    'ready_at', o.ready_at,
    'arrived_at', o.arrived_at,
    'picked_up_at', o.picked_up_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', oi.id,
               'menu_item_id', oi.menu_item_id,
               'name', m.name,
               'photo_url', m.photo_url,
               'variant', oi.variant,
               'qty', oi.qty,
               'unit_price_cents', oi.unit_price_cents,
               'rated', r.id is not null,
               'stars', r.stars
             ) order by m.name, oi.id)
        from public.order_items oi
        join public.menu_items m on m.id = oi.menu_item_id
        left join public.ratings r on r.order_item_id = oi.id
       where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.carts c on c.id = o.cart_id
  join public.service_days d on d.id = o.service_day_id
  join public.spots s on s.id = d.spot_id
  left join public.pickup_windows w on w.id = o.window_id
  left join public.users u on u.id = o.user_id
  where o.id = p_order_id
$$;

-- ---------------------------------------------------------------------------
-- Live wait
-- ---------------------------------------------------------------------------

-- wait_min is raw (uncapped); clients cap the display at settings.max_wait_min and show next_window_start.
create function public.compute_cart_wait(p_cart_id uuid)
returns table (
  wait_min          numeric,
  orders_ahead      integer,
  next_window_id    uuid,
  next_window_start timestamptz,
  is_full           boolean
)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_settings   public.settings;
  v_day_start  timestamptz := public.local_today()::timestamp at time zone 'America/Chicago';
  v_line       integer;
  v_ahead      integer;
  v_handoff    integer;
  v_wait       numeric;
  v_next_id    uuid;
  v_next_start timestamptz;
begin
  select * into v_settings from public.settings s where s.id = 1;

  select c.walkup_line into v_line from public.carts c where c.id = p_cart_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  select count(*)::integer into v_ahead
    from public.orders o
    join public.pickup_windows w on w.id = o.window_id
   where o.cart_id = p_cart_id
     and o.status not in ('picked_up', 'cancelled')
     and w.starts_at >= v_day_start
     and w.starts_at <= now();

  select round(avg(extract(epoch from h.picked_up_at - h.arrived_at)))::integer into v_handoff
    from (
      select o.picked_up_at, o.arrived_at
        from public.orders o
       where o.cart_id = p_cart_id
         and o.channel = 'app'
         and o.picked_up_at >= v_day_start
         and o.arrived_at is not null
       order by o.picked_up_at desc
       limit 20
    ) h;
  v_handoff := coalesce(v_handoff, v_settings.default_handoff_sec);

  v_wait := round((v_ahead * v_handoff + v_line * v_settings.avg_walkup_service_sec) / 60.0, 1);

  select w.id, w.starts_at into v_next_id, v_next_start
    from public.pickup_windows w
   where w.cart_id = p_cart_id
     and w.ends_at > now()
     and w.booked_count + (
           select count(*) from public.window_holds h where h.window_id = w.id and h.expires_at > now()
         ) < w.capacity
   order by w.starts_at
   limit 1;

  update public.carts c
     set live_wait_min = v_wait,
         orders_ahead = v_ahead,
         next_window_start = v_next_start,
         avg_handoff_sec = v_handoff
   where c.id = p_cart_id
     and (c.live_wait_min, c.orders_ahead, c.next_window_start, c.avg_handoff_sec)
         is distinct from (v_wait, v_ahead, v_next_start, v_handoff);

  return query select v_wait, v_ahead, v_next_id, v_next_start, v_wait > v_settings.max_wait_min;
end
$$;

create function public.check_surge(p_cart_id uuid) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_settings public.settings;
  v_hot      integer;
  v_alert    boolean;
begin
  perform public.require_role('crew', 'lead', 'admin');
  select * into v_settings from public.settings s where s.id = 1;

  select count(*) filter (where x.max_wait > v_settings.surge_trigger_min) into v_hot
    from (
      select (select max(ws.wait_min) from public.wait_snapshots ws where ws.window_id = w.id) as max_wait
        from public.pickup_windows w
       where w.cart_id = p_cart_id
         and w.starts_at <= now()
         and w.starts_at >= public.local_today()::timestamp at time zone 'America/Chicago'
       order by w.starts_at desc
       limit v_settings.surge_windows
    ) x;

  v_alert := v_hot = v_settings.surge_windows;

  update public.carts c set surge_alert = v_alert where c.id = p_cart_id and c.surge_alert is distinct from v_alert;
  return v_alert;
end
$$;

create function public.snapshot_waits() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_cart  record;
  v_count integer := 0;
begin
  perform public.require_role('crew', 'lead', 'admin');

  for v_cart in select c.id, c.walkup_line from public.carts c where c.is_open order by c.id loop
    insert into public.wait_snapshots (cart_id, window_id, wait_min, orders_ahead, walkup_line)
    select v_cart.id,
           (select w.id from public.pickup_windows w
             where w.cart_id = v_cart.id and w.starts_at <= now() and w.ends_at > now()),
           r.wait_min,
           r.orders_ahead,
           v_cart.walkup_line
      from public.compute_cart_wait(v_cart.id) r;

    perform public.check_surge(v_cart.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end
$$;

create function public.tg_orders_refresh_wait() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.compute_cart_wait(c.cart_id) from (select distinct n.cart_id from new_rows n) c;
  return null;
end
$$;

create trigger orders_refresh_wait_ins
  after insert on public.orders
  referencing new table as new_rows
  for each statement execute function public.tg_orders_refresh_wait();

create trigger orders_refresh_wait_upd
  after update on public.orders
  referencing new table as new_rows
  for each statement execute function public.tg_orders_refresh_wait();

create function public.tg_carts_refresh_wait() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.compute_cart_wait(new.id);
  return null;
end
$$;

create trigger carts_walkup_line_refresh_wait
  after update of walkup_line on public.carts
  for each row when (old.walkup_line is distinct from new.walkup_line)
  execute function public.tg_carts_refresh_wait();

-- ---------------------------------------------------------------------------
-- Holds and ordering (student / guest)
-- ---------------------------------------------------------------------------

create function public.hold_window_spot(p_window_id uuid, p_holder text)
returns table (hold_id uuid, expires_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_window   public.pickup_windows;
  v_hold_min integer;
  v_active   integer;
  v_hold     public.window_holds;
begin
  if p_holder is null or char_length(p_holder) not between 1 and 200 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_window from public.pickup_windows w where w.id = p_window_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_window.ends_at <= now() then
    raise exception 'WINDOW_CLOSED';
  end if;

  -- Re-holding replaces the holder's previous hold on this window (one active hold per holder per window).
  delete from public.window_holds h
   where h.window_id = p_window_id and (h.expires_at <= now() or h.holder = p_holder);

  select count(*)::integer into v_active from public.window_holds h where h.window_id = p_window_id;
  if v_window.booked_count + v_active >= v_window.capacity then
    raise exception 'WINDOW_FULL';
  end if;

  select s.hold_min into v_hold_min from public.settings s where s.id = 1;

  insert into public.window_holds (window_id, holder, expires_at)
  values (p_window_id, p_holder, now() + make_interval(mins => v_hold_min))
  returning * into v_hold;

  return query select v_hold.id, v_hold.expires_at;
end
$$;

create function public.release_hold(p_hold_id uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.window_holds h where h.id = p_hold_id
$$;

-- Loyalty: one reward = the most expensive single unit in the basket is free.
create function public.quote_order(p_items jsonb, p_user_id uuid default auth.uid())
returns table (subtotal_cents integer, discount_cents integer, total_cents integer, loyalty_applied boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_subtotal integer;
  v_max_unit integer;
  v_reward   boolean;
  v_discount integer;
begin
  if p_user_id is distinct from auth.uid() and not public.is_trusted_caller() then
    raise exception 'FORBIDDEN';
  end if;

  select sum(l.qty * l.unit_price_cents)::integer, max(l.unit_price_cents)
    into v_subtotal, v_max_unit
    from public.order_lines(p_items) l;

  v_reward := p_user_id is not null and exists (
    select 1 from public.loyalty_cards c where c.user_id = p_user_id and c.rewards_available > 0
  );
  v_discount := case when v_reward then v_max_unit else 0 end;

  return query select v_subtotal, v_discount, v_subtotal - v_discount, v_reward;
end
$$;

create function public.place_order(
  p_hold_id        uuid,
  p_items          jsonb,
  p_payment_method public.payment_method,
  p_payment_ref    text default null,
  p_guest_name     text default null,
  p_guest_phone    text default null,
  p_user_id        uuid default auth.uid()
)
returns table (order_id uuid, pickup_number integer, access_token uuid, total_cents integer)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_name      text := nullif(btrim(p_guest_name), '');
  v_phone     text := nullif(regexp_replace(coalesce(p_guest_phone, ''), '[^0-9]', '', 'g'), '');
  v_window_id uuid;
  v_window    public.pickup_windows;
  v_cart      public.carts;
  v_every     integer;
  v_quote     record;
  v_number    integer;
  v_order     public.orders;
begin
  if p_payment_method = 'demo' then
    if not (select s.demo_mode from public.settings s where s.id = 1) then
      raise exception 'DEMO_DISABLED';
    end if;
  elsif not public.is_trusted_caller() then
    -- Real payment methods are only placed by the payment edge function (service role) after a charge.
    raise exception 'FORBIDDEN';
  end if;

  if p_user_id is distinct from auth.uid() and not public.is_trusted_caller() then
    raise exception 'FORBIDDEN';
  end if;
  if char_length(v_name) > 60 or v_phone !~ '^[0-9]{10,15}$'
     or (p_user_id is null and (v_name is null or v_phone is null)) then
    raise exception 'INVALID_INPUT';
  end if;

  select h.window_id into v_window_id from public.window_holds h where h.id = p_hold_id;
  if v_window_id is null then
    raise exception 'HOLD_EXPIRED';
  end if;

  select * into v_window from public.pickup_windows w where w.id = v_window_id for update;
  perform 1 from public.window_holds h where h.id = p_hold_id and h.expires_at > now() for update;
  if not found then
    raise exception 'HOLD_EXPIRED';
  end if;
  if v_window.booked_count >= v_window.capacity then
    raise exception 'WINDOW_FULL';
  end if;

  select * into v_cart from public.carts c where c.id = v_window.cart_id;
  if exists (
    select 1 from public.order_lines(p_items) l
     where not l.orderable or l.menu_item_id = any (v_cart.sold_out_item_ids)
  ) then
    raise exception 'SOLD_OUT';
  end if;
  if v_cart.surge and exists (select 1 from public.order_lines(p_items) l where not l.is_express) then
    raise exception 'NOT_EXPRESS';
  end if;

  update public.pickup_windows w set booked_count = w.booked_count + 1 where w.id = v_window.id;
  delete from public.window_holds h where h.id = p_hold_id;

  update public.service_days d
     set next_pickup_number = d.next_pickup_number + 1
   where d.id = v_window.service_day_id
  returning d.next_pickup_number - 1 into v_number;

  if p_user_id is not null then
    insert into public.loyalty_cards (user_id) values (p_user_id) on conflict (user_id) do nothing;
    perform 1 from public.loyalty_cards c where c.user_id = p_user_id for update;
  end if;

  select * into v_quote from public.quote_order(p_items, p_user_id);

  insert into public.orders (
    user_id, guest_name, guest_phone, cart_id, service_day_id, window_id, original_window_id,
    pickup_number, channel, payment_method, payment_ref,
    subtotal_cents, discount_cents, total_cents, loyalty_applied
  )
  values (
    p_user_id, v_name, v_phone, v_window.cart_id, v_window.service_day_id, v_window.id, v_window.id,
    v_number, 'app', p_payment_method, p_payment_ref,
    v_quote.subtotal_cents, v_quote.discount_cents, v_quote.total_cents, v_quote.loyalty_applied
  )
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, variant, qty, unit_price_cents)
  select v_order.id, l.menu_item_id, l.variant, l.qty, l.unit_price_cents from public.order_lines(p_items) l;

  -- A paid order earns a punch; reaching loyalty_every - 1 punches banks a reward, so the Nth meal is free.
  if p_user_id is not null then
    select s.loyalty_every into v_every from public.settings s where s.id = 1;
    update public.loyalty_cards c
       set rewards_available = c.rewards_available
                               - v_quote.loyalty_applied::integer
                               + (not v_quote.loyalty_applied and c.punches + 1 >= v_every - 1)::integer,
           punches = case
                       when v_quote.loyalty_applied then c.punches
                       when c.punches + 1 >= v_every - 1 then 0
                       else c.punches + 1
                     end,
           lifetime_meals = c.lifetime_meals + 1
     where c.user_id = p_user_id;
  end if;

  return query select v_order.id, v_order.pickup_number, v_order.access_token, v_order.total_cents;
end
$$;

-- ---------------------------------------------------------------------------
-- Token RPCs (the only anon path to an order)
-- ---------------------------------------------------------------------------

-- Returns null when the token is unknown.
create function public.get_order_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.order_json(o.id) from public.orders o where o.access_token = p_token
$$;

create function public.mark_here(p_token uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.orders o where o.access_token = p_token) then
    raise exception 'NOT_FOUND';
  end if;

  update public.orders o
     set arrived_at = now()
   where o.access_token = p_token
     and o.arrived_at is null
     and o.status not in ('picked_up', 'cancelled');
end
$$;

create function public.move_order_late(p_token uuid)
returns table (new_window_id uuid, starts_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_order     public.orders;
  v_old       public.pickup_windows;
  v_candidate record;
  v_new_id    uuid;
  v_new_start timestamptz;
begin
  select * into v_order from public.orders o where o.access_token = p_token for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_order.moved_late then
    raise exception 'ALREADY_MOVED';
  end if;
  if v_order.channel <> 'app' or v_order.status in ('picked_up', 'cancelled') then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_old from public.pickup_windows w where w.id = v_order.window_id for update;

  -- Later windows are locked in ascending starts_at order, the same order every multi-window lock uses.
  for v_candidate in
    select w.id, w.starts_at, w.capacity, w.booked_count
      from public.pickup_windows w
     where w.service_day_id = v_old.service_day_id
       and w.starts_at > v_old.starts_at
       and w.ends_at > now()
     order by w.starts_at
       for update
  loop
    if v_candidate.booked_count + (
         select count(*) from public.window_holds h
          where h.window_id = v_candidate.id and h.expires_at > now()
       ) < v_candidate.capacity then
      v_new_id := v_candidate.id;
      v_new_start := v_candidate.starts_at;
      exit;
    end if;
  end loop;

  if v_new_id is null then
    raise exception 'WINDOW_FULL';
  end if;

  update public.pickup_windows w set booked_count = w.booked_count - 1 where w.id = v_old.id;
  update public.pickup_windows w set booked_count = w.booked_count + 1 where w.id = v_new_id;
  update public.orders o
     set window_id = v_new_id, moved_late = true, reminder_sent_at = null
   where o.id = v_order.id;

  return query select v_new_id, v_new_start;
end
$$;

create function public.submit_rating(
  p_token         uuid,
  p_order_item_id uuid,
  p_stars         integer,
  p_tags          text[] default '{}',
  p_comment       text default null
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_status  public.order_status;
  v_comment text := nullif(btrim(p_comment), '');
  v_tags    text[] := array(select distinct t from unnest(coalesce(p_tags, '{}')) t);
begin
  select o.status into v_status
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
   where o.access_token = p_token and oi.id = p_order_item_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_status <> 'picked_up' then
    raise exception 'NOT_PICKED_UP';
  end if;
  if p_stars is null or p_stars not between 1 and 5
     or not v_tags <@ array['too_salty', 'perfect', 'cold', 'small_portion', 'order_again']
     or char_length(v_comment) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.ratings (order_item_id, stars, tags, comment)
  values (p_order_item_id, p_stars, v_tags, v_comment)
  on conflict (order_item_id) do nothing;
  if not found then
    raise exception 'ALREADY_RATED';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Crew RPCs
-- ---------------------------------------------------------------------------

create function public.place_walkup_order(p_cart_id uuid, p_items jsonb, p_payment_method public.payment_method)
returns table (order_id uuid, pickup_number integer)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_cart     public.carts;
  v_day_id   uuid;
  v_subtotal integer;
  v_number   integer;
  v_order_id uuid;
begin
  perform public.require_role('crew', 'lead', 'admin');

  select * into v_cart from public.carts c where c.id = p_cart_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if not v_cart.is_open then
    raise exception 'CART_CLOSED';
  end if;

  if exists (
    select 1 from public.order_lines(p_items) l
     where not l.orderable or l.menu_item_id = any (v_cart.sold_out_item_ids)
  ) then
    raise exception 'SOLD_OUT';
  end if;
  if v_cart.surge and exists (select 1 from public.order_lines(p_items) l where not l.is_express) then
    raise exception 'NOT_EXPRESS';
  end if;

  -- Today's service day whose opening time is closest to now (lunch vs. late night).
  select d.id into v_day_id
    from public.service_days d
   where d.cart_id = p_cart_id and d.service_date = public.local_today()
   order by abs(extract(epoch from d.opens_at - (now() at time zone 'America/Chicago')::time))
   limit 1;
  if v_day_id is null then
    raise exception 'CART_CLOSED';
  end if;

  update public.service_days d
     set next_pickup_number = d.next_pickup_number + 1
   where d.id = v_day_id
  returning d.next_pickup_number - 1 into v_number;

  select sum(l.qty * l.unit_price_cents)::integer into v_subtotal from public.order_lines(p_items) l;

  insert into public.orders (
    cart_id, service_day_id, pickup_number, channel, payment_method,
    subtotal_cents, discount_cents, total_cents, arrived_at
  )
  values (p_cart_id, v_day_id, v_number, 'walk_up', p_payment_method, v_subtotal, 0, v_subtotal, now())
  returning id into v_order_id;

  insert into public.order_items (order_id, menu_item_id, variant, qty, unit_price_cents)
  select v_order_id, l.menu_item_id, l.variant, l.qty, l.unit_price_cents from public.order_lines(p_items) l;

  return query select v_order_id, v_number;
end
$$;

create function public.advance_order_status(p_order_id uuid, p_status public.order_status) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_status public.order_status;
begin
  perform public.require_role('crew', 'lead', 'admin');

  select o.status into v_status from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_status = p_status then
    return;
  end if;
  if p_status not in ('cooking', 'ready') or v_status not in ('received', 'cooking') or p_status < v_status then
    raise exception 'INVALID_INPUT';
  end if;

  update public.orders o
     set status = p_status,
         ready_at = case when p_status = 'ready' then now() else o.ready_at end
   where o.id = p_order_id;
end
$$;

-- p_code is an access token (or a scanned URL containing one) or today's pickup number at this cart.
-- A token can resolve to another cart's order; the client compares cart_id.
create function public.find_order_for_handoff(p_cart_id uuid, p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_code     text := btrim(coalesce(p_code, ''));
  v_token    uuid;
  v_order_id uuid;
begin
  perform public.require_role('crew', 'lead', 'admin');

  v_token := substring(v_code from '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')::uuid;

  if v_token is not null then
    select o.id into v_order_id from public.orders o where o.access_token = v_token;
  elsif v_code ~ '^[0-9]{1,6}$' then
    select o.id into v_order_id
      from public.orders o
      join public.service_days d on d.id = o.service_day_id
     where o.cart_id = p_cart_id
       and d.service_date = public.local_today()
       and o.pickup_number = v_code::integer
     order by o.status in ('picked_up', 'cancelled'), o.placed_at desc
     limit 1;
  else
    raise exception 'INVALID_INPUT';
  end if;

  if v_order_id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.orders o
     set arrived_at = now()
   where o.id = v_order_id and o.arrived_at is null and o.status not in ('picked_up', 'cancelled');

  return public.order_json(v_order_id);
end
$$;

create function public.mark_picked_up(p_order_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_status public.order_status;
begin
  perform public.require_role('crew', 'lead', 'admin');

  select o.status into v_status from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_status = 'picked_up' then
    return;
  end if;
  if v_status = 'cancelled' then
    raise exception 'INVALID_INPUT';
  end if;

  update public.orders o
     set status = 'picked_up',
         picked_up_at = now(),
         arrived_at = coalesce(o.arrived_at, now()),
         ready_at = coalesce(o.ready_at, now())
   where o.id = p_order_id;
end
$$;

create function public.set_walkup_line(p_cart_id uuid, p_delta integer) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_line integer;
begin
  perform public.require_role('crew', 'lead', 'admin');

  update public.carts c
     set walkup_line = greatest(0, c.walkup_line + coalesce(p_delta, 0))
   where c.id = p_cart_id
  returning c.walkup_line into v_line;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  return v_line;
end
$$;

create function public.set_item_sold_out(p_cart_id uuid, p_item_id uuid, p_on boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.require_role('crew', 'lead', 'admin');
  if not exists (select 1 from public.menu_items m where m.id = p_item_id) then
    raise exception 'NOT_FOUND';
  end if;

  update public.carts c
     set sold_out_item_ids = case
           when p_on then array(select distinct x from unnest(c.sold_out_item_ids || p_item_id) x)
           else array_remove(c.sold_out_item_ids, p_item_id)
         end
   where c.id = p_cart_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Lead RPCs
-- ---------------------------------------------------------------------------

create function public.set_cart_surge(p_cart_id uuid, p_on boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.require_role('lead', 'admin');

  -- Turning express on acknowledges the alert; check_surge re-raises it if waits stay high.
  update public.carts c
     set surge = p_on,
         surge_alert = case when p_on then false else c.surge_alert end
   where c.id = p_cart_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end
$$;

-- Requires, for today: the latest taste check of every orderable dish passed, and the latest
-- hot_hold, cold_hold and food_safety checks passed.
create function public.open_cart(p_cart_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_cart public.carts;
begin
  perform public.require_role('lead', 'admin');

  select * into v_cart from public.carts c where c.id = p_cart_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_cart.is_open then
    return;
  end if;

  if exists (
    with latest as (
      select distinct on (p.kind, case when p.kind = 'taste' then p.menu_item_id end)
             p.kind,
             case when p.kind = 'taste' then p.menu_item_id end as menu_item_id,
             p.passed
        from public.prep_checks p
       where p.cart_id = p_cart_id and p.service_date = public.local_today()
       order by p.kind, case when p.kind = 'taste' then p.menu_item_id end, p.checked_at desc
    ),
    required as (
      select 'taste'::public.prep_kind as kind, m.id as menu_item_id
        from public.menu_items m
       where m.status = 'active' and not m.is_next_special and m.id <> all (v_cart.sold_out_item_ids)
      union all
      select k, null from unnest('{hot_hold,cold_hold,food_safety}'::public.prep_kind[]) k
    )
    select 1
      from required r
      left join latest l on l.kind = r.kind and l.menu_item_id is not distinct from r.menu_item_id
     where not coalesce(l.passed, false)
  ) then
    raise exception 'SIGNOFF_MISSING';
  end if;

  update public.carts c set is_open = true where c.id = p_cart_id;
end
$$;

-- Ends the service: clears the line, express mode and per-cart sold-out list for the next day.
create function public.close_cart(p_cart_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.require_role('lead', 'admin');

  update public.carts c
     set is_open = false, surge = false, surge_alert = false, walkup_line = 0, sold_out_item_ids = '{}'
   where c.id = p_cart_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

create function public.generate_windows(p_service_day_id uuid) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_day   public.service_days;
  v_step  interval;
  v_count integer;
begin
  perform public.require_role('admin');

  select * into v_day from public.service_days d where d.id = p_service_day_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  select make_interval(mins => s.window_min) into v_step from public.settings s where s.id = 1;

  insert into public.pickup_windows (cart_id, service_day_id, starts_at, ends_at, capacity)
  select v_day.cart_id, v_day.id, t, t + v_step, v_day.window_capacity
    from generate_series(
           (v_day.service_date + v_day.opens_at) at time zone 'America/Chicago',
           (v_day.service_date + v_day.closes_at) at time zone 'America/Chicago' - v_step,
           v_step
         ) t
  on conflict (cart_id, starts_at) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke execute on function
  public.require_role(public.user_role[]),
  public.order_lines(jsonb),
  public.order_json(uuid),
  public.tg_orders_refresh_wait(),
  public.tg_carts_refresh_wait()
from public, anon, authenticated;

revoke execute on function
  public.hold_window_spot(uuid, text),
  public.release_hold(uuid),
  public.quote_order(jsonb, uuid),
  public.place_order(uuid, jsonb, public.payment_method, text, text, text, uuid),
  public.place_walkup_order(uuid, jsonb, public.payment_method),
  public.compute_cart_wait(uuid),
  public.snapshot_waits(),
  public.check_surge(uuid),
  public.advance_order_status(uuid, public.order_status),
  public.find_order_for_handoff(uuid, text),
  public.mark_here(uuid),
  public.mark_picked_up(uuid),
  public.move_order_late(uuid),
  public.get_order_by_token(uuid),
  public.submit_rating(uuid, uuid, integer, text[], text),
  public.set_cart_surge(uuid, boolean),
  public.set_walkup_line(uuid, integer),
  public.set_item_sold_out(uuid, uuid, boolean),
  public.open_cart(uuid),
  public.close_cart(uuid),
  public.generate_windows(uuid)
from public, anon;

grant execute on function
  public.hold_window_spot(uuid, text),
  public.release_hold(uuid),
  public.quote_order(jsonb, uuid),
  public.place_order(uuid, jsonb, public.payment_method, text, text, text, uuid),
  public.place_walkup_order(uuid, jsonb, public.payment_method),
  public.compute_cart_wait(uuid),
  public.snapshot_waits(),
  public.check_surge(uuid),
  public.advance_order_status(uuid, public.order_status),
  public.find_order_for_handoff(uuid, text),
  public.mark_here(uuid),
  public.mark_picked_up(uuid),
  public.move_order_late(uuid),
  public.get_order_by_token(uuid),
  public.submit_rating(uuid, uuid, integer, text[], text),
  public.set_cart_surge(uuid, boolean),
  public.set_walkup_line(uuid, integer),
  public.set_item_sold_out(uuid, uuid, boolean),
  public.open_cart(uuid),
  public.close_cart(uuid),
  public.generate_windows(uuid)
to authenticated;

grant execute on function
  public.hold_window_spot(uuid, text),
  public.release_hold(uuid),
  public.quote_order(jsonb, uuid),
  public.place_order(uuid, jsonb, public.payment_method, text, text, text, uuid),
  public.get_order_by_token(uuid),
  public.submit_rating(uuid, uuid, integer, text[], text),
  public.move_order_late(uuid),
  public.mark_here(uuid)
to anon;
