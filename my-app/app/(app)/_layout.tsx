import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { requestCloudBackup } from "../../lib/supabase-backup";

// Tabs layout for the protected (app) routes. Keep this minimal: one tab for
// meter submission (index) and one for the community meters list. We add
// `tabBarIcon` entries so each tab shows an icon from @expo/vector-icons.
export default function AppLayout() {
  useEffect(() => {
    requestCloudBackup();
    const onChange = (state: AppStateStatus) => {
      if (state === "active") requestCloudBackup();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0ea5e9", // cyan-500
        tabBarInactiveTintColor: "#6b7280", // gray-500
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Submit",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="meters"
        options={{
          title: "Meters",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
