import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getCheckins, getSummaries, punchIn, checkoutCheckin, submitCheckin } from '../../services/api';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';

const QUOTES = [
  "Small steps every day lead to big results. 💪",
  "Consistency beats perfection. Show up today. 🌟",
  "Your future self is watching — make them proud. 🚀",
  "One focused hour beats ten distracted ones. ⚡",
  "Progress, not perfection. Keep going. 🔥",
  "Every expert was once a beginner. Stay curious. 🧠",
  "The secret of getting ahead is getting started. ✨",
];

type ModalType = 'punch-in' | 'punch-out' | 'photo' | null;
type CameraPhase = 'camera' | 'form';

export default function StudentHome() {
  const { profile, org, signOut } = useAuth();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [todayPunch, setTodayPunch]   = useState<any>(null);
  const [photoCount, setPhotoCount]   = useState(0);
  const [todaySummary, setTodaySummary] = useState<any>(null);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [phase, setPhase]             = useState<CameraPhase>('camera');
  const [photoUri, setPhotoUri]       = useState<string | null>(null);
  const [activity, setActivity]       = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef  = useRef<CameraView>(null);
  const modalRef   = useRef<ModalType>(null);

  const activityLabel = org?.activityLabel || 'Check-in';
  const reportLabel   = org?.reportLabel   || 'Daily Report';
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const load = useCallback(async () => {
    const [checkinsRes, summariesRes] = await Promise.allSettled([
      getCheckins({ date: today }),
      getSummaries({ date: today }),
    ]);
    if (checkinsRes.status === 'fulfilled') {
      const all = checkinsRes.value;
      setTodayPunch(all.find((c: any) => c.type === 'punch') || null);
      setPhotoCount(all.filter((c: any) => c.type === 'photo' || !c.type).length);
    }
    if (summariesRes.status === 'fulfilled') {
      setTodaySummary(summariesRes.value[0] || null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [today]);

  useEffect(() => { load(); }, []);

  const openModal = async (type: ModalType) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Camera Required', 'Camera permission is needed.'); return; }
    }
    modalRef.current = type;
    setPhotoUri(null); setActivity(''); setPhase('camera'); setActiveModal(type);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      if (modalRef.current === 'photo') {
        setPhotoUri(photo.uri);
        setPhase('form');
      } else {
        handleSubmit(photo.uri);
      }
    }
  };

  const handleSubmit = async (uri?: string) => {
    const imageUri = uri || photoUri;
    if (!imageUri) return;
    const modalType = modalRef.current;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);

      if (modalType === 'punch-in') {
        const res = await punchIn(fd);
        setTodayPunch(res);
        setActiveModal(null);
        Alert.alert('✅ Punched In', 'Session started!');
      } else if (modalType === 'punch-out' && todayPunch) {
        const res = await checkoutCheckin(todayPunch.id, fd);
        setTodayPunch((prev: any) => ({ ...prev, checkoutAt: res.checkoutAt, durationMins: res.durationMins }));
        setActiveModal(null);
        Alert.alert('🏁 Punched Out', `Session: ${res.durationMins} minutes`);
      } else if (modalType === 'photo') {
        if (!activity.trim()) { setSubmitting(false); Alert.alert('Required', 'Describe what you are doing'); return; }
        fd.append('activity', activity.trim());
        await submitCheckin(fd);
        setPhotoCount(n => n + 1);
        setActiveModal(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const punchMins = todayPunch && !todayPunch.checkoutAt
    ? Math.round((Date.now() - new Date(todayPunch.submittedAt).getTime()) / 60000)
    : todayPunch?.durationMins || 0;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{profile?.name} 👋</Text>
            {org && <Text style={styles.orgTag}>{org.icon} {org.name}</Text>}
          </View>
          <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign Out</Text></TouchableOpacity>
        </View>

        {/* Streak + quote */}
        <View style={styles.streakCard}>
          <View style={styles.streakRow}>
            <Text style={styles.streakIcon}>🔥</Text>
            <View>
              <Text style={styles.streakNum}>{profile?.streak || 0} Day Streak</Text>
              <Text style={styles.streakSub}>{profile?.totalCheckIns || 0} total checks</Text>
            </View>
          </View>
          <Text style={styles.quote}>"{quote}"</Text>
        </View>

        {/* ── Punch In / Out ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>⏱ Session</Text>
        <View style={styles.punchCard}>
          {!todayPunch ? (
            <View style={styles.punchRow}>
              <View>
                <Text style={styles.punchLabel}>No session yet</Text>
                <Text style={styles.punchSub}>Selfie required to start</Text>
              </View>
              <TouchableOpacity style={styles.punchInBtn} onPress={() => openModal('punch-in')}>
                <Text style={styles.punchBtnText}>📸 Punch In</Text>
              </TouchableOpacity>
            </View>
          ) : !todayPunch.checkoutAt ? (
            <View style={styles.punchRow}>
              <View>
                <View style={styles.punchActiveRow}>
                  <View style={styles.punchDot} />
                  <Text style={styles.punchActiveLabel}>Active · {punchMins} min</Text>
                </View>
                <Text style={styles.punchSub}>Since {format(new Date(todayPunch.submittedAt), 'hh:mm a')}</Text>
              </View>
              <TouchableOpacity style={styles.punchOutBtn} onPress={() => openModal('punch-out')}>
                <Text style={styles.punchBtnText}>📸 Punch Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.punchRow}>
              <View>
                <Text style={styles.punchDoneLabel}>✅ Session Complete</Text>
                <Text style={styles.punchSub}>
                  {format(new Date(todayPunch.submittedAt), 'hh:mm a')} – {format(new Date(todayPunch.checkoutAt), 'hh:mm a')} · {todayPunch.durationMins} min
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Today's Stats ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📊 Today</Text>
        <View style={styles.statsRow}>
          {/* Photo checks */}
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(student)/checks')}>
            <Text style={styles.statNum}>{photoCount}</Text>
            <Text style={styles.statLabel}>Photo Checks</Text>
            <Text style={styles.statAction}>View →</Text>
          </TouchableOpacity>

          {/* Summary */}
          <TouchableOpacity
            style={[styles.statCard, todaySummary && { borderColor: Colors.success }]}
            onPress={() => router.push('/(student)/summary')}
          >
            <Text style={styles.statNum}>{todaySummary ? '✅' : '📝'}</Text>
            <Text style={styles.statLabel}>{reportLabel}</Text>
            <Text style={[styles.statAction, !todaySummary && { color: Colors.danger }]}>
              {todaySummary ? 'View →' : 'Submit →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('photo')}>
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>{activityLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(student)/summary')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>{todaySummary ? 'View Summary' : 'Add Summary'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(student)/checks')}>
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionLabel}>My Checks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(student)/schedule')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Camera Modal ─────────────────────────────────────────── */}
      <Modal visible={!!activeModal} animationType="slide" onRequestClose={() => setActiveModal(null)}>
        {phase === 'camera' ? (
          <View style={{ flex: 1 }}>
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
              <View style={styles.camOverlay}>
                <View style={styles.camHeader}>
                  <TouchableOpacity onPress={() => setActiveModal(null)}>
                    <Text style={styles.camBack}>✕ Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.camTitle}>
                    {activeModal === 'punch-in'  && '📸 Punch In'}
                    {activeModal === 'punch-out' && '📸 Punch Out'}
                    {activeModal === 'photo'     && '📸 Photo Check'}
                  </Text>
                </View>
                <View style={styles.camHint}>
                  <Text style={styles.camHintText}>
                    {activeModal === 'punch-in'  && 'Take a selfie to start your session'}
                    {activeModal === 'punch-out' && 'Take a selfie to end your session'}
                    {activeModal === 'photo'     && "Snap what you're working on"}
                  </Text>
                  <Text style={styles.camHintSub}>Camera only — no uploads from gallery</Text>
                </View>
                {submitting
                  ? <ActivityIndicator color="#fff" size="large" style={{ alignSelf: 'center' }} />
                  : (
                    <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                      <View style={styles.captureInner} />
                    </TouchableOpacity>
                  )}
              </View>
            </CameraView>
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.formSheet} contentContainerStyle={{ padding: 24, paddingTop: 56, gap: 16 }}>
              <Text style={styles.formTitle}>📸 Photo Check</Text>
              <Text style={styles.formSub}>Photo captured. What are you working on?</Text>
              <TextInput
                style={styles.textarea}
                value={activity}
                onChangeText={setActivity}
                placeholder="e.g. Chapter 5 revision, solving problems..."
                multiline
                numberOfLines={4}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={() => handleSubmit()}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit ✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhase('camera')} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>↩ Retake</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 56 },
  greeting: { fontSize: 15, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text },
  orgTag: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  signOut: { color: Colors.danger, fontSize: 14, padding: 8 },
  streakCard: { backgroundColor: Colors.primary, margin: 16, borderRadius: 16, padding: 20, gap: 12 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakIcon: { fontSize: 36 },
  streakNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  streakSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  quote: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  // Punch card
  punchCard: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: Colors.border },
  punchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  punchLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  punchSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  punchActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  punchActiveLabel: { fontSize: 15, fontWeight: '700', color: Colors.success },
  punchDoneLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  punchInBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  punchOutBtn: { backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  punchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.border },
  statNum: { fontSize: 28, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  statAction: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, flexWrap: 'wrap' },
  actionBtn: { flex: 1, minWidth: '22%', backgroundColor: Colors.white, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 11, color: Colors.text, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  // Camera
  camOverlay: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 56, paddingBottom: 48, backgroundColor: 'rgba(0,0,0,0.35)' },
  camHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  camBack: { color: '#fff', fontSize: 16, fontWeight: '600' },
  camTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  camHint: { alignItems: 'center' },
  camHintText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  camHintSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  captureBtn: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  formSheet: { flex: 1, backgroundColor: Colors.bg },
  formTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  formSub: { fontSize: 14, color: Colors.textSecondary },
  textarea: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.text, textAlignVertical: 'top', minHeight: 100 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  retakeBtn: { alignItems: 'center', padding: 12 },
  retakeBtnText: { color: Colors.textSecondary, fontSize: 14 },
});
