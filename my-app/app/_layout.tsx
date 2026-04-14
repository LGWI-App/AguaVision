import { Stack } from "expo-router";

import { SessionProvider, useSession } from "../components/auth/ctx";
import { SplashScreenController } from "../components/auth/splash";

export default function Root() {
  // Set up the auth context and render your layout inside of it.
  return (
    <SessionProvider>
      <SplashScreenController />
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
        {/* Sibling routes must be listed or push from tabs may not navigate */}
        <Stack.Screen name="add_meter" />
        <Stack.Screen name="meter_details" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
