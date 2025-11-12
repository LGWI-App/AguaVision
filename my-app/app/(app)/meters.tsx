import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";

type Meter = {
  id: string;
  household: string;
  active: boolean;
  communityId: number;
  lastReadDate: string | null;
  latestReading: number | null;
};

const USER_COMMUNITY_ID = 2;

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("METERS")
        .select("*")
        .eq("COMMUNITY_ID", USER_COMMUNITY_ID);

      if (error) throw error;
      if (!data) throw new Error("No data returned from Supabase");

      const formatted: Meter[] = data.map((r: any) => ({
        id: String(r.METER_ID),
        household: r.HOUSEHOLD_NAME ?? `Community ${r.COMMUNITY_ID}`,
        active: r.ACTIVE ?? false,
        communityId: r.COMMUNITY_ID,
        lastReadDate: r.LAST_READ_DATE ?? null,
        latestReading: r.LATEST_READING ?? null,
      }));

      setMeters(formatted);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching meters:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading meters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="list" size={24} color="#ffffff" />
          </View>
          <Text style={styles.headerTitle}>Community Meters</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {meters.length} {meters.length === 1 ? "meter" : "meters"} available
        </Text>
      </View>

      {meters.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="water-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>
            No meters found for this community.
          </Text>
        </View>
      ) : (
        <FlatList
          data={meters}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            // determine if lastReadDate is today (local date)
            const isToday = (() => {
              if (!item.lastReadDate) return false;
              const last = new Date(item.lastReadDate);
              const now = new Date();
              return (
                last.getFullYear() === now.getFullYear() &&
                last.getMonth() === now.getMonth() &&
                last.getDate() === now.getDate()
              );
            })();

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/meter_details?id=${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open details for meter ${item.id}`}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.meterIconContainer}>
                      <Ionicons name="water" size={20} color="#2563eb" />
                    </View>
                    <View>
                      <Text style={styles.meterId}>Meter {item.id}</Text>
                      <Text style={styles.household}>{item.household}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isToday ? styles.statusBadgeActive : styles.statusBadgeInactive,
                    ]}
                  >
                    <Ionicons
                      name={isToday ? "checkmark-circle" : "time-outline"}
                      size={16}
                      color={isToday ? "#059669" : "#ef4444"}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        isToday ? styles.statusTextActive : styles.statusTextInactive,
                      ]}
                    >
                      {isToday ? "Read Today" : "Pending"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Last Read</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(item.lastReadDate)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="pulse-outline" size={16} color="#6b7280" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Latest Reading</Text>
                      <Text style={styles.detailValue}>
                        {item.latestReading ?? "N/A"} gallons
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
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
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 56,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  meterIconContainer: {
    backgroundColor: "#dbeafe",
    padding: 10,
    borderRadius: 12,
  },
  meterId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  household: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: "#d1fae5",
  },
  statusBadgeInactive: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#059669",
  },
  statusTextInactive: {
    color: "#ef4444",
  },
  cardDetails: {
    gap: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  cardFooter: {
    alignItems: "flex-end",
    marginTop: 4,
  },
});
