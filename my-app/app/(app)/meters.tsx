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
} from "react-native";
import { supabase } from "../../lib/supabase";

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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
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
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#006699" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Community Meters</Text>

        {meters.length === 0 ? (
          <Text style={styles.emptyText}>
            No meters found for this community.
          </Text>
        ) : (
          <FlatList
            data={meters}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => router.push(`/meter_details?id=${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open details for meter ${item.id}`}
              >
                <View>
                  <Text style={styles.id}>Meter {item.id}</Text>
                  <Text style={styles.household}>{item.household}</Text>
                  <Text style={styles.detail}>
                    Last Read: {" "}
                    {item.lastReadDate
                      ? new Date(item.lastReadDate).toLocaleString()
                      : "N/A"}
                  </Text>
                  <Text style={styles.detail}>
                    Latest Reading: {item.latestReading ?? "N/A"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    justifyContent: "center",
    paddingTop: 10,
  },
  container: { padding: 20 },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 14,
    color: "#006699",
  },
  item: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  id: { fontWeight: "700", color: "#222", fontSize: 16 },
  household: { color: "#666", fontSize: 14, marginBottom: 4 },
  detail: { color: "#444", fontSize: 13 },
  active: { color: "green", fontWeight: "600" },
  inactive: { color: "red", fontWeight: "600" },
  errorText: { color: "#c00", textAlign: "center", fontSize: 16 },
  emptyText: { textAlign: "center", color: "#555", fontSize: 16, marginTop: 20 },
});
