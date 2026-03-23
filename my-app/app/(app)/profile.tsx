import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSession } from "../../components/auth/ctx";
import { getCommunityInfo } from "../../lib/db";

type CommunityInfo = {
  COMMUNITY_ID: number;
  PRICE_RATE: number;
} | null;

export default function ProfilePage() {
  const router = useRouter();
  const { signOut, communityId, locationName } = useSession();
  const [info, setInfo] = useState<CommunityInfo>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const row = await getCommunityInfo(communityId);
      setInfo(row);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useFocusEffect(
    useCallback(() => {
      void fetchInfo();
    }, [fetchInfo]),
  );

  const onLogout = () => {
    signOut();
    router.replace("/sign-in");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="person" size={24} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>Community Profile</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {locationName ?? `Community ${communityId}`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Community Info</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Community ID</Text>
              <Text style={styles.value}>{communityId}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Price Rate</Text>
              <Text style={styles.value}>
                {Number(info?.PRICE_RATE ?? 0).toFixed(4)}
              </Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <Ionicons name="log-out-outline" size={18} color="#ffffff" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  header: {
    padding: 16,
    paddingTop: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  headerSubtitle: {
    marginLeft: 56,
    color: "#6b7280",
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  value: {
    color: "#1f2937",
    fontSize: 20,
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 16,
    marginHorizontal: 16,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
