import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Meter = { id: string; location?: string; lastReading?: string };

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from("METERS")
          .select("*")
          .eq("COMMUNITY_ID", 2);

        if (error) throw error;

        const formatted = data.map((r: any) => ({
          id: String(r.METER_ID),
          location:
            r.HOUSEHOLD_NAME ??
            (r.COMMUNITY_ID ? `Community ${r.COMMUNITY_ID}` : undefined),
          lastReading:
            r.LAST_READING != null ? String(r.LAST_READING) : undefined,
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

  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color="#006699" />
      </SafeAreaView>
    );

  if (error)
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ color: "#c00", textAlign: "center" }}>Error: {error}</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Community Meters</Text>
        <FlatList
          data={meters}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View>
                <Text style={styles.id}>{item.id}</Text>
                <Text style={styles.location}>{item.location}</Text>
              </View>
              <Text style={styles.reading}>{item.lastReading}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fb", justifyContent: "center" },
  container: { padding: 20 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 12, color: "#006699" },
  item: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  id: { fontWeight: "700", color: "#222" },
  location: { color: "#666" },
  reading: { fontWeight: "600", color: "#006699" },
});
