import { supabase, isSupabaseConfigured } from "./supabase";
import { getAllCommunities, getAllMeters, getAllMeterReadings } from "./db";

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
    const [communities, meters, readings] = await Promise.all([
      getAllCommunities(),
      getAllMeters(),
      getAllMeterReadings(),
    ]);

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
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[Supabase backup]", message);
    return { ok: false, error: message };
  }
}
