import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import TextRecognition from "@react-native-ml-kit/text-recognition";

export interface OcrDemoProps {
  visible: boolean;
  onClose: () => void;
  onReadingDetected: (reading: string) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
// Keep this box tight around the meter digits
const FRAME_HEIGHT = 64;
const FRAME_WIDTH = Math.round(SCREEN_WIDTH * 0.72);
const MAX_CANDIDATES = 3;

function scoreCandidate(value: string): number {
  let score = 0;
  const [whole = "", decimal = ""] = value.split(".");
  const wholeLen = whole.length;

  // Prefer meter-like lengths
  if (wholeLen >= 5 && wholeLen <= 8) score += 10;
  else if (wholeLen === 4 || wholeLen === 9) score += 5;
  else score -= 4;

  // Prefer integer-like values; if decimal exists prefer exactly one place
  if (!value.includes(".")) score += 3;
  else if (decimal.length === 1) score += 1;
  else score -= 2;

  // Prefer larger values for meter readings
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) score += Math.min(6, Math.floor(numeric / 10000));

  return score;
}

function extractReadingCandidates(ocrResult: any): string[] {
  if (!ocrResult?.blocks || !Array.isArray(ocrResult.blocks)) {
    return [];
  }

  const allDigitSequences: string[] = [];
  ocrResult.blocks.forEach((block: any) => {
    if (!block?.lines || !Array.isArray(block.lines)) return;
    block.lines.forEach((line: any) => {
      const text = line?.text;
      if (!text) return;
      const matches = text.match(/\d+(\.\d+)?/g);
      if (matches) allDigitSequences.push(...matches);
    });
  });

  const unique = Array.from(new Set(allDigitSequences));
  return unique
    .map((value) => ({ value, score: scoreCandidate(value) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
    .map((item) => item.value);
}

export function OcrDemo({
  visible,
  onClose,
  onReadingDetected,
}: OcrDemoProps) {
  const [processing, setProcessing] = useState(false);
  const [showCameraView, setShowCameraView] = useState(false);
  const [candidateReadings, setCandidateReadings] = useState<string[]>([]);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  async function requestPermissions(): Promise<boolean> {
    if (cameraPermission?.granted) return true;
    const result = await requestCameraPermission();
    if (!result?.granted) {
      Alert.alert(
        "Camera Permission Required",
        "Please enable camera access in settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }

  async function handleOpenCamera() {
    const ok = await requestPermissions();
    if (!ok) return;
    setCandidateReadings([]);
    setShowCameraView(true);
  }

  function applyOcrResult(ocrResult: any, noReadingMessage: string) {
    const candidates = extractReadingCandidates(ocrResult);

    if (candidates.length === 0) {
      Alert.alert("No Reading Detected", noReadingMessage, [{ text: "OK" }]);
      return;
    }

    if (candidates.length === 1) {
      onReadingDetected(candidates[0]);
      onClose();
      return;
    }

    // Ambiguous OCR: let user select from top-ranked candidates.
    setCandidateReadings(candidates);
  }

  async function handleTakePicture() {
    if (!cameraRef.current) return;

    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo) {
        setProcessing(false);
        return;
      }

      setShowCameraView(false);

      // Get image dimensions
      const getImageSize = (): Promise<{ width: number; height: number }> =>
        new Promise((resolve, reject) => {
          Image.getSize(
            photo.uri,
            (width, height) => resolve({ width, height }),
            reject
          );
        });

      const { width: imageWidth, height: imageHeight } = await getImageSize();

      // Frame position on screen (centered vertically and horizontally)
      const frameY = (SCREEN_HEIGHT - FRAME_HEIGHT) / 2;
      const frameX = (SCREEN_WIDTH - FRAME_WIDTH) / 2;
      const scaleX = imageWidth / SCREEN_WIDTH;
      const scaleY = imageHeight / SCREEN_HEIGHT;

      const cropWidth = FRAME_WIDTH * scaleX;
      const cropHeight = FRAME_HEIGHT * scaleY;
      const cropX = frameX * scaleX;
      const cropY = frameY * scaleY;

      const croppedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: Math.round(cropX),
              originY: Math.round(cropY),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // OCR runs only on the cropped frame region.
      const ocrResult = await TextRecognition.recognize(croppedImage.uri);
      applyOcrResult(
        ocrResult,
        "Could not extract a meter reading. Align the digits within the frame and try again."
      );
    } catch (error: any) {
      console.error("OCR error:", error);
      Alert.alert(
        "OCR Error",
        error?.message || "Failed to process image. Try again or enter manually.",
        [{ text: "OK" }]
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleGallery() {
    setProcessing(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        setProcessing(false);
        return;
      }

      const uri = result.assets[0].uri;
      const ocrResult = await TextRecognition.recognize(uri);
      applyOcrResult(
        ocrResult,
        "Could not extract a meter reading. Try a clearer photo or enter manually."
      );
    } catch (error: any) {
      console.error("OCR error:", error);
      Alert.alert(
        "OCR Error",
        error?.message || "Failed to process image. Try again or enter manually.",
        [{ text: "OK" }]
      );
    } finally {
      setProcessing(false);
    }
  }

  // Full-screen camera with rectangle overlay
  if (showCameraView) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setShowCameraView(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            {/* Dark overlay with cutout */}
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                <Text style={styles.scanHint}>
                  Align the meter reading within the frame
                </Text>
              </View>
            </View>

            <View style={styles.cameraControls}>
              <Pressable
                onPress={() => setShowCameraView(false)}
                style={styles.controlButton}
              >
                <Ionicons name="close" size={32} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={handleTakePicture}
                disabled={processing}
                style={[styles.captureButton, processing && styles.captureDisabled]}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </Pressable>
              <View style={styles.controlButton} />
            </View>
          </CameraView>
        </View>
      </Modal>
    );
  }

  // Initial sheet: Take Photo or Gallery
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlaySheet}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan Meter Reading</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color="#6b7280" />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            Take a photo with the scanning frame, or choose from gallery. Align
            the meter digits within the rectangle for best results.
          </Text>

          {processing ? (
            <View style={styles.processing}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.processingText}>Reading meter...</Text>
            </View>
          ) : candidateReadings.length > 1 ? (
            <View style={styles.candidatesContainer}>
              <Text style={styles.candidatesTitle}>
                Multiple readings detected. Pick the best one:
              </Text>
              {candidateReadings.map((candidate) => (
                <Pressable
                  key={candidate}
                  style={({ pressed }) => [
                    styles.candidateButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    onReadingDetected(candidate);
                    setCandidateReadings([]);
                    onClose();
                  }}
                >
                  <Text style={styles.candidateText}>{candidate}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.tryAgainButton}
                onPress={() => setCandidateReadings([])}
              >
                <Text style={styles.tryAgainText}>Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleOpenCamera}
              >
                <Ionicons name="camera" size={32} color="#ffffff" />
                <Text style={styles.buttonText}>Take Photo</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleGallery}
              >
                <Ionicons name="images" size={32} color="#2563eb" />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Choose from Gallery
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlaySheet: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  hint: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  processing: {
    alignItems: "center",
    paddingVertical: 32,
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  candidatesContainer: {
    gap: 10,
  },
  candidatesTitle: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  candidateButton: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  candidateText: {
    color: "#1d4ed8",
    fontSize: 18,
    fontWeight: "700",
  },
  tryAgainButton: {
    alignSelf: "center",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tryAgainText: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  secondaryButton: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  secondaryButtonText: {
    color: "#2563eb",
  },
  // Camera view
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: FRAME_HEIGHT,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 20,
  },
  scanHint: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  controlButton: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#2563eb",
  },
  captureDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
  },
});
