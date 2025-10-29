import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function MeterDetailsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>Meter {String(id ?? "—")}</Text>
        <Text style={styles.sub}>Details will go here.</Text>
        <View style={{ marginTop: 20 }}>
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff", paddingTop: 10 },
  container: { padding: 20 },
  heading: { fontSize: 22, fontWeight: "700", color: "#006699" },
  sub: { marginTop: 8, color: "#444" },
});
