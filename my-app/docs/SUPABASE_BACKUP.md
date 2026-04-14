# Supabase backup (local SQLite → cloud)

The app is **offline-first**: all meter work uses **SQLite** on the device. Supabase is only a **cloud copy** of that data.

Use **`requestCloudBackup()`** (already wired after saves) instead of calling `syncLocalToSupabase()` directly from screens. It **debounces** uploads and, if the device is offline, **waits until NetInfo reports a usable network**, then runs one full snapshot upload. Opening the app (or returning to the foreground) also schedules a backup so data added while offline can sync later.

`syncLocalToSupabase()` remains available for tests or tooling; it does not check the network.

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

When online and configured, after a reading or meter change you should see:

`[Cloud backup] Full SQLite snapshot uploaded.`

If you were offline when saving:

`[Cloud backup] Device offline; will upload when a network is available.`

If upload fails while online, data is still on the device; check for permission denied (`42501`), missing table, or bad key in the warning line.
