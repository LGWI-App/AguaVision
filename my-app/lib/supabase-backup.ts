import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { CommunityRow } from "./db";
import { getAllCommunities, getAllMeters, getAllMeterReadings } from "./db";

const BACKUP_DEBOUNCE_MS = 1200;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectUnsub: (() => void) | null = null;

/** Treat as online: connected and not explicitly unreachable (null = unknown → still try). */
function networkLikelyReachable(state: NetInfoState): boolean {
  if (!state.isConnected) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

function clearReconnectListener(): void {
  reconnectUnsub?.();
  reconnectUnsub = null;
}

/**
 * When offline, listen once for a reachable network then push a full backup.
 * Local SQLite is already saved; this only affects cloud copy.
 */
function ensureReconnectBackupListener(): void {
  if (reconnectUnsub) return;
  reconnectUnsub = NetInfo.addEventListener((s) => {
    if (!networkLikelyReachable(s)) return;
    clearReconnectListener();
    void pushLocalToCloudQuietly();
  });
}

async function pushLocalToCloudQuietly(): Promise<void> {
  const result = await syncLocalToSupabase();
  if (result.ok) {
    console.log("[Cloud backup] Full SQLite snapshot uploaded.");
  } else if (result.error === "Supabase not configured") {
    // expected when .env not set
  } else {
    console.warn(
      "[Cloud backup] Upload failed (data is still on device):",
      result.error,
    );
  }
}

function formatSupabaseError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [
      o.message,
      o.details,
      o.hint,
      o.code && `code=${o.code}`,
    ].filter(Boolean);
    if (parts.length) return parts.join(" | ");
  }
  return err instanceof Error ? err.message : String(err);
}

/** Merge COMMUNITY rows needed for foreign keys (e.g. meters use COMMUNITY_ID 67 but seed only had 2). */
function mergeCommunitiesForMeters(
  communities: CommunityRow[],
  meters: { COMMUNITY_ID: number }[],
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
 * Push all local SQLite data to Supabase (backup only).
 * Does not read from Supabase. Call `requestCloudBackup()` from UI so offline
 * work queues until the device has a network route.
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

/**
 * Non-blocking: debounced full upload after local DB changes.
 * Offline → waits for connectivity (listener), then uploads once.
 * Never throws; never blocks reads/writes to SQLite.
 */
export function requestCloudBackup(): void {
  if (!isSupabaseConfigured()) return;

  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void (async () => {
      const state = await NetInfo.fetch();
      if (!networkLikelyReachable(state)) {
        console.log(
          "[Cloud backup] Device offline; will upload when a network is available.",
        );
        ensureReconnectBackupListener();
        return;
      }
      await pushLocalToCloudQuietly();
    })();
  }, BACKUP_DEBOUNCE_MS);
}
