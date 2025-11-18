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
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { performOCR, extractMeterReading } from "../../lib/google-vision";
import { Linking, Platform } from "react-native";



export default function MeterSubmission() {
  const [meterId, setMeterId] = useState<string>("");
  const [reading, setReading] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const USER_COMMUNITY_ID = 2;

  // Get API key from environment variable
  const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || "";

  // Handle opening camera with scanning guide
  async function handleOpenCamera() {
    if (!cameraPermission) {
      const permission = await requestCameraPermission();
      if (!permission || !permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "To capture meter readings, please enable camera access in your device settings.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }
    } else if (!cameraPermission.granted) {
      Alert.alert(
        "Camera Permission Required",
        "To capture meter readings, please enable camera access in your device settings.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return;
    }
    setShowCamera(true);
  }

  // Handle taking photo from custom camera
  async function handleTakePicture() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        // Get screen dimensions
        const screenWidth = Dimensions.get("window").width;
        const screenHeight = Dimensions.get("window").height;
        
        // Frame dimensions (as per styles)
        const frameHeight = 100; // 100px height
        
        // Get image dimensions using Image.getSize
        const getImageSize = (): Promise<{ width: number; height: number }> => {
          return new Promise((resolve, reject) => {
            Image.getSize(
              photo.uri,
              (width, height) => resolve({ width, height }),
              (error) => reject(error)
            );
          });
        };
        
        const { width: imageWidth, height: imageHeight } = await getImageSize();
        
        // Calculate the crop region
        // The frame is full width (screenWidth) and 100px height, centered vertically
        // Map screen coordinates to image coordinates
        // Since frame is full width, we crop full width of the image
        const cropWidth = imageWidth;
        // Calculate height based on frame height ratio to screen height
        const cropHeight = (frameHeight / screenHeight) * imageHeight;
        // Calculate Y position (center of image minus half crop height)
        const cropY = (imageHeight - cropHeight) / 2;
        const cropX = 0;
        
        // Crop the image to the frame area
        const croppedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              crop: {
                originX: cropX,
                originY: cropY,
                width: cropWidth,
                height: cropHeight,
              },
            },
          ],
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        setCapturedImage(croppedImage.uri);
        setShowCamera(false);
        await processImageWithOCR(croppedImage.uri);
      }
    } catch (error) {
      console.error("Camera capture error:", error);
      Alert.alert("Error", "Failed to capture image.");
    }
  }

  // Handle image capture/selection
  async function handleCaptureImage() {
    // Check gallery permission (usually granted by default, but check anyway)
    const galleryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    // Show action sheet to choose camera or gallery
    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Camera",
          onPress: handleOpenCamera,
        },
        {
          text: "Gallery",
          onPress: async () => {
            // Request gallery permission if needed
            if (galleryPermission.status !== "granted") {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== "granted") {
                Alert.alert(
                  "Permission Required",
                  "Photo library permission is required to select images.",
                  [
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                    {
                      text: "Open Settings",
                      onPress: () => {
                        if (Platform.OS === "ios") {
                          Linking.openURL("app-settings:");
                        } else {
                          Linking.openSettings();
                        }
                      },
                    },
                  ]
                );
                return;
              }
            }

            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                base64: false,
              });

              if (!result.canceled && result.assets[0]) {
                setCapturedImage(result.assets[0].uri);
                await processImageWithOCR(result.assets[0].uri);
              }
            } catch (error) {
              console.error("Gallery error:", error);
              Alert.alert("Error", "Failed to select image.");
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  }

  // Process image with OCR
  async function processImageWithOCR(imageUri: string) {
    if (!GOOGLE_VISION_API_KEY) {
      Alert.alert(
        "Configuration Error",
        "Google Vision API key is not configured. Please set EXPO_PUBLIC_GOOGLE_VISION_API_KEY in your environment variables."
      );
      return;
    }

    setProcessingOCR(true);
    try {
      const ocrResult = await performOCR(imageUri, GOOGLE_VISION_API_KEY);
      const extractedReading = extractMeterReading(ocrResult.text);

      if (extractedReading !== null) {
        setReading(extractedReading.toString());
        Alert.alert(
          "OCR Success",
          `Detected reading: ${extractedReading}\n\nFull text: ${ocrResult.text.substring(0, 100)}${ocrResult.text.length > 100 ? "..." : ""}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "No Reading Detected",
          `Could not extract a meter reading from the image.\n\nDetected text: ${ocrResult.text.substring(0, 200)}${ocrResult.text.length > 200 ? "..." : ""}\n\nPlease enter the reading manually.`
        );
      }
    } catch (error: any) {
      console.error("OCR processing error:", error);
      Alert.alert(
        "OCR Error",
        `Failed to process image: ${error.message || "Unknown error"}\n\nPlease enter the reading manually.`
      );
    } finally {
      setProcessingOCR(false);
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

      // Update Meters table with new latest reading and last read date
      const { error: updateError } = await supabase
        .from("METERS")
        .update({
          LATEST_READING: current,
          LAST_READ_DATE: new Date().toISOString(),
        })
        .eq("METER_ID", id);

      if (updateError) throw updateError; 


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
                  placeholder="Enter current reading (gallons)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={reading}
                  onChangeText={setReading}
                />
                <Pressable
                  onPress={handleCaptureImage}
                  disabled={processingOCR}
                  style={({ pressed }) => [
                    styles.cameraButton,
                    pressed && styles.cameraButtonPressed,
                    processingOCR && styles.cameraButtonDisabled,
                  ]}
                >
                  {processingOCR ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Ionicons name="camera" size={24} color="#2563eb" />
                  )}
                </Pressable>
              </View>
              {capturedImage && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                  <Pressable
                    onPress={() => setCapturedImage(null)}
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </Pressable>
                </View>
              )}
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

      {/* Camera Modal with Scanning Guide */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            {/* Scanning Guide Overlay */}
            <View style={styles.overlay}>
              {/* Top overlay */}
              <View style={styles.overlayTop} />
              
              {/* Middle section with scanning frame */}
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanningFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              
              {/* Bottom overlay */}
              <View style={styles.overlayBottom}>
                <Text style={styles.scanningHint}>
                  Align the meter reading within the frame
                </Text>
              </View>
            </View>

            {/* Camera Controls */}
            <View style={styles.cameraControls}>
              <Pressable
                onPress={() => setShowCamera(false)}
                style={styles.cameraControlButton}
              >
                <Ionicons name="close" size={32} color="#ffffff" />
              </Pressable>
              
              <Pressable
                onPress={handleTakePicture}
                style={styles.captureButton}
              >
                <View style={styles.captureButtonInner} />
              </Pressable>
              
              <View style={styles.cameraControlButton} />
            </View>
          </CameraView>
        </View>
      </Modal>
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
  cameraButtonDisabled: {
    opacity: 0.5,
  },
  imagePreview: {
    marginTop: 12,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: 100,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scanningFrame: {
    width: Dimensions.get("window").width,
    height: 100,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#2563eb",
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 20,
  },
  scanningHint: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cameraControlButton: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#2563eb",
    marginBottom: 200,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2563eb",
  },
});
