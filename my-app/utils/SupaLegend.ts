import { observable } from "@legendapp/state";
import { observablePersistAsyncStorage } from "@legendapp/state/persist-plugins/async-storage";
import { configureSynced } from "@legendapp/state/sync";
import { syncedSupabase } from "@legendapp/state/sync-plugins/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-get-random-values";
import { Database } from "./database.types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create a configured sync function
const customSynced = configureSynced(syncedSupabase, {
  // Use React Native Async Storage
  persist: {
    plugin: observablePersistAsyncStorage({
      AsyncStorage,
    }),
  },
  supabase,
  changesSince: "last-sync",
  fieldCreatedAt: "created_at",
  fieldUpdatedAt: "updated_at",
  // Optionally enable soft deletes
  fieldDeleted: "deleted",
});

export const METER_READINGS$ = observable(
  customSynced({
    supabase,
    collection: "METER_READINGS",
    actions: ["read", "create", "update", "delete"],
    realtime: true,
    // Persist data and pending changes locally
    persist: {
      name: "METER_READINGS",
      retrySync: true, // Persist pending changes and retry
    },
    retry: {
      infinite: true, // Retry changes with exponential backoff
    },
  }),
);

// Observable for METERS table (synced + persisted + realtime)
export const METERS$ = observable(
  customSynced({
    supabase,
    collection: "METERS",
    actions: ["read", "create", "update", "delete"],
    realtime: true,
    persist: {
      name: "METERS",
      retrySync: true,
    },
    retry: {
      infinite: true,
    },
  }),
);
