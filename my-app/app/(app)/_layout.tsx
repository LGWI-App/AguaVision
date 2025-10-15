import { Stack } from "expo-router";
import { Text } from "react-native";
import { useSession } from "../../components/auth/ctx";

export default function RootLayout() {
  const { signOut } = useSession();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "Submit Meter Reading",
        headerRight: () => (
          <Text
            onPress={() => {
              // The `app/(app)/_layout.tsx` redirects to the sign-in screen.
              signOut();
            }}
          >
            Sign Out
          </Text>
        ),
      }}
    />
  );
}
