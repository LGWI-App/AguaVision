import { Tabs } from "expo-router";

// Tabs layout for the protected (app) routes. Keep this minimal: one tab for
// meter submission (index) and one for the community meters list.
export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Submit" }} />
      <Tabs.Screen name="meters" options={{ title: "Meters" }} />
    </Tabs>
  );
}
