import {
  StyleSheet,
  Text
} from "react-native";


export default function MeterSubmission() {
  // // supabase has a narrow typed Database in utils; create an any-typed alias
  // const db: any = supabase;
  // const [meterId, setMeterId] = useState<string>("");
  // const [reading, setReading] = useState<string>("");
  // const [submitting, setSubmitting] = useState(false);
  // const USER_COMMUNITY_ID = 2;

  // async function handleSubmit() {
  //   // basic validation
  //   const id = parseInt(meterId, 10);
  //   const current = parseFloat(reading);
  //   if (!id || Number.isNaN(current)) {
  //     Alert.alert("Validation error", "Please enter a valid Meter ID and Reading.");
  //     return;
  //   }

  //   setSubmitting(true);
  //   try {
  //     // fetch last reading for this meter (most recent by DATE_CURRENT or DATE_LAST_READ)
  //     const { data: lastRows, error: fetchError } = await db
  //       .from("METER_READINGS")
  //       .select("CURRENT_READING, DATE_CURRENT")
  //       .eq("METER_ID", id)
  //       .order("DATE_CURRENT", { ascending: false })
  //       .limit(1);

  //     if (fetchError) throw fetchError;

  //     const lastReading = lastRows && lastRows.length > 0 ? Number(lastRows[0].CURRENT_READING) : 0;
  //     const waterUsed = current - lastReading;
  //     // fetch PRICE_RATE from uppercase COMMUNITY table (use USER_COMMUNITY_ID like in meters.tsx)
  //     let priceRate = 0;
  //     try {
  //       const { data: communityRows, error: communityError } = await db
  //         .from("COMMUNITY")
  //         .select("PRICE_RATE")
  //         .eq("COMMUNITY_ID", USER_COMMUNITY_ID)
  //         .limit(1);
  //       if (communityError) throw communityError;
  //       if (communityRows && communityRows.length > 0) {
  //         priceRate = Number(communityRows[0].PRICE_RATE) || 0;
  //       }
  //     } catch (err) {
  //       console.warn("Could not read COMMUNITY.PRICE_RATE", err);
  //       priceRate = 0;
  //     }

  //     // compute price
  //     const computedPrice = Math.max(0, waterUsed) * priceRate;

  //     // insert new row
  //     const payload = {
  //       METER_ID: id,
  //       CURRENT_READING: current,
  //       WATER_USED: waterUsed >= 0 ? waterUsed : 0,
  //       PRICE: computedPrice,
  //       DATE_LAST_READ: lastRows && lastRows.length > 0 ? lastRows[0].DATE_CURRENT : null,
  //       DATE_CURRENT: new Date().toISOString(),
  //       LAST_READING: lastReading
  //     } as any;

  //     // Update Meters table with new latest reading and last read date
  //     const { error: updateError } = await db
  //       .from("METERS")
  //       .update({
  //         LATEST_READING: current,
  //         LAST_READ_DATE: new Date().toISOString(),
  //       })
  //       .eq("METER_ID", id);

  //     if (updateError) throw updateError; 


  // console.log("Submitting payload", payload, { priceRate, computedPrice, waterUsed });
  // const { error: insertError } = await db.from("METER_READINGS").insert([payload]);
  // if (insertError) throw insertError;

  //     Alert.alert("Success", "Meter reading submitted.");
  //     setMeterId("");
  //     setReading("");
  //   } catch (err: any) {
  //     // stringify full error (including custom props) for easier debugging
  //     let details = '';
  //     try {
  //       details = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
  //     } catch {
  //       details = String(err);
  //     }
  //     console.error("Submit error", details);
  //     // show a truncated version in the Alert (alerts have limited space)
  //     Alert.alert("Submit failed", details.slice(0, 1000));
  //   } finally {
  //     setSubmitting(false);
  //   }
  // }



  return (

    <Text style={{marginTop: 100}}>Temporarily disabled</Text>

    // <SafeAreaView style={styles.container}>
    //   <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    //     <ScrollView
    //       style={styles.scrollView}
    //       contentContainerStyle={styles.scrollContent}
    //       keyboardShouldPersistTaps="handled"
    //     >
    //       {/* Header */}
    //       <View style={styles.header}>
    //         <View style={styles.headerContent}>
    //           <View style={styles.iconContainer}>
    //             <Ionicons name="add-circle" size={24} color="#ffffff" />
    //           </View>
    //           <Text style={styles.headerTitle}>Submit Reading</Text>
    //         </View>
    //         <Text style={styles.headerSubtitle}>
    //           Enter meter information to submit a new reading
    //         </Text>
    //       </View>

    //       {/* Form Card */}
    //       <View style={styles.card}>
    //         <Text style={styles.cardTitle}>Meter Information</Text>

    //         {/* Meter ID Input */}
    //         <View style={styles.inputContainer}>
    //           <Text style={styles.label}>Meter ID</Text>
    //           <View style={styles.inputWrapper}>
    //             <View style={styles.inputIcon}>
    //               <Ionicons name="water" size={20} color="#6b7280" />
    //             </View>
    //             <TextInput
    //               style={styles.input}
    //               placeholder="Enter meter ID"
    //               placeholderTextColor="#9ca3af"
    //               keyboardType="numeric"
    //               value={meterId}
    //               onChangeText={setMeterId}
    //             />
    //           </View>
    //         </View>

    //         {/* Reading Input */}
    //         <View style={styles.inputContainer}>
    //           <Text style={styles.label}>Current Reading</Text>
    //           <View style={styles.inputWrapper}>
    //             <View style={styles.inputIcon}>
    //               <Ionicons name="pulse-outline" size={20} color="#6b7280" />
    //             </View>
    //             <TextInput
    //               style={styles.input}
    //               placeholder="Enter current reading (gallons)"
    //               placeholderTextColor="#9ca3af"
    //               keyboardType="numeric"
    //               value={reading}
    //               onChangeText={setReading}
    //             />
    //           </View>
    //         </View>

    //         {/* Submit Button */}
    //         <Pressable
    //           onPress={handleSubmit}
    //           disabled={submitting}
    //           style={({ pressed }) => [
    //             styles.button,
    //             pressed && styles.buttonPressed,
    //             submitting && styles.buttonDisabled,
    //           ]}
    //         >
    //           {submitting ? (
    //             <View style={styles.buttonContent}>
    //               <ActivityIndicator size="small" color="#ffffff" />
    //               <Text style={styles.buttonText}>Submitting...</Text>
    //             </View>
    //           ) : (
    //             <View style={styles.buttonContent}>
    //               <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
    //               <Text style={styles.buttonText}>Submit Reading</Text>
    //             </View>
    //           )}
    //         </Pressable>
    //       </View>

    //       {/* Info Card */}
    //       <View style={[styles.card, styles.infoCard]}>
    //         <View style={styles.infoHeader}>
    //           <Ionicons name="information-circle" size={20} color="#2563eb" />
    //           <Text style={styles.infoTitle}>How it works</Text>
    //         </View>
    //         <Text style={styles.infoText}>
    //           Enter the meter ID and current reading. The system will automatically calculate water usage and pricing based on your community's rate.
    //         </Text>
    //       </View>
    //     </ScrollView>
    //   </TouchableWithoutFeedback>
    // </SafeAreaView>
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
  todos: {
    marginTop: 8,
  },
  todoItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  todoText: {
    fontSize: 15,
    color: '#111827',
  },
});
