-- Run this in Supabase → SQL Editor once, so table/column names match the app backup.
-- Then adjust Row Level Security (see docs/SUPABASE_BACKUP.md).

-- Tables use quoted identifiers to match the app's SQLite / JSON keys (COMMUNITY_ID, etc.)

create table if not exists public."COMMUNITY" (
  "COMMUNITY_ID" bigint primary key,
  "PRICE_RATE" double precision not null default 0
);

create table if not exists public."METERS" (
  "METER_ID" bigint primary key,
  "HOUSEHOLD_NAME" text,
  "COMMUNITY_ID" bigint not null references public."COMMUNITY" ("COMMUNITY_ID"),
  "ACTIVE" integer not null default 1,
  "LAST_READ_DATE" text,
  "LATEST_READING" double precision
);

-- Use explicit bigint id (matches SQLite) so upserts preserve local row ids.
create table if not exists public."METER_READINGS" (
  id bigint primary key,
  "METER_ID" bigint not null references public."METERS" ("METER_ID"),
  "COMMUNITY_ID" bigint not null default 2 references public."COMMUNITY" ("COMMUNITY_ID"),
  "CURRENT_READING" double precision not null,
  "WATER_USED" double precision not null default 0,
  "PRICE" double precision not null default 0,
  "DATE_LAST_READ" text,
  "DATE_CURRENT" text not null,
  "LAST_READING" double precision not null default 0,
  "PAID" integer not null default 0
);

-- If you already created "METER_READINGS" without "COMMUNITY_ID", run:
-- alter table public."METER_READINGS"
--   add column if not exists "COMMUNITY_ID" bigint not null default 2 references public."COMMUNITY" ("COMMUNITY_ID");

-- If "METER_READINGS" exists without "PAID", run:
-- alter table public."METER_READINGS"
--   add column if not exists "PAID" integer not null default 0;

