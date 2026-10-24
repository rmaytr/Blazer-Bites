-- Blazer Bites: row level security. Clients read through these policies; all business writes go through
-- SECURITY DEFINER RPCs (functions migration). Only admins write reference tables directly.

create function public.app_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select u.role from public.users u where u.id = auth.uid()
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.app_role() in ('crew', 'lead', 'admin'), false)
$$;

revoke execute on function public.app_role(), public.is_staff() from public;
grant execute on function public.app_role(), public.is_staff() to anon, authenticated;

alter table public.users              enable row level security;
alter table public.spots              enable row level security;
alter table public.carts              enable row level security;
alter table public.service_days       enable row level security;
alter table public.pickup_windows     enable row level security;
alter table public.window_holds       enable row level security;
alter table public.menu_items         enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.ratings            enable row level security;
alter table public.loyalty_cards      enable row level security;
alter table public.wait_snapshots     enable row level security;
alter table public.prep_checks        enable row level security;
alter table public.settings           enable row level security;
alter table public.push_subscriptions enable row level security;

-- Table privileges: anon never touches private tables (permission denied, not just zero rows);
-- window_holds and push_subscriptions are RPC-only for everyone.
revoke all on
  public.users, public.orders, public.order_items, public.ratings, public.loyalty_cards,
  public.wait_snapshots, public.prep_checks, public.window_holds, public.push_subscriptions
from anon;
revoke insert, update, delete on
  public.spots, public.carts, public.service_days, public.pickup_windows, public.menu_items, public.settings
from anon;
revoke all on public.window_holds, public.push_subscriptions from authenticated;
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public reference data: readable by everyone, written by admins
-- ---------------------------------------------------------------------------

create policy spots_read on public.spots for select to anon, authenticated using (true);
create policy spots_admin_insert on public.spots for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy spots_admin_update on public.spots for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');
create policy spots_admin_delete on public.spots for delete to authenticated
  using ((select public.app_role()) = 'admin');

create policy carts_read on public.carts for select to anon, authenticated using (true);
create policy carts_admin_insert on public.carts for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy carts_admin_update on public.carts for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');
create policy carts_admin_delete on public.carts for delete to authenticated
  using ((select public.app_role()) = 'admin');

create policy service_days_read on public.service_days for select to anon, authenticated using (true);
create policy service_days_admin_insert on public.service_days for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy service_days_admin_update on public.service_days for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');
create policy service_days_admin_delete on public.service_days for delete to authenticated
  using ((select public.app_role()) = 'admin');

create policy pickup_windows_read on public.pickup_windows for select to anon, authenticated using (true);
create policy pickup_windows_admin_insert on public.pickup_windows for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy pickup_windows_admin_update on public.pickup_windows for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');
create policy pickup_windows_admin_delete on public.pickup_windows for delete to authenticated
  using ((select public.app_role()) = 'admin');

-- Archived dishes stay visible to staff for the taste board and order history.
create policy menu_items_read on public.menu_items for select to anon, authenticated
  using (status <> 'archived' or (select public.is_staff()));
create policy menu_items_admin_insert on public.menu_items for insert to authenticated
  with check ((select public.app_role()) = 'admin');
create policy menu_items_admin_update on public.menu_items for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');
create policy menu_items_admin_delete on public.menu_items for delete to authenticated
  using ((select public.app_role()) = 'admin');

create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.settings for update to authenticated
  using ((select public.app_role()) = 'admin') with check ((select public.app_role()) = 'admin');

-- ---------------------------------------------------------------------------
-- Personal data: own rows for students, everything for staff
-- ---------------------------------------------------------------------------

-- Role/email changes by non-admins are blocked by the users_lock_role trigger.
create policy users_read on public.users for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy users_update on public.users for update to authenticated
  using (id = (select auth.uid()) or (select public.app_role()) = 'admin')
  with check (id = (select auth.uid()) or (select public.app_role()) = 'admin');

create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy order_items_read on public.order_items for select to authenticated
  using (
    (select public.is_staff())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

create policy ratings_read on public.ratings for select to authenticated
  using (
    (select public.is_staff())
    or exists (
      select 1
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
       where oi.id = order_item_id and o.user_id = (select auth.uid())
    )
  );

create policy loyalty_cards_read on public.loyalty_cards for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

create policy wait_snapshots_read on public.wait_snapshots for select to authenticated
  using ((select public.is_staff()));

create policy prep_checks_read on public.prep_checks for select to authenticated
  using ((select public.is_staff()));
create policy prep_checks_lead_insert on public.prep_checks for insert to authenticated
  with check ((select public.app_role()) in ('lead', 'admin') and checked_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: menu photos are served through the public URL; only admins manage objects.
-- No anon select policy, so the bucket cannot be listed.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy menu_photos_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'menu-photos' and (select public.app_role()) = 'admin')
  with check (bucket_id = 'menu-photos' and (select public.app_role()) = 'admin');
