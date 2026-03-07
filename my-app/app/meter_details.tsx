// App.tsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface MeterReading {
  idx: number;
  METER_ID: number;
  CURRENT_READING: number;
  WATER_USED: number;
  PRICE: number;
  DATE_LAST_READ: string;
  DATE_CURRENT: string;
  LAST_READING: number;
  entry_id: number;
}

export default function App() {
  const [data, setData] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setError(null);
      const { data: readings, error: supabaseError } = await supabase
        .from("METER_READINGS")
        .select("*")
        .order("DATE_CURRENT", { ascending: true });

      if (supabaseError) throw supabaseError;

      setData(readings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching data:", err);
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading meter data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="water-outline" size={48} color="#94a3b8" />
        <Text style={styles.emptyText}>No readings found</Text>
      </View>
    );
  }

  const latestEntry = data[data.length - 1];
  const priceRate =
    latestEntry.WATER_USED > 0
      ? (latestEntry.PRICE / latestEntry.WATER_USED).toFixed(2)
      : "0.00";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back to meters page"
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="water" size={24} color="#ffffff" />
              </View>
              <Text style={styles.headerTitle}>Water Meter</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Meter ID: {latestEntry.METER_ID}
          </Text>
        </View>

        {/* Last Reading Card */}
        <View style={styles.card}>
          <View style={styles.lastReadingContainer}>
            <View>
              <Text style={styles.labelText}>Last Reading</Text>
              <Text style={styles.priceText}>
                ${latestEntry.PRICE.toFixed(2)}
              </Text>
            </View>
            <View style={styles.dateContainer}>
              <View style={styles.dateLabel}>
                <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                <Text style={styles.dateLabelText}>Last Read</Text>
              </View>
              <Text style={styles.dateText}>
                {formatDate(latestEntry.DATE_LAST_READ)}
              </Text>
            </View>
          </View>
        </View>

        {/* Current Reading */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Reading</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.gridItem, styles.blueBackground]}>
              <Text style={styles.gridLabel}>Reading</Text>
              <Text style={styles.gridValue}>
                {latestEntry.CURRENT_READING}
              </Text>
              <Text style={styles.gridUnit}>gallons</Text>
            </View>
            <View style={[styles.gridItem, styles.cyanBackground]}>
              <Text style={styles.gridLabel}>Date</Text>
              <Text style={styles.gridValueSmall}>
                {formatDate(latestEntry.DATE_CURRENT)}
              </Text>
            </View>
          </View>
        </View>

        {/* Usage Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Usage Details</Text>

          {/* Water Used */}
          <View style={[styles.detailCard, styles.blueGradient]}>
            <View style={styles.detailContent}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="water" size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Water Used</Text>
                <Text style={styles.detailValue}>{latestEntry.WATER_USED}</Text>
              </View>
            </View>
            <Text style={styles.detailUnit}>gallons</Text>
          </View>

          {/* Price */}
          <View style={[styles.detailCard, styles.greenGradient]}>
            <View style={styles.detailContent}>
              <View style={[styles.detailIconContainer, styles.greenIcon]}>
                <Ionicons name="cash-outline" size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Total Price</Text>
                <Text style={styles.detailValue}>
                  ${latestEntry.PRICE.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Price Rate */}
          <View style={[styles.detailCard, styles.purpleGradient]}>
            <View style={styles.detailContent}>
              <View style={[styles.detailIconContainer, styles.purpleIcon]}>
                <Ionicons name="trending-up" size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.detailLabel}>Price Rate</Text>
                <Text style={styles.detailValue}>${priceRate}</Text>
              </View>
            </View>
            <Text style={styles.detailUnit}>per gallon</Text>
          </View>
        </View>

        {/* History indicator */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {data.length} readings on record
          </Text>
        </View>
      </ScrollView>
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
    backgroundColor: "#f0f9ff",
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
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
    marginLeft: 44,
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
  lastReadingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  labelText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  priceText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1f2937",
  },
  dateContainer: {
    alignItems: "flex-end",
  },
  dateLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  dateLabelText: {
    fontSize: 12,
    color: "#6b7280",
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: "row",
    gap: 12,
  },
  gridItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  blueBackground: {
    backgroundColor: "#dbeafe",
  },
  cyanBackground: {
    backgroundColor: "#cffafe",
  },
  gridLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
  },
  gridValueSmall: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0891b2",
  },
  gridUnit: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 4,
  },
  detailCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  blueGradient: {
    backgroundColor: "#dbeafe",
  },
  greenGradient: {
    backgroundColor: "#d1fae5",
  },
  purpleGradient: {
    backgroundColor: "#f3e8ff",
  },
  detailContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIconContainer: {
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 8,
  },
  greenIcon: {
    backgroundColor: "#059669",
  },
  purpleIcon: {
    backgroundColor: "#7c3aed",
  },
  detailLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
  },
  detailUnit: {
    fontSize: 12,
    color: "#6b7280",
  },
  footer: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
