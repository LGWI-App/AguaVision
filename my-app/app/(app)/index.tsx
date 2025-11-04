import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MeterSubmission() {

  

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
            />

            <Text style={styles.title}>Meter Reading</Text>
            <TextInput
              style={styles.input}
              placeholder="Meter Reading"
              keyboardType="numeric"
            />

            <Pressable
              onPress={() => {
                // submit handler
              }}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Submit</Text>
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
