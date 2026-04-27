import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
} from "react-native";
import {
  clearAllData,
  getMetersByCommunityWithLatestPaid,
  getActiveCommunityId,
} from "../../lib/db";
import { Ionicons } from "@expo/vector-icons";

type Meter = {
  id: string;
  household: string;
  active: boolean;
  communityId: number;
  lastReadDate: string | null;
  latestReading: number | null;
  /** null = no readings yet; true/false from latest row PAID */
  latestPaid: boolean | null;
};

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const data = await getMetersByCommunityWithLatestPaid(
        getActiveCommunityId(),
      );

      const formatted: Meter[] = data.map((r) => ({
        id: String(r.METER_ID),
        household: r.HOUSEHOLD_NAME ?? `Community ${r.COMMUNITY_ID}`,
        active: Boolean(r.ACTIVE),
        communityId: r.COMMUNITY_ID,
        lastReadDate: r.LAST_READ_DATE ?? null,
        latestReading: r.LATEST_READING ?? null,
        latestPaid:
          r.LATEST_READING_PAID == null
            ? null
            : Number(r.LATEST_READING_PAID) === 1,
      }));

      setMeters(formatted);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching meters:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch whenever this tab gains focus (e.g. after router.back() from Add meter).
  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

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

  const onResetLocalDb = () => {
    Alert.alert(
      "Reset local database?",
      "This will clear all local meters and readings on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await fetchData();
            } catch (err: any) {
              Alert.alert("Reset failed", err?.message ?? "Unknown error");
            }
          },
        },
      ],
    );
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
        <TouchableOpacity
          style={styles.resetButton}
          onPress={onResetLocalDb}
          accessibilityRole="button"
          accessibilityLabel="Reset local database"
        >
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={styles.resetButtonText}>Reset local DB</Text>
        </TouchableOpacity>
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
                  <View style={styles.cardHeaderRight}>
                    <View
                      style={[
                        styles.paymentIconWrap,
                        item.latestPaid === true && styles.paymentIconPaid,
                        item.latestPaid === false && styles.paymentIconUnpaid,
                        item.latestPaid === null && styles.paymentIconNeutral,
                      ]}
                      accessibilityLabel={
                        item.latestPaid === null
                          ? "No bill recorded"
                          : item.latestPaid
                            ? "Latest bill paid"
                            : "Latest bill pending payment"
                      }
                    >
                      <Ionicons
                        name="cash-outline"
                        size={18}
                        color={
                          item.latestPaid === true
                            ? "#059669"
                            : item.latestPaid === false
                              ? "#dc2626"
                              : "#94a3b8"
                        }
                      />
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
                        {item.latestReading ?? "N/A"} m³
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
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/add_meter")}
        accessibilityRole="button"
        accessibilityLabel="Add meter"
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
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
  resetButton: {
    marginTop: 10,
    marginLeft: 56,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resetButtonText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
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
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  paymentIconWrap: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  paymentIconPaid: {
    backgroundColor: "#d1fae5",
    borderColor: "#a7f3d0",
  },
  paymentIconUnpaid: {
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
  },
  paymentIconNeutral: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
