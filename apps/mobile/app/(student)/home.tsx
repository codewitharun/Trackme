import { format } from "date-fns";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../hooks/useAuth";
import {
  checkoutCheckin,
  getCheckins,
  getSchedules,
  getSummaries,
  submitCheckin,
} from "../../services/api";

type CheckinPhase = "camera" | "form";

export default function StudentHome() {
  const { profile, org, signOut } = useAuth();
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);

  // Check-in modal
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinPhase, setCheckinPhase] = useState<CheckinPhase>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [activity, setActivity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const activityLabel = org?.activityLabel || "Check-in";
  const reportLabel = org?.reportLabel || "Daily Report";

  const load = useCallback(async () => {
    try {
      const [checkins, summaries, scheds] = await Promise.all([
        getCheckins({ date: today }),
        getSummaries({ date: today }),
        getSchedules(),
      ]);
      setTodayCheckins(checkins);
      setTodaySummary(summaries[0] || null);
      setSchedules(scheds);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [today]);

  useEffect(() => {
    load();
  }, []);

  const activeSession = todayCheckins.find((c) => !c.checkoutAt);

  // ── Check-in ───────────────────────────────────────────────────────────────
  const openCheckin = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Camera Required",
          "Camera permission is needed for check-in.",
        );
        return;
      }
    }
    setPhotoUri(null);
    setActivity("");
    setCheckinPhase("camera");
    setShowCheckin(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setCheckinPhase("form");
    }
  };

  const handleSubmitCheckin = async () => {
    if (!photoUri || !activity.trim()) {
      Alert.alert("Required", "Describe what you are doing");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", {
        uri: photoUri,
        type: "image/jpeg",
        name: "checkin.jpg",
      } as any);
      formData.append("activity", activity.trim());
      await submitCheckin(formData);
      setShowCheckin(false);
      load();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Check-out ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!activeSession) return;
    setCheckingOut(true);
    try {
      const result = await checkoutCheckin(activeSession.id);
      setShowCheckout(false);
      Alert.alert(
        "✅ Checked Out",
        `Session duration: ${result.durationMins} minutes`,
      );
      load();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to check out");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const sessionDuration = activeSession
    ? Math.round(
        (Date.now() - new Date(activeSession.submittedAt).getTime()) / 60000,
      )
    : 0;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{profile?.name} 👋</Text>
            {org && (
              <Text style={styles.orgTag}>
                {org.icon} {org.name}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOut}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View>
            <Text style={styles.streakNum}>
              {profile?.streak || 0} Day Streak
            </Text>
            <Text style={styles.streakSub}>
              {profile?.totalCheckIns || 0} total {activityLabel.toLowerCase()}s
            </Text>
          </View>
        </View>

        {/* Active session banner */}
        {activeSession && (
          <View style={styles.activeBanner}>
            <View>
              <Text style={styles.activeTitle}>🟢 Session Active</Text>
              <Text style={styles.activeSub}>
                Started {format(new Date(activeSession.submittedAt), "hh:mm a")}{" "}
                · {sessionDuration} min
              </Text>
              <Text style={styles.activeActivity} numberOfLines={1}>
                {activeSession.activity}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => setShowCheckout(true)}
            >
              <Text style={styles.checkoutBtnText}>Check Out</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusCard,
              {
                borderColor:
                  todayCheckins.length > 0 ? Colors.success : Colors.border,
              },
            ]}
          >
            <Text style={styles.statusIcon}>
              {todayCheckins.length > 0 ? "✅" : "📸"}
            </Text>
            <Text style={styles.statusLabel}>{activityLabel}s</Text>
            <Text style={styles.statusValue}>{todayCheckins.length}</Text>
          </View>
          <View
            style={[
              styles.statusCard,
              { borderColor: todaySummary ? Colors.success : Colors.border },
            ]}
          >
            <Text style={styles.statusIcon}>{todaySummary ? "✅" : "📝"}</Text>
            <Text style={styles.statusLabel}>{reportLabel}</Text>
            <Text style={styles.statusValue}>
              {todaySummary ? "Done" : "Pending"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, !!activeSession && styles.actionDisabled]}
            onPress={() => !activeSession && openCheckin()}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>
              {activeSession ? "In Session" : activityLabel}
            </Text>
          </TouchableOpacity>

          {/* Check-out — always visible, grayed when no active session */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              activeSession ? { borderColor: Colors.success } : styles.actionDisabled,
            ]}
            onPress={() => activeSession && setShowCheckout(true)}
          >
            <Text style={styles.actionIcon}>🏁</Text>
            <Text style={[styles.actionLabel, activeSession ? { color: Colors.success } : {}]}>
              Check Out
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(student)/summary")}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>
              {todaySummary ? `View ${reportLabel}` : reportLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(student)/schedule")}
          >
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {schedules.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {schedules.slice(0, 3).map((s: any) => (
              <View key={s.id} style={styles.scheduleItem}>
                <Text style={styles.scheduleTime}>
                  {s.startTime} – {s.endTime}
                </Text>
                <Text style={styles.scheduleTitle}>{s.title}</Text>
              </View>
            ))}
          </>
        )}

        {todayCheckins.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's {activityLabel}s</Text>
            {todayCheckins.map((c: any) => (
              <View key={c.id} style={styles.checkinItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkinActivity}>
                    {c.activity || "Session"}
                  </Text>
                  {c.checkoutAt ? (
                    <Text style={styles.checkinMeta}>
                      ⏱ {c.durationMins} min ·{" "}
                      {format(new Date(c.submittedAt), "hh:mm a")} –{" "}
                      {format(new Date(c.checkoutAt), "hh:mm a")}
                    </Text>
                  ) : (
                    <Text
                      style={[styles.checkinMeta, { color: Colors.success }]}
                    >
                      🟢 Active
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.checkinStatus,
                    c.status === "approved"
                      ? { color: Colors.success }
                      : c.status === "rejected"
                        ? { color: Colors.danger }
                        : { color: Colors.textSecondary },
                  ]}
                >
                  {c.status === "approved"
                    ? "✅"
                    : c.status === "rejected"
                      ? "❌"
                      : "⏳"}
                </Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Check-in Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showCheckin}
        animationType="slide"
        onRequestClose={() => setShowCheckin(false)}
      >
        {checkinPhase === "camera" ? (
          <View style={{ flex: 1 }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
              <View style={styles.camOverlay}>
                <View style={styles.camHeader}>
                  <TouchableOpacity onPress={() => setShowCheckin(false)}>
                    <Text style={styles.camBack}>✕ Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.camTitle}>📸 {activityLabel}</Text>
                </View>
                <View style={styles.camHint}>
                  <Text style={styles.camHintText}>
                    Take a selfie to confirm your session
                  </Text>
                  <Text style={styles.camHintSub}>
                    Camera only — no gallery uploads
                  </Text>
                </View>
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              style={styles.formSheet}
              contentContainerStyle={{ padding: 24, paddingTop: 48, gap: 16 }}
            >
              <Text style={styles.formTitle}>{activityLabel}</Text>
              <Text style={styles.formSub}>
                📸 Photo captured — describe what you're doing.
              </Text>
              <Text style={styles.label}>What are you working on? *</Text>
              <TextInput
                style={styles.textarea}
                value={activity}
                onChangeText={setActivity}
                placeholder="e.g. Chapter 5 revision, React Native..."
                multiline
                numberOfLines={4}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmitCheckin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Start Session ✓</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCheckinPhase("camera")}
                style={styles.retakeBtn}
              >
                <Text style={styles.retakeBtnText}>↩ Retake Photo</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* ── Check-out Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showCheckout}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckout(false)}
      >
        <View style={styles.checkoutOverlay}>
          <View style={styles.checkoutSheet}>
            <Text style={styles.checkoutTitle}>End Session?</Text>
            {activeSession && (
              <>
                <Text style={styles.checkoutActivity}>
                  {activeSession.activity}
                </Text>
                <View style={styles.checkoutStats}>
                  <View style={styles.checkoutStat}>
                    <Text style={styles.checkoutStatVal}>
                      {sessionDuration}
                    </Text>
                    <Text style={styles.checkoutStatLabel}>minutes</Text>
                  </View>
                  <View style={styles.checkoutStat}>
                    <Text style={styles.checkoutStatVal}>
                      {format(new Date(activeSession.submittedAt), "hh:mm a")}
                    </Text>
                    <Text style={styles.checkoutStatLabel}>started</Text>
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: Colors.success },
                checkingOut && { opacity: 0.7 },
              ]}
              onPress={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>✓ Confirm Check Out</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCheckout(false)}
              style={styles.retakeBtn}
            >
              <Text style={styles.retakeBtnText}>
                Cancel — Keep Session Active
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingTop: 56,
  },
  greeting: { fontSize: 16, color: Colors.textSecondary },
  name: { fontSize: 24, fontWeight: "800", color: Colors.text },
  orgTag: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  signOut: { color: Colors.danger, fontSize: 14, padding: 8 },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  streakIcon: { fontSize: 40 },
  streakNum: { fontSize: 20, fontWeight: "800", color: "#fff" },
  streakSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.success,
    marginBottom: 4,
  },
  activeTitle: { fontSize: 14, fontWeight: "700", color: Colors.success },
  activeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activeActivity: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
    maxWidth: 200,
  },
  checkoutBtn: {
    backgroundColor: Colors.success,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  statusRow: { flexDirection: "row", gap: 12, marginHorizontal: 16 },
  statusCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
  },
  statusIcon: { fontSize: 28 },
  statusLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  statusValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    minWidth: "22%",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionDisabled: { opacity: 0.4 },
  actionIcon: { fontSize: 26 },
  actionLabel: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  scheduleItem: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  scheduleTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  scheduleTitle: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600",
    marginTop: 2,
  },
  checkinItem: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  checkinActivity: { fontSize: 14, color: Colors.text, fontWeight: "600" },
  checkinMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  checkinStatus: { fontSize: 18, marginLeft: 8 },
  // Camera
  camOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 56,
    paddingBottom: 48,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  camHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  camBack: { color: "#fff", fontSize: 16, fontWeight: "600" },
  camTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  camHint: { alignItems: "center" },
  camHintText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  camHintSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 },
  captureBtn: {
    alignSelf: "center",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  // Form sheet
  formSheet: { flex: 1, backgroundColor: Colors.bg },
  formTitle: { fontSize: 24, fontWeight: "800", color: Colors.text },
  formSub: { fontSize: 14, color: Colors.textSecondary },
  label: { fontSize: 15, fontWeight: "600", color: Colors.text },
  textarea: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: "top",
    minHeight: 100,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  retakeBtn: { alignItems: "center", padding: 12 },
  retakeBtnText: { color: Colors.textSecondary, fontSize: 14 },
  // Checkout modal
  checkoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  checkoutSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 48,
    gap: 16,
  },
  checkoutTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  checkoutActivity: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: -8,
  },
  checkoutStats: { flexDirection: "row", gap: 24, marginVertical: 8 },
  checkoutStat: { alignItems: "center" },
  checkoutStatVal: { fontSize: 28, fontWeight: "800", color: Colors.text },
  checkoutStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
