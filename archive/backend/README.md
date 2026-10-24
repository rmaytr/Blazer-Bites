# Archived backend (not connected to the app)

Full Supabase backend built in Slice 0, parked while the project is a frontend-only demo.

- `supabase/migrations/*` — schema, RLS, SECURITY DEFINER RPCs (capacity holds, orders, wait, surge, sign-off, ratings), pg_cron + realtime.
- `supabase/seed.sql` — idempotent seed: 4 carts, launch menu, 2 weeks of `is_sample` orders/ratings/wait snapshots.
- `frontend/` — the Supabase client, realtime helper and generated-style DB types the app used before the swap to demo data.
- `original-spec.md`, `backend-plan.md`, `slice0-contracts.md` — the original prompt, the approved plan and the as-built contract.

Hosted project: `blazer-bites` (`xhfdbvbnizgxnztvdnmp`, us-east-1, free tier). Applied and self-checked; pg_cron jobs
`snapshot-waits` (2 min) and `sweep-expired-holds` (5 min) still run there.

To reconnect: restore `frontend/*` into `src/lib`, reimplement `src/lib/api.ts` + `src/hooks/*` against the RPCs
(the function names match), and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
