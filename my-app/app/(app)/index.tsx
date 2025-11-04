import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { supabase } from "../../lib/supabase";



export default function MeterSubmission() {
  const [meterId, setMeterId] = useState<string>("");
  const [reading, setReading] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const USER_COMMUNITY_ID = 2;

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
      // fetch last reading for this meter (most recent by DATE_CURRENT or DATE_LAST_READ)
      const { data: lastRows, error: fetchError } = await supabase
        .from("METER_READINGS")
        .select("CURRENT_READING, DATE_CURRENT")
        .eq("METER_ID", id)
        .order("DATE_CURRENT", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const lastReading = lastRows && lastRows.length > 0 ? Number(lastRows[0].CURRENT_READING) : 0;
      const waterUsed = current - lastReading;
      // fetch PRICE_RATE from uppercase COMMUNITY table (use USER_COMMUNITY_ID like in meters.tsx)
      let priceRate = 0;
      try {
        const { data: communityRows, error: communityError } = await supabase
          .from("COMMUNITY")
          .select("PRICE_RATE")
          .eq("COMMUNITY_ID", USER_COMMUNITY_ID)
          .limit(1);
        if (communityError) throw communityError;
        if (communityRows && communityRows.length > 0) {
          priceRate = Number(communityRows[0].PRICE_RATE) || 0;
        }
      } catch (err) {
        console.warn("Could not read COMMUNITY.PRICE_RATE", err);
        priceRate = 0;
      }

      // compute price
      const computedPrice = Math.max(0, waterUsed) * priceRate;

      // insert new row
      const payload = {
        METER_ID: id,
        CURRENT_READING: current,
        WATER_USED: waterUsed >= 0 ? waterUsed : 0,
        PRICE: computedPrice,
        DATE_LAST_READ: lastRows && lastRows.length > 0 ? lastRows[0].DATE_CURRENT : null,
        DATE_CURRENT: new Date().toISOString(),
        LAST_READING: lastReading
      } as any;

  console.log("Submitting payload", payload, { priceRate, computedPrice, waterUsed });
  const { error: insertError } = await supabase.from("METER_READINGS").insert([payload]);
  if (insertError) throw insertError;

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
    <SafeAreaView style={styles.safe}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Meter ID</Text>
            <TextInput
              style={styles.input}
              placeholder="Meter ID"
              keyboardType="numeric"
              value={meterId}
              onChangeText={setMeterId}
            />

            <Text style={styles.title}>Meter Reading</Text>
            <TextInput
              style={styles.input}
              placeholder="Meter Reading"
              keyboardType="numeric"
              value={reading}
              onChangeText={setReading}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                submitting && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Submit"}</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  button: {
    backgroundColor: "#006699",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#006699",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#006699",
    marginBottom: 8,
  },
  input: {
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e6eef5",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fbfdff",
    fontSize: 16,
  },
});
