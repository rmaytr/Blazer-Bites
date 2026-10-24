-- Blazer Bites: scheduled jobs and realtime.

create extension if not exists pg_cron with schema pg_catalog;

-- cron.schedule upserts by job name, so re-running this file is safe.
select cron.schedule('snapshot-waits', '*/2 * * * *', $$select public.snapshot_waits()$$);
select cron.schedule('sweep-expired-holds', '*/5 * * * *', $$delete from public.window_holds where expires_at <= now()$$);

alter publication supabase_realtime
  add table public.carts, public.pickup_windows, public.orders, public.order_items, public.menu_items;

-- Full old-row images so UPDATE/DELETE events carry every column (status diffs, cart filters).
alter table public.carts replica identity full;
alter table public.orders replica identity full;
