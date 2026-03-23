import { supabase, isSupabaseConfigured } from "./supabase";
import type { CommunityRow } from "./db";
import {
  getAllCommunities,
  getAllMeters,
  getAllMeterReadings,
} from "./db";

function formatSupabaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [o.message, o.details, o.hint, o.code && `code=${o.code}`].filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }
  return err instanceof Error ? err.message : String(err);
}

/** Merge COMMUNITY rows needed for foreign keys (e.g. meters use COMMUNITY_ID 67 but seed only had 2). */
function mergeCommunitiesForMeters(
  communities: CommunityRow[],
  meters: { COMMUNITY_ID: number }[]
): CommunityRow[] {
  const map = new Map<number, CommunityRow>();
  for (const c of communities) {
    map.set(c.COMMUNITY_ID, c);
  }
  for (const m of meters) {
    if (!map.has(m.COMMUNITY_ID)) {
      map.set(m.COMMUNITY_ID, { COMMUNITY_ID: m.COMMUNITY_ID, PRICE_RATE: 0 });
    }
  }
  return Array.from(map.values());
}

/**
 * Push all local SQLite data to Supabase for backup.
 * Only runs when Supabase is configured and requests succeed (assumes online).
 * Never reads from Supabase; app always uses SQLite.
 */
export async function syncLocalToSupabase(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, error: "Supabase not configured" };
  }

  try {
    const [communitiesRaw, meters, readings] = await Promise.all([
      getAllCommunities(),
      getAllMeters(),
      getAllMeterReadings(),
    ]);

    const communities = mergeCommunitiesForMeters(communitiesRaw, meters);

    if (communities.length > 0) {
      const { error } = await supabase
        .from("COMMUNITY")
        .upsert(communities, { onConflict: "COMMUNITY_ID" });
      if (error) throw error;
    }

    if (meters.length > 0) {
      const { error } = await supabase
        .from("METERS")
        .upsert(meters, { onConflict: "METER_ID" });
      if (error) throw error;
    }

    if (readings.length > 0) {
      const { error } = await supabase
        .from("METER_READINGS")
        .upsert(readings, { onConflict: "id" });
      if (error) throw error;
    }

    return { ok: true };
  } catch (err) {
    const message = formatSupabaseError(err);
    console.warn("[Supabase backup]", message, err);
    return { ok: false, error: message };
  }
}
