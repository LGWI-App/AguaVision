import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function MeterSubmission() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>House/Meter ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Meter ID"
        /* What type of keyboard? */ keyboardType="numeric"
      ></TextInput>
      <Text style={styles.title}>Meter Reading</Text>
      <TextInput
        style={styles.input}
        placeholder="Meter Reading"
        keyboardType="numeric"
      ></TextInput>
      <Pressable>
        <Text style={styles.button}>Submit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#006699",
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 79,
    paddingVertical: 18,
    borderRadius: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
  },
  input: {
    // fix this
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
