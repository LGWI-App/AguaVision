import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import {
  getLastReadingForMeter,
  getCommunityPriceRate,
  insertMeterReading,
  updateMeterLatestReading,
  meterExistsInCommunity,
  getActiveCommunityId,
} from "../../lib/db";
import { requestCloudBackup } from "../../lib/supabase-backup";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { OcrDemo } from "../../components/OcrDemo";



export default function MeterSubmission() {
  const router = useRouter();
  const { meterId: meterIdParam } = useLocalSearchParams<{ meterId?: string }>();
  const [meterId, setMeterId] = useState<string>("");
  const [reading, setReading] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showOcrDemo, setShowOcrDemo] = useState(false);
  const [ocrPreviousReading, setOcrPreviousReading] = useState(0);

  useEffect(() => {
    if (meterIdParam != null && String(meterIdParam).trim() !== "") {
      setMeterId(String(meterIdParam).trim());
    }
  }, [meterIdParam]);

  async function handleOpenOcr() {
    const id = parseInt(meterId, 10);
    if (!id || Number.isNaN(id)) {
      Alert.alert(
        "Meter ID required",
        "Enter a valid meter ID before scanning so we can compare against your last reading."
      );
      return;
    }
    try {
      const communityId = getActiveCommunityId();
      const lastRow = await getLastReadingForMeter(id, communityId);
      const prev = lastRow ? Number(lastRow.CURRENT_READING) : 0;
      setOcrPreviousReading(prev);
      setShowOcrDemo(true);
    } catch (err: any) {
      Alert.alert(
        "Could not load last reading",
        err?.message ?? "Try again or enter the reading manually."
      );
    }
  }

  async function handleSubmit() {
    // basic validation
    const id = parseInt(meterId, 10);
    const current = parseFloat(reading);
    if (!id || Number.isNaN(current)) {
      Alert.alert("Validation error", "Please enter a valid Meter ID and Reading.");
      return;
    }

    setSubmitting(true);
    try {
      const communityId = getActiveCommunityId();
      const exists = await meterExistsInCommunity(id, communityId);
      if (!exists) {
        const q = new URLSearchParams({
          meterId: String(id),
          reading: String(current),
        }).toString();
        router.push(`/add_meter?${q}` as Parameters<typeof router.push>[0]);
        return;
      }

      const lastRow = await getLastReadingForMeter(id, communityId);
      const lastReading = lastRow ? Number(lastRow.CURRENT_READING) : 0;
      const waterUsed = current - lastReading;

      const priceRate = await getCommunityPriceRate(communityId);
      const computedPrice = Math.max(0, waterUsed) * priceRate;

      const payload = {
        METER_ID: id,
        COMMUNITY_ID: communityId,
        CURRENT_READING: current,
        WATER_USED: waterUsed >= 0 ? waterUsed : 0,
        PRICE: computedPrice,
        DATE_LAST_READ: lastRow ? lastRow.DATE_CURRENT : null,
        DATE_CURRENT: new Date().toISOString(),
        LAST_READING: lastReading,
      };

      await insertMeterReading(payload);
      await updateMeterLatestReading(id, current, new Date().toISOString());

      requestCloudBackup();

      Alert.alert("Success", "Meter reading submitted.");
      setMeterId("");
      setReading("");
    } catch (err: any) {
      // stringify full error (including custom props) for easier debugging
      let details = '';
      try {
        details = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
      } catch {
        details = String(err);
      }
      console.error("Submit error", details);
      // show a truncated version in the Alert (alerts have limited space)
      Alert.alert("Submit failed", details.slice(0, 1000));
    } finally {
      setSubmitting(false);
    }
  }



  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="add-circle" size={24} color="#ffffff" />
              </View>
              <Text style={styles.headerTitle}>Submit Reading</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Enter meter information to submit a new reading
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meter Information</Text>

            {/* Meter ID Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Meter ID</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Ionicons name="water" size={20} color="#6b7280" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter meter ID"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={meterId}
                  onChangeText={setMeterId}
                />
              </View>
            </View>

            {/* Reading Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Current Reading</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <Ionicons name="pulse-outline" size={20} color="#6b7280" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current reading (m³)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={reading}
                  onChangeText={setReading}
                />
                <Pressable
                  onPress={handleOpenOcr}
                  style={({ pressed }) => [
                    styles.cameraButton,
                    pressed && styles.cameraButtonPressed,
                  ]}
                >
                  <Ionicons name="camera" size={24} color="#2563eb" />
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Tap the camera icon to capture or select a photo of your meter
              </Text>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.buttonText}>Submitting...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.buttonText}>Submit Reading</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Info Card */}
          <View style={[styles.card, styles.infoCard]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color="#2563eb" />
              <Text style={styles.infoTitle}>How it works</Text>
            </View>
            <Text style={styles.infoText}>
              Enter the meter ID and current reading. The system will automatically calculate water usage and pricing based on your community's rate.
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      <OcrDemo
        visible={showOcrDemo}
        previousReading={ocrPreviousReading}
        onClose={() => setShowOcrDemo(false)}
        onReadingDetected={(r) => {
          setReading(r);
          setShowOcrDemo(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingTop: 16,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: "#1f2937",
    paddingRight: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
  },
  infoText: {
    fontSize: 14,
    color: "#1e3a8a",
    lineHeight: 20,
  },
  cameraButton: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButtonPressed: {
    opacity: 0.7,
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },
});
