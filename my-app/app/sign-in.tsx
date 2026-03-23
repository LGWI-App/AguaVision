import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSession } from "../components/auth/ctx";
import { supabase } from "../lib/supabase";
import { syncCommunityFromSupabase } from "../lib/supabase-backup";

type CommunityOption = {
  COMMUNITY_ID: number;
  LOCATION_NAME: string | null;
};

export default function SignIn() {
  const { signIn } = useSession();
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(
    null,
  );
  const [communityIdInput, setCommunityIdInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("COMMUNITY")
          .select("COMMUNITY_ID, LOCATION_NAME")
          .order("LOCATION_NAME", { ascending: true });
        if (error) throw error;
        const options = (data ?? []).filter(
          (c) => typeof c.COMMUNITY_ID === "number",
        ) as CommunityOption[];
        setCommunities(options);
        if (options.length > 0) {
          setSelectedCommunityId(options[0].COMMUNITY_ID);
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load communities.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCommunity = useMemo(
    () => communities.find((c) => c.COMMUNITY_ID === selectedCommunityId) ?? null,
    [communities, selectedCommunityId],
  );

  const submitDisabled =
    submitting || selectedCommunityId == null || communityIdInput.trim() === "";

  const onSubmit = async () => {
    if (selectedCommunity == null) return;
    const entered = parseInt(communityIdInput.trim(), 10);
    if (!Number.isFinite(entered)) {
      setError("Enter a numeric Community ID.");
      return;
    }
    if (entered !== selectedCommunity.COMMUNITY_ID) {
      setError("Community ID does not match the selected location.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const syncResult = await syncCommunityFromSupabase(
      selectedCommunity.COMMUNITY_ID,
    );
    if (!syncResult.ok) {
      setError(
        syncResult.error ??
          "Could not load this community's existing meter data from Supabase.",
      );
      setSubmitting(false);
      return;
    }
    signIn({
      communityId: selectedCommunity.COMMUNITY_ID,
      locationName:
        selectedCommunity.LOCATION_NAME ??
        `Community ${selectedCommunity.COMMUNITY_ID}`,
    });
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <Image
        style={styles.image}
        source={require("../assets/images/logo.png")}
        // placeholder={{ blurhash }}
        contentFit="contain"
      />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#006699" />
          <Text style={styles.loadingText}>Loading communities...</Text>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Location</Text>
          <Pressable style={styles.dropdown} onPress={() => setPickerOpen(true)}>
            <Text style={styles.dropdownText}>
              {selectedCommunity?.LOCATION_NAME ??
                (selectedCommunity
                  ? `Community ${selectedCommunity.COMMUNITY_ID}`
                  : "Select a location")}
            </Text>
            <Text style={styles.dropdownChevron}>▼</Text>
          </Pressable>

          <Text style={styles.label}>Community ID</Text>
          <TextInput
            style={styles.input}
            value={communityIdInput}
            onChangeText={setCommunityIdInput}
            placeholder="Enter Community ID"
            keyboardType="number-pad"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, submitDisabled && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitDisabled}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Checking..." : "Log In"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Location</Text>
            {communities.map((community) => (
              <TouchableOpacity
                key={community.COMMUNITY_ID}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedCommunityId(community.COMMUNITY_ID);
                  setPickerOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>
                  {community.LOCATION_NAME ?? `Community ${community.COMMUNITY_ID}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  form: {
    width: "100%",
    maxWidth: 360,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dropdownText: {
    color: "#0f172a",
    fontSize: 15,
  },
  dropdownChevron: {
    color: "#64748b",
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#006699",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingWrap: {
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#64748b",
  },
  errorText: {
    color: "#dc2626",
    marginBottom: 12,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    maxHeight: 420,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalOptionText: {
    fontSize: 15,
    color: "#0f172a",
  },
});
