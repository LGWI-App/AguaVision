import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";

import { SessionProvider, useSession } from "../components/auth/ctx";
import { SplashScreenController } from "../components/auth/splash";
import { syncLocalToSupabase } from "@/lib/supabase-backup";

function SupabaseBackupTrigger() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        syncLocalToSupabase();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function Root() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <SupabaseBackupTrigger />
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
