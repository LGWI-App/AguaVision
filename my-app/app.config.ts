import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Merges app.json with extra values so Supabase URL/key are available via
 * expo-constants even if EXPO_PUBLIC_* inline env has issues.
 * Expo loads `.env` before evaluating this file when you run `npx expo start`.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
