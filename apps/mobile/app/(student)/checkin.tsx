import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { submitCheckin } from "../../services/api";

type Phase = "camera" | "preview" | "form";

export default function CheckinScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  if (!permission)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>
          📷 Camera access is required for check-ins
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setPhase("preview");
    }
  };

  const handleSubmit = async () => {
    if (!photoUri || !activity.trim()) {
      Alert.alert("Required", "Please describe what you are studying");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: photoUri,
        type: "image/jpeg",
        name: "checkin.jpg",
      } as any);
      formData.append("activity", activity.trim());
      await submitCheckin(formData);
      Alert.alert(
        "✅ Check-in Submitted!",
        "Your study session has been recorded.",
        [{ text: "OK", onPress: () => router.replace("/(student)/home") }],
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to submit check-in",
      );
    } finally {
      setLoading(false);
    }
  };

  // Camera phase
  if (phase === "camera") {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.cameraBack}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>📸 Study Check-in</Text>
            </View>
            <View style={styles.cameraHint}>
              <Text style={styles.cameraHintText}>
                Take a selfie showing you're studying
              </Text>
              <Text style={styles.cameraHintSub}>
                Camera-only — no gallery uploads
              </Text>
            </View>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  // Form phase (with preview)
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={() => setPhase("camera")}>
          <Text style={styles.retake}>← Retake Photo</Text>
        </TouchableOpacity>
        <Text style={styles.formTitle}>Submit Check-in</Text>
      </View>

      {photoUri && (
        <Image
          source={{ uri: photoUri }}
          style={styles.preview}
          resizeMode="cover"
        />
      )}

      <View style={styles.formBody}>
        <Text style={styles.label}>What are you studying? *</Text>
        <TextInput
          style={styles.input}
          value={activity}
          onChangeText={setActivity}
          placeholder="e.g. Chapter 5 - Calculus, Physics problems, Reading history..."
          multiline
          numberOfLines={3}
          maxLength={200}
        />
        <Text style={styles.charCount}>{activity.length}/200</Text>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Check-in ✓</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.bg,
    padding: 24,
  },
  permText: { fontSize: 16, textAlign: "center", color: Colors.text },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 24,
  },
  btnText: { color: "#fff", fontWeight: "700" },

  // Camera
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  cameraHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  cameraBack: { color: "#fff", fontSize: 16 },
  cameraTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  cameraHint: { alignItems: "center" },
  cameraHintText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  cameraHintSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },

  // Form
  container: { flex: 1, backgroundColor: Colors.bg },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 24,
    paddingTop: 56,
  },
  retake: { color: Colors.primary, fontSize: 16 },
  formTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  preview: { width: "100%", height: 280 },
  formBody: { padding: 16, gap: 8 },
  label: { fontSize: 15, fontWeight: "600", color: Colors.text },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: "top",
    minHeight: 80,
  },
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: "right" },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
