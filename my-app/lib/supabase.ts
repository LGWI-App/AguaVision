import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string };

function getExtra(): Extra {
  const extra = Constants.expoConfig?.extra;
  return extra && typeof extra === "object" ? (extra as Extra) : {};
}

/** Prefer Metro-inlined env; fall back to app.config.ts `extra` (see app.config.ts). */
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? getExtra().supabaseUrl;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? getExtra().supabaseAnonKey;

/** Supabase client for backup only. Null if env vars are not set. */
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabase);
}
