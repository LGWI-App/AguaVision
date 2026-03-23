import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import {
  Alert,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ensureMeterExists,
  updateMeterLatestReading,
  insertMeterReading,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/db";

export default function AddMeterScreen() {
  const router = useRouter();
  const { meterId: paramMeterId, reading: paramReading } = useLocalSearchParams<{
    meterId?: string;
    reading?: string;
  }>();
  const [meterId, setMeterId] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [initialReading, setInitialReading] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (paramMeterId != null && String(paramMeterId).trim() !== "") {
      setMeterId(String(paramMeterId).trim());
    }
    if (paramReading != null && String(paramReading).trim() !== "") {
      setInitialReading(String(paramReading).trim());
    }
  }, [paramMeterId, paramReading]);

  async function handleSubmit() {
    const id = parseInt(meterId.trim(), 10);
    if (!meterId.trim() || Number.isNaN(id) || id <= 0) {
      Alert.alert(
        "Invalid input",
        "Please enter a valid Meter ID (positive number).",
      );
      return;
    }

    const readingTrim = initialReading.trim();
    const hasInitialReading = readingTrim !== "";
    const initialReadingNum = hasInitialReading ? parseFloat(readingTrim) : NaN;
    if (
      hasInitialReading &&
      (Number.isNaN(initialReadingNum) || initialReadingNum < 0)
    ) {
      Alert.alert(
        "Invalid input",
        "Initial reading must be a non‑negative number.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await ensureMeterExists(
        id,
        DEFAULT_COMMUNITY_ID,
        householdName.trim() || undefined,
      );

      if (hasInitialReading) {
        const now = new Date().toISOString();
        await updateMeterLatestReading(id, initialReadingNum, now);
        await insertMeterReading({
          METER_ID: id,
          COMMUNITY_ID: DEFAULT_COMMUNITY_ID,
          CURRENT_READING: initialReadingNum,
          WATER_USED: 0,
          PRICE: 0,
          DATE_LAST_READ: null,
          DATE_CURRENT: now,
          LAST_READING: 0,
        });
      }

      import("@/lib/supabase-backup")
        .then(async ({ syncLocalToSupabase }) => {
          const result = await syncLocalToSupabase();
          console.log("[Supabase backup] syncLocalToSupabase result:", result);
        })
        .catch((err) => {
          console.error(
            "[Supabase backup] Failed to run syncLocalToSupabase:",
            err,
          );
        });
      Alert.alert(
        "Meter added",
        "The meter has been added to your community.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add meter.";
      Alert.alert("Error", message);
      console.error("Add meter error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Meter</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Meter ID</Text>
            <TextInput
              style={styles.input}
              value={meterId}
              onChangeText={setMeterId}
              placeholder="e.g. 101"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Household name (optional)</Text>
            <TextInput
              style={styles.input}
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="e.g. Unit 1, Smith Family"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Initial reading (optional)</Text>
            <TextInput
              style={styles.input}
              value={initialReading}
              onChangeText={setInitialReading}
              placeholder="e.g. 1234.5 — current value on meter"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Add meter"
            >
              <Text style={styles.submitButtonText}>
                {submitting ? "Adding…" : "Add meter"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  inner: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
