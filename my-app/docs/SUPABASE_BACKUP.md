# Supabase backup (local SQLite → cloud)

The app **only reads/writes SQLite** on device. `syncLocalToSupabase()` **pushes** rows to Supabase as a backup when configured.

## 1. Environment variables (`my-app/.env`)

Use **no spaces** around `=` (otherwise variables may not load):

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

- Copy **Project URL** and the **anon public** key from Supabase → **Project Settings → API**.
- The anon key is usually a long **JWT** starting with `eyJ...`. If backup still fails with auth errors, double-check you are not using a **service_role** secret in the client.

Restart the dev server after changing `.env` (`Ctrl+C`, then `npm start`).

## 2. Database schema

Run `my-app/supabase-schema.sql` in the Supabase **SQL Editor** so table names match the app: `"COMMUNITY"`, `"METERS"`, `"METER_READINGS"`.

## 3. Row Level Security (RLS) — most common “empty table” cause

By default Supabase **blocks** anonymous `insert`/`update`. Either:

**Option A — dev only:** disable RLS on those tables in the Table Editor, **or**

**Option B — policies for `anon`:** example for `"COMMUNITY"` (repeat pattern for `"METERS"` and `"METER_READINGS"`):

```sql
alter table public."COMMUNITY" enable row level security;

create policy "anon_backup_insert_community"
  on public."COMMUNITY" for insert
  to anon
  with check (true);

create policy "anon_backup_update_community"
  on public."COMMUNITY" for update
  to anon
  using (true)
  with check (true);
```

Tighten these for production (e.g. only your org’s rows).

## 4. Verify in logs

After adding a meter, look for:

`[Supabase backup] syncLocalToSupabase result: { ok: true }`

If `ok: false`, the `error` string usually mentions permission denied (`42501`), missing table, or bad key.
