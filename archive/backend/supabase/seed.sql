-- Blazer Bites seed. Idempotent: reference rows are upserted by fixed UUIDs; every is_sample row is
-- deleted and regenerated deterministically (setseed). Live (non-sample) orders are kept and respected.
--
-- Fixed ids:
--   spots  5b000000-0000-4000-8000-00000000000N  (1 Sterne, 2 Campus Green, 3 Biz & Eng, 4 Medical, 5 late night)
--   carts  ca000000-0000-4000-8000-00000000000N  (one per daytime spot; cart 2 also runs the late-night slot)
--   menu   e0000000-0000-4000-8000-00000000000N  (1 hot chicken, 2 rice bowl, 3 tacos, 4 $5 item,
--                                                 5 shrimp & grits, 6 next special, 7 sample veggie wrap)

begin;

select setseed(0.2026);

-- ---------------------------------------------------------------------------
-- Settings, spots, carts, menu
-- ---------------------------------------------------------------------------

insert into public.settings (
  id, window_min, orders_per_window, walkup_cutoff, max_wait_min, surge_trigger_min, surge_windows,
  express_size, cut_threshold, cut_days, fixed_menu_threshold, loyalty_every, hold_min,
  avg_walkup_service_sec, default_handoff_sec, demo_mode
)
values (1, 10, 25, 15, 10, 6, 2, 2, 4.0, 14, 4.3, 10, 5, 45, 30, true)
on conflict (id) do update set
  window_min = excluded.window_min,
  orders_per_window = excluded.orders_per_window,
  walkup_cutoff = excluded.walkup_cutoff,
  max_wait_min = excluded.max_wait_min,
  surge_trigger_min = excluded.surge_trigger_min,
  surge_windows = excluded.surge_windows,
  express_size = excluded.express_size,
  cut_threshold = excluded.cut_threshold,
  cut_days = excluded.cut_days,
  fixed_menu_threshold = excluded.fixed_menu_threshold,
  loyalty_every = excluded.loyalty_every,
  hold_min = excluded.hold_min,
  avg_walkup_service_sec = excluded.avg_walkup_service_sec,
  default_handoff_sec = excluded.default_handoff_sec,
  demo_mode = excluded.demo_mode;

insert into public.spots (id, name, lat, lng, notes, is_placeholder, is_late_night)
values
  ('5b000000-0000-4000-8000-000000000001', 'Sterne Library edge', 33.50215, -86.80985,
   'Placeholder: sidewalk just off campus property. Outlet on the coffee shop wall.', true, false),
  ('5b000000-0000-4000-8000-000000000002', 'Campus Green edge (by the residence halls)', 33.50440, -86.80520,
   'Placeholder: corner lot facing the residence halls. Generator needed.', true, false),
  ('5b000000-0000-4000-8000-000000000003', 'Business & Engineering edge', 33.49975, -86.80410,
   'Placeholder: plaza edge across the street. Power available.', true, false),
  ('5b000000-0000-4000-8000-000000000004', 'Medical corridor (near the hospital)', 33.50605, -86.80300,
   'Placeholder: wide sidewalk near the hospital. Shift-change rush around 11:00 and 13:00.', true, false),
  ('5b000000-0000-4000-8000-000000000005', 'Late night: residence halls', 33.50490, -86.80600,
   'Placeholder: lit lot by the residence halls, 8 p.m. to midnight. Behind LATE_NIGHT_ENABLED.', true, true)
on conflict (id) do update set
  name = excluded.name, lat = excluded.lat, lng = excluded.lng, notes = excluded.notes,
  is_placeholder = excluded.is_placeholder, is_late_night = excluded.is_late_night;

insert into public.carts (id, name, spot_id)
values
  ('ca000000-0000-4000-8000-000000000001', 'Sterne cart', '5b000000-0000-4000-8000-000000000001'),
  ('ca000000-0000-4000-8000-000000000002', 'Campus Green cart', '5b000000-0000-4000-8000-000000000002'),
  ('ca000000-0000-4000-8000-000000000003', 'Biz & Eng cart', '5b000000-0000-4000-8000-000000000003'),
  ('ca000000-0000-4000-8000-000000000004', 'Medical cart', '5b000000-0000-4000-8000-000000000004')
on conflict (id) do update set
  name = excluded.name, spot_id = excluded.spot_id, is_open = false, surge = false, surge_alert = false,
  walkup_line = 0, sold_out_item_ids = '{}';

insert into public.menu_items (
  id, name, description, price_cents, plate_cost_cents, photo_url, allergens, calories, variants,
  is_five_dollar_item, is_special, is_next_special, is_express, nutrition_verified, status, is_sample
)
values
  ('e0000000-0000-4000-8000-000000000001', 'Hot chicken sandwich',
   'Crispy Nashville-style hot chicken with slaw and pickles on a toasted bun.',
   700, 220, '/food/hot-chicken.svg', '{gluten,egg,dairy}', 720, '{}',
   false, false, false, true, true, 'active', false),
  ('e0000000-0000-4000-8000-000000000002', 'Rice bowl',
   'Herbed rice, pickled onions, cucumber and tahini sauce. Chicken shawarma or crispy tofu.',
   750, 230, '/food/rice-bowl.svg', '{sesame,soy}', 640, '{"Chicken shawarma","Tofu"}',
   false, false, false, false, true, 'active', false),
  ('e0000000-0000-4000-8000-000000000003', 'Three street tacos',
   'Corn tortillas, chile-lime chicken, onion, cilantro and cotija.',
   650, 200, '/food/tacos.svg', '{dairy}', 560, '{}',
   false, false, false, true, true, 'active', false),
  ('e0000000-0000-4000-8000-000000000004', '$5 value item',
   'Buttermilk biscuit sandwich with egg and cheese, or a cup of the soup of the day.',
   500, 150, '/food/biscuit.svg', '{gluten,dairy,egg}', 450, '{"Biscuit sandwich","Soup cup"}',
   true, false, false, false, false, 'active', false),
  ('e0000000-0000-4000-8000-000000000005', 'Shrimp and grits',
   'Weekly chef''s special: Gulf shrimp over stone-ground cheddar grits with a smoky pan sauce.',
   800, 260, '/food/shrimp-grits.svg', '{shellfish,dairy}', 680, '{}',
   false, true, false, false, false, 'active', false),
  ('e0000000-0000-4000-8000-000000000006', 'Nashville hot cauliflower',
   'Coming next week: crispy hot cauliflower with ranch slaw.',
   700, 190, '/food/cauliflower.svg', '{gluten,dairy}', 520, '{}',
   false, false, true, false, false, 'active', false),
  ('e0000000-0000-4000-8000-000000000007', 'Sample: Veggie wrap',
   'Retired special (sample data): grilled vegetables and hummus in a flour wrap.',
   650, 180, '/food/veggie-wrap.svg', '{gluten,sesame}', 480, '{}',
   false, true, false, false, false, 'archived', true)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, price_cents = excluded.price_cents,
  plate_cost_cents = excluded.plate_cost_cents, photo_url = excluded.photo_url, allergens = excluded.allergens,
  calories = excluded.calories, variants = excluded.variants, is_five_dollar_item = excluded.is_five_dollar_item,
  is_special = excluded.is_special, is_next_special = excluded.is_next_special, is_express = excluded.is_express,
  nutrition_verified = excluded.nutrition_verified, status = excluded.status, is_sample = excluded.is_sample;

-- ---------------------------------------------------------------------------
-- Service days (past 14 + next 7 days, weekdays) and their windows
-- ---------------------------------------------------------------------------

delete from public.orders where is_sample;
delete from public.wait_snapshots where is_sample;

-- Sterne gets smaller windows (narrow sidewalk, one handoff lane), so its noon rush hits the cap.
with days as (
  select public.local_today() + g as service_date
    from generate_series(-14, 7) g
   where extract(isodow from public.local_today() + g) between 1 and 5
), lunch (cart_id, spot_id, window_capacity) as (
  values
    ('ca000000-0000-4000-8000-000000000001'::uuid, '5b000000-0000-4000-8000-000000000001'::uuid, 8),
    ('ca000000-0000-4000-8000-000000000002'::uuid, '5b000000-0000-4000-8000-000000000002'::uuid, 25),
    ('ca000000-0000-4000-8000-000000000003'::uuid, '5b000000-0000-4000-8000-000000000003'::uuid, 25),
    ('ca000000-0000-4000-8000-000000000004'::uuid, '5b000000-0000-4000-8000-000000000004'::uuid, 25)
)
insert into public.service_days (cart_id, spot_id, service_date, opens_at, closes_at, is_late_night, window_capacity)
select l.cart_id, l.spot_id, d.service_date, time '10:30', time '14:30', false, l.window_capacity
  from days d cross join lunch l
union all
select 'ca000000-0000-4000-8000-000000000002', '5b000000-0000-4000-8000-000000000005', d.service_date,
       time '20:00', time '24:00', true, 25
  from days d
on conflict (cart_id, service_date, opens_at) do update set
  spot_id = excluded.spot_id, closes_at = excluded.closes_at, is_late_night = excluded.is_late_night,
  window_capacity = excluded.window_capacity;

-- Existing windows follow their day's capacity and drop the deleted sample bookings
-- (capacity never goes below what live orders already booked).
update public.pickup_windows w
   set booked_count = b.booked,
       capacity = greatest(d.window_capacity, b.booked)
  from public.service_days d,
       (select pw.id, count(o.id)::integer as booked
          from public.pickup_windows pw
          left join public.orders o on o.window_id = pw.id and o.status <> 'cancelled'
         group by pw.id) b
 where d.id = w.service_day_id
   and b.id = w.id
   and (w.capacity, w.booked_count) is distinct from (greatest(d.window_capacity, b.booked), b.booked);

select sum(public.generate_windows(d.id)) as windows_created
  from public.service_days d
 where d.service_date between public.local_today() - 14 and public.local_today() + 7;

-- ---------------------------------------------------------------------------
-- Sample demand per window (past lunch days + one full upcoming window)
-- ---------------------------------------------------------------------------

create temp table seed_days on commit drop as
select d.id as service_day_id,
       d.cart_id,
       d.service_date,
       (0.85 + 0.30 * random()) * case when extract(isodow from d.service_date) = 5 then 0.85 else 1 end as factor,
       random() < 0.35 and d.cart_id in ('ca000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000002')
         as rush
  from (
    select * from public.service_days
     where not is_late_night and service_date between public.local_today() - 14 and public.local_today() - 1
     order by service_date, cart_id
  ) d;

create temp table seed_window_demand on commit drop as
with profile (cart_id, daily_orders, app_share) as (
  values
    ('ca000000-0000-4000-8000-000000000001'::uuid, 100, 0.68),
    ('ca000000-0000-4000-8000-000000000002'::uuid, 85, 0.62),
    ('ca000000-0000-4000-8000-000000000003'::uuid, 60, 0.58),
    ('ca000000-0000-4000-8000-000000000004'::uuid, 42, 0.55)
), windows as (
  select w.id as window_id, w.cart_id, w.service_day_id, sd.service_date, w.starts_at,
         w.capacity - (select count(*) from public.orders o where o.window_id = w.id and o.status <> 'cancelled')::integer
           as free,
         -- lunch curve peaking around 12:05 plus a flat baseline
         exp(-power((extract(epoch from w.starts_at - min(w.starts_at) over (partition by w.service_day_id)) / 60
                     + 5 - 95) / 30.0, 2) / 2) + 0.08 as weight,
         sd.factor, p.daily_orders, p.app_share
    from public.pickup_windows w
    join seed_days sd on sd.service_day_id = w.service_day_id
    join profile p on p.cart_id = w.cart_id
   order by w.service_day_id, w.starts_at
), demand as (
  select w.*,
         round(w.daily_orders * w.factor * w.weight / sum(w.weight) over (partition by w.service_day_id)
               * (0.75 + 0.5 * random()))::integer as demand
    from windows w
)
select d.window_id, d.cart_id, d.service_day_id, d.service_date, d.starts_at, false as is_upcoming,
       least(d.free, round(d.demand * d.app_share)::integer) as app_n,
       d.demand - round(d.demand * d.app_share)::integer as walk_n
  from demand d
union all
-- The 12:00 window of the next lunch service that has not ended (today, or the next weekday) at the
-- Biz & Eng cart is booked solid so "a full window can't be booked" is demonstrable.
select w.id, w.cart_id, w.service_day_id, d.service_date, w.starts_at, true,
       w.capacity - (select count(*) from public.orders o where o.window_id = w.id and o.status <> 'cancelled')::integer,
       0
  from public.pickup_windows w
  join public.service_days d on d.id = w.service_day_id
 where w.cart_id = 'ca000000-0000-4000-8000-000000000003'
   and not d.is_late_night
   and d.service_date = (
         select min(d2.service_date) from public.service_days d2
          where d2.cart_id = w.cart_id and not d2.is_late_night
            and (d2.service_date + d2.closes_at) at time zone 'America/Chicago' > now()
       )
   and w.starts_at = (d.service_date + time '12:00') at time zone 'America/Chicago';

-- ---------------------------------------------------------------------------
-- Sample orders
-- ---------------------------------------------------------------------------

create temp table seed_orders on commit drop as
with base as (
  select gen_random_uuid() as id, d.cart_id, d.service_day_id, d.service_date, d.window_id, d.starts_at,
         d.is_upcoming, x.channel,
         random() as r1, random() as r2, random() as r3, random() as r4, random() as r5, random() as r6
    from seed_window_demand d
   cross join lateral (
     select 'app'::public.order_channel as channel from generate_series(1, d.app_n)
     union all
     select 'walk_up'::public.order_channel from generate_series(1, d.walk_n)
   ) x
   order by d.service_day_id, d.starts_at, x.channel
), timed as (
  select b.*,
         -- skewed index so regulars reuse the same phone (~40% of guests are repeat customers)
         floor(power(b.r5, 1.6) * 1600)::integer as guest_idx,
         case
           when b.is_upcoming then least(now(), b.starts_at) - interval '20 minutes' - b.r1 * interval '150 minutes'
           when b.channel = 'app' then b.starts_at - interval '5 minutes' - b.r1 * interval '175 minutes'
           else b.starts_at + b.r1 * interval '10 minutes'
         end as placed_at,
         case
           when b.is_upcoming then null
           when b.channel = 'app' then b.starts_at + (b.r2 * 10 - 1) * interval '1 minute'
           else b.starts_at + b.r1 * interval '10 minutes'
         end as arrived_at,
         -- arrival-to-food seconds: pre-orders mostly 1-4 min, walk-ups 3-8 min, a few over 10
         case
           when b.channel = 'app' then 50 + 190 * power(b.r3, 1.3) + case when b.r3 > 0.993 then 420 else 0 end
           else 170 + 290 * b.r3 + case when b.r3 > 0.985 then 330 else 0 end
         end as service_sec
    from base b
)
select t.*,
       case when t.channel = 'app' and not t.is_upcoming then t.starts_at - t.r4 * interval '4 minutes' end
         as app_ready_at
  from timed t;

create temp table seed_items on commit drop as
select gen_random_uuid() as id, o.id as order_id, pick.menu_item_id,
       case
         when pick.menu_item_id = 'e0000000-0000-4000-8000-000000000002'
           then case when pick.v < 0.7 then 'Chicken shawarma' else 'Tofu' end
         when pick.menu_item_id = 'e0000000-0000-4000-8000-000000000004'
           then case when pick.v < 0.6 then 'Biscuit sandwich' else 'Soup cup' end
       end as variant,
       case when pick.q < 0.08 then 2 else 1 end as qty,
       m.price_cents as unit_price_cents
  from seed_orders o
 cross join lateral generate_series(1, case when o.r6 < 0.80 then 1 when o.r6 < 0.96 then 2 else 3 end) n
 cross join lateral (
   select case
            when r.u < 0.30 then 'e0000000-0000-4000-8000-000000000001'::uuid
            when r.u < 0.55 then 'e0000000-0000-4000-8000-000000000002'::uuid
            when r.u < 0.75 then 'e0000000-0000-4000-8000-000000000003'::uuid
            when r.u < 0.90 then 'e0000000-0000-4000-8000-000000000004'::uuid
            -- the weekly special slot: the retired veggie wrap ran the first week, shrimp and grits since
            when o.service_date < public.local_today() - 7 then 'e0000000-0000-4000-8000-000000000007'::uuid
            else 'e0000000-0000-4000-8000-000000000005'::uuid
          end as menu_item_id,
          r.v, r.q
     from (select random() as u, random() as v, random() as q, n) r
 ) pick
  join public.menu_items m on m.id = pick.menu_item_id;

insert into public.orders (
  id, guest_name, guest_phone, cart_id, service_day_id, window_id, original_window_id, status,
  pickup_number, channel, payment_method, subtotal_cents, discount_cents, total_cents,
  placed_at, ready_at, arrived_at, picked_up_at, is_sample
)
select o.id,
       case when o.channel = 'app' then
         (array['Aaliyah','Ben','Camila','Darius','Emma','Fatima','Gabe','Hannah','Isaiah','Jada',
                'Kevin','Lily','Marcus','Nia','Owen','Priya','Quinn','Raven','Sam','Tasha',
                'Uriel','Vivian','Will','Xavier','Yasmin','Zoe','Andre','Brianna','Chris','Destiny',
                'Eli','Grace','Jamal','Kayla','Luis','Maya','Noah','Olivia','Tyler','Jordan'])[1 + o.guest_idx % 40]
         || ' ' || chr(65 + (o.guest_idx * 7) % 26) || '.'
       end,
       case when o.channel = 'app' then '205555' || lpad(o.guest_idx::text, 4, '0') end,
       o.cart_id,
       o.service_day_id,
       case when o.channel = 'app' then o.window_id end,
       case when o.channel = 'app' then o.window_id end,
       case when o.is_upcoming then 'received' else 'picked_up' end::public.order_status,
       coalesce(prior.max_number, 100) + row_number() over (partition by o.service_day_id order by o.placed_at, o.id),
       o.channel,
       case
         when o.channel = 'walk_up' then case when o.r6 < 0.7 then 'walkup_card' else 'cash' end
         when o.r4 < 0.55 then 'card'
         when o.r4 < 0.85 then 'apple_pay'
         else 'google_pay'
       end::public.payment_method,
       t.subtotal, 0, t.subtotal,
       o.placed_at,
       case when o.channel = 'app' then o.app_ready_at
            else o.arrived_at + (o.service_sec - 20) * interval '1 second' end,
       o.arrived_at,
       case when o.channel = 'app' then greatest(o.arrived_at + o.service_sec * interval '1 second',
                                                 o.app_ready_at + interval '15 seconds')
            else o.arrived_at + o.service_sec * interval '1 second' end,
       true
  from seed_orders o
  join (select i.order_id, sum(i.qty * i.unit_price_cents)::integer as subtotal
          from seed_items i group by i.order_id) t on t.order_id = o.id
  left join (select x.service_day_id, max(x.pickup_number) as max_number
               from public.orders x group by x.service_day_id) prior on prior.service_day_id = o.service_day_id;

insert into public.order_items (id, order_id, menu_item_id, variant, qty, unit_price_cents)
select i.id, i.order_id, i.menu_item_id, i.variant, i.qty, i.unit_price_cents from seed_items i;

-- ---------------------------------------------------------------------------
-- Sample ratings (~60% of picked-up dishes). Star mix per dish sets the average:
-- hot chicken ~4.6, rice bowl ~4.5, shrimp & grits ~4.5, tacos ~4.4, $5 item ~4.3, veggie wrap ~3.7.
-- ---------------------------------------------------------------------------

with mix (menu_item_id, p5, p4, p3, p2) as (
  values
    ('e0000000-0000-4000-8000-000000000001'::uuid, 0.68, 0.25, 0.05, 0.015),
    ('e0000000-0000-4000-8000-000000000002'::uuid, 0.60, 0.30, 0.07, 0.020),
    ('e0000000-0000-4000-8000-000000000003'::uuid, 0.55, 0.32, 0.09, 0.030),
    ('e0000000-0000-4000-8000-000000000004'::uuid, 0.56, 0.32, 0.08, 0.030),
    ('e0000000-0000-4000-8000-000000000005'::uuid, 0.60, 0.30, 0.07, 0.020),
    ('e0000000-0000-4000-8000-000000000007'::uuid, 0.24, 0.39, 0.25, 0.080)
), rated as (
  select i.id as order_item_id, o.picked_up_at, r.t1, r.t2, r.c, r.delay,
         case
           when r.u < m.p5 then 5
           when r.u < m.p5 + m.p4 then 4
           when r.u < m.p5 + m.p4 + m.p3 then 3
           when r.u < m.p5 + m.p4 + m.p3 + m.p2 then 2
           else 1
         end as stars
    from seed_items i
    join public.orders o on o.id = i.order_id
    join mix m on m.menu_item_id = i.menu_item_id
   cross join lateral (
     select random() as pick, random() as u, random() as t1, random() as t2, random() as c, random() as delay, i.id
   ) r
   where o.status = 'picked_up'
     and r.pick < case when o.channel = 'app' then 0.70 else 0.40 end
)
insert into public.ratings (order_item_id, stars, tags, comment, created_at, is_sample)
select r.order_item_id,
       r.stars,
       array_remove(array[
         case when r.stars = 5 and r.t1 < 0.40 then 'perfect' end,
         case when r.stars >= 4 and r.t2 < 0.45 then 'order_again' end,
         case when r.stars <= 3 and r.t1 < 0.30 then 'too_salty' end,
         case when r.stars <= 3 and r.t2 < 0.30 then 'cold' end,
         case when r.stars <= 3 and r.c < 0.30 then 'small_portion' end
       ], null),
       case when r.c > 0.94 then
         (array['Arrived cold.', 'Not my favorite, portion felt small.', 'Okay, needed more flavor.',
                'Solid lunch, would get again.', 'So good, worth the walk.'])[r.stars]
       end,
       r.picked_up_at + (2 + r.delay * 90) * interval '1 minute',
       true
  from rated r;

-- ---------------------------------------------------------------------------
-- Sample wait snapshots every 2 minutes of past lunch service, derived from the sample orders.
-- Rush days add a noon spike (some above 6 min for two windows, a handful above 10).
-- ---------------------------------------------------------------------------

create index on seed_orders (service_day_id);
analyze seed_orders;

insert into public.wait_snapshots (cart_id, window_id, taken_at, wait_min, orders_ahead, walkup_line, is_sample)
select sd.cart_id,
       w.id,
       t.ts,
       round((0.5 * q.app_waiting + 0.75 * q.line + 0.6 * random()
              + case when sd.rush and t.ts >= noon.ts - interval '10 minutes' and t.ts < noon.ts + interval '20 minutes'
                     then 4.0 + 4.5 * random() else 0 end)::numeric, 1),
       q.ahead,
       q.line,
       true
  from seed_days sd
 cross join lateral (select (sd.service_date + time '12:00') at time zone 'America/Chicago' as ts) noon
 cross join lateral generate_series(
         (sd.service_date + time '10:30') at time zone 'America/Chicago',
         (sd.service_date + time '14:28') at time zone 'America/Chicago',
         interval '2 minutes') t(ts)
  left join public.pickup_windows w
    on w.service_day_id = sd.service_day_id and t.ts >= w.starts_at and t.ts < w.ends_at
 cross join lateral (
   select count(*) filter (where o.channel = 'app' and o.arrived_at <= t.ts
                             and o.arrived_at + o.service_sec * interval '1 second' > t.ts)::integer as app_waiting,
          count(*) filter (where o.channel = 'walk_up' and o.arrived_at <= t.ts
                             and o.arrived_at + o.service_sec * interval '1 second' > t.ts)::integer as line,
          count(*) filter (where o.channel = 'app' and o.starts_at <= t.ts
                             and o.arrived_at + o.service_sec * interval '1 second' > t.ts)::integer as ahead
     from seed_orders o
    where o.service_day_id = sd.service_day_id
 ) q;

-- ---------------------------------------------------------------------------
-- Derived counters, today's sign-offs, live state
-- ---------------------------------------------------------------------------

update public.pickup_windows w
   set booked_count = c.booked
  from (
    select pw.id, count(o.id)::integer as booked
      from public.pickup_windows pw
      left join public.orders o on o.window_id = pw.id and o.status <> 'cancelled'
     group by pw.id
  ) c
 where c.id = w.id and w.booked_count <> c.booked;

update public.service_days d
   set next_pickup_number = coalesce((select max(o.pickup_number) + 1 from public.orders o
                                       where o.service_day_id = d.id), 101);

-- Three carts are signed off and open today; the Medical cart is left closed to demo the sign-off gate.
delete from public.prep_checks
 where service_date = public.local_today() and checked_by is null and notes = 'Seeded sign-off';

insert into public.prep_checks (cart_id, service_date, kind, menu_item_id, passed, temp_f, notes)
select c.id, public.local_today(), 'taste', m.id, true, null, 'Seeded sign-off'
  from public.carts c
 cross join public.menu_items m
 where c.id <> 'ca000000-0000-4000-8000-000000000004' and m.status = 'active' and not m.is_next_special
union all
select c.id, public.local_today(), k.kind, null, true, k.temp_f, 'Seeded sign-off'
  from public.carts c
 cross join (values ('hot_hold'::public.prep_kind, 165.0), ('cold_hold', 38.0), ('food_safety', null)) k (kind, temp_f)
 where c.id <> 'ca000000-0000-4000-8000-000000000004';

select public.open_cart(c.id) from public.carts c where c.id <> 'ca000000-0000-4000-8000-000000000004';
select public.compute_cart_wait(c.id) from public.carts c;

commit;
