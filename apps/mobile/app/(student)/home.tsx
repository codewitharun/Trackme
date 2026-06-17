import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getCheckins, getSummaries, getSchedules, punchIn, checkoutCheckin, submitCheckin } from '../../services/api';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';

type ModalType = 'punch-in' | 'punch-out' | 'photo' | null;
type CameraPhase = 'camera' | 'form';

export default function StudentHome() {
  const { profile, org, signOut } = useAuth();
  const router = useRouter();
  // Use UTC date — server stores dates in UTC, must match
  const today = new Date().toISOString().split('T')[0];

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayPunch, setTodayPunch] = useState<any>(null);      // single punch record
  const [photoChecks, setPhotoChecks] = useState<any[]>([]);   // multiple photo checks
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [schedules, setSchedules]   = useState<any[]>([]);

  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [phase, setPhase]             = useState<CameraPhase>('camera');
  const [photoUri, setPhotoUri]       = useState<string | null>(null);
  const [activity, setActivity]       = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef   = useRef<CameraView>(null);
  // Ref so handleSubmit always reads current modal type (avoids stale closure)
  const modalRef = useRef<ModalType>(null);

  const activityLabel = org?.activityLabel || 'Check-in';
  const reportLabel   = org?.reportLabel   || 'Daily Report';

  const load = useCallback(async () => {
    // Fetch independently so one failure doesn't wipe out the rest
    const [checkinsRes, summariesRes, schedsRes] = await Promise.allSettled([
      getCheckins({ date: today }),
      getSummaries({ date: today }),
      getSchedules(),
    ]);

    if (checkinsRes.status === 'fulfilled') {
      const all = checkinsRes.value;
      console.log('[HOME] checkins loaded:', all.length, 'date:', today);
      setTodayPunch(all.find((c: any) => c.type === 'punch') || null);
      setPhotoChecks(all.filter((c: any) => c.type === 'photo' || !c.type));
    } else {
      console.warn('[HOME] checkins failed:', checkinsRes.reason?.message);
    }
    if (summariesRes.status === 'fulfilled') {
      setTodaySummary(summariesRes.value[0] || null);
    }
    if (schedsRes.status === 'fulfilled') {
      setSchedules(schedsRes.value);
    }

    setLoading(false);
    setRefreshing(false);
  }, [today]);

  useEffect(() => { load(); }, []);

  // ── Camera helpers ─────────────────────────────────────────────────────────
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
      // Use ref so value is current even after setPhotoUri re-render
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
    // Read from ref — never stale
    const modalType = modalRef.current;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);

      if (modalType === 'punch-in') {
        const res = await punchIn(fd);
        // Optimistic update — don't wait for re-fetch
        setTodayPunch(res);
        setActiveModal(null);
        Alert.alert('✅ Punched In', 'Session started. Remember to punch out when done.');
      } else if (modalType === 'punch-out' && todayPunch) {
        const res = await checkoutCheckin(todayPunch.id, fd);
        // Optimistic update
        setTodayPunch((prev: any) => ({ ...prev, checkoutAt: res.checkoutAt, durationMins: res.durationMins }));
        setActiveModal(null);
        Alert.alert('🏁 Punched Out', `Session duration: ${res.durationMins} minutes`);
      } else if (modalType === 'photo') {
        if (!activity.trim()) { setSubmitting(false); Alert.alert('Required', 'Describe what you are doing'); return; }
        fd.append('activity', activity.trim());
        const res = await submitCheckin(fd);
        // Optimistic update — prepend to list
        setPhotoChecks((prev: any[]) => [res, ...prev]);
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
  const punchDurationMins = todayPunch && !todayPunch.checkoutAt
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

        {/* Streak */}
        <View style={styles.streakCard}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View>
            <Text style={styles.streakNum}>{profile?.streak || 0} Day Streak</Text>
            <Text style={styles.streakSub}>{profile?.totalCheckIns || 0} total photo checks</Text>
          </View>
        </View>

        {/* ── SECTION 1: Punch In / Punch Out ────────────────────────────── */}
        <Text style={styles.sectionTitle}>⏱ Session (Punch In / Out)</Text>
        <View style={styles.punchCard}>
          {!todayPunch ? (
            // Not punched in yet
            <>
              <Text style={styles.punchStatus}>No session today</Text>
              <Text style={styles.punchSub}>Take a selfie to start your session</Text>
              <TouchableOpacity style={styles.punchInBtn} onPress={() => openModal('punch-in')}>
                <Text style={styles.punchBtnText}>📸 Punch In</Text>
              </TouchableOpacity>
            </>
          ) : !todayPunch.checkoutAt ? (
            // Active session
            <>
              <View style={styles.punchActiveRow}>
                <View style={styles.punchDot} />
                <Text style={styles.punchActiveText}>Session Active</Text>
              </View>
              <Text style={styles.punchBig}>{punchDurationMins} min</Text>
              <Text style={styles.punchSub}>
                Started {format(new Date(todayPunch.submittedAt), 'hh:mm a')}
              </Text>
              <TouchableOpacity style={styles.punchOutBtn} onPress={() => openModal('punch-out')}>
                <Text style={styles.punchBtnText}>📸 Punch Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Session complete
            <>
              <Text style={styles.punchDoneIcon}>✅</Text>
              <Text style={styles.punchStatus}>Session Complete</Text>
              <Text style={styles.punchBig}>{todayPunch.durationMins} min</Text>
              <Text style={styles.punchSub}>
                {format(new Date(todayPunch.submittedAt), 'hh:mm a')} – {format(new Date(todayPunch.checkoutAt), 'hh:mm a')}
              </Text>
            </>
          )}
        </View>

        {/* ── SECTION 2: Photo Checks ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📸 Photo Checks</Text>
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <View>
              <Text style={styles.photoCount}>{photoChecks.length} today</Text>
              <Text style={styles.photoSub}>Multiple allowed · manual or via notification</Text>
            </View>
            <TouchableOpacity style={styles.photoBtn} onPress={() => openModal('photo')}>
              <Text style={styles.photoBtnText}>+ Add Photo</Text>
            </TouchableOpacity>
          </View>

          {photoChecks.length > 0 && (
            <View style={styles.photoList}>
              {photoChecks.map((c: any) => (
                <View key={c.id} style={styles.photoItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.photoActivity} numberOfLines={2}>{c.activity || '(no description)'}</Text>
                    <Text style={styles.photoTime}>{format(new Date(c.submittedAt), 'hh:mm a')}</Text>
                  </View>
                  <Text style={[
                    styles.photoStatus,
                    c.status === 'approved' ? { color: Colors.success } :
                    c.status === 'rejected' ? { color: Colors.danger } : { color: Colors.textSecondary },
                  ]}>
                    {c.status === 'approved' ? '✅' : c.status === 'rejected' ? '❌' : '⏳'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── SECTION 3: Today's Summary ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📝 {reportLabel}</Text>
        <TouchableOpacity
          style={[styles.summaryCard, todaySummary && { borderColor: Colors.success }]}
          onPress={() => router.push('/(student)/summary')}
        >
          <Text style={styles.summaryIcon}>{todaySummary ? '✅' : '📝'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>{todaySummary ? `${reportLabel} Submitted` : `Submit ${reportLabel}`}</Text>
            <Text style={styles.summarySub}>{todaySummary ? 'Tap to view or edit' : 'Due by 11:00 PM'}</Text>
          </View>
          <Text style={styles.summaryArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Schedule ────────────────────────────────────────────────────── */}
        {schedules.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📅 Today's Schedule</Text>
            {schedules.slice(0, 3).map((s: any) => (
              <View key={s.id} style={styles.scheduleItem}>
                <Text style={styles.scheduleTime}>{s.startTime} – {s.endTime}</Text>
                <Text style={styles.scheduleTitle}>{s.title}</Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Camera Modal (shared for all 3 actions) ───────────────────────── */}
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
                    {activeModal === 'photo'     && 'Snap a photo of what you\'re doing'}
                  </Text>
                  <Text style={styles.camHintSub}>Camera only — no uploads from gallery</Text>
                </View>
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          // Form phase — only for photo checks
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.formSheet} contentContainerStyle={{ padding: 24, paddingTop: 56, gap: 16 }}>
              <Text style={styles.formTitle}>📸 Photo Check</Text>
              <Text style={styles.formSub}>Photo captured. Describe what you're doing right now.</Text>
              <Text style={styles.label}>What are you working on? *</Text>
              <TextInput
                style={styles.textarea}
                value={activity}
                onChangeText={setActivity}
                placeholder="e.g. Chapter 5 revision, solving practice problems..."
                multiline
                numberOfLines={4}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={() => handleSubmit()}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Submit Photo Check ✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhase('camera')} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>↩ Retake Photo</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Submitting overlay for punch in/out (no form step) */}
      {submitting && (activeModal === 'punch-in' || activeModal === 'punch-out') && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.submittingText}>
            {activeModal === 'punch-in' ? 'Punching In...' : 'Punching Out...'}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 56 },
  greeting: { fontSize: 16, color: Colors.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text },
  orgTag: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  signOut: { color: Colors.danger, fontSize: 14, padding: 8 },

  // Streak
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.primary, margin: 16, borderRadius: 16, padding: 20 },
  streakIcon: { fontSize: 40 },
  streakNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  streakSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },

  // Punch card
  punchCard: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border },
  punchActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punchDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  punchActiveText: { fontSize: 14, fontWeight: '700', color: Colors.success },
  punchDoneIcon: { fontSize: 32 },
  punchStatus: { fontSize: 16, fontWeight: '600', color: Colors.text },
  punchBig: { fontSize: 40, fontWeight: '800', color: Colors.text },
  punchSub: { fontSize: 13, color: Colors.textSecondary },
  punchInBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  punchOutBtn: { backgroundColor: Colors.success, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  punchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Photo section
  photoSection: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.border },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoCount: { fontSize: 16, fontWeight: '700', color: Colors.text },
  photoSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  photoBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  photoBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  photoList: { marginTop: 12, gap: 8 },
  photoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  photoActivity: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  photoTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  photoStatus: { fontSize: 18, marginLeft: 8 },

  // Summary
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: Colors.border, gap: 12 },
  summaryIcon: { fontSize: 28 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  summarySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  summaryArrow: { fontSize: 24, color: Colors.textSecondary },

  // Schedule
  scheduleItem: { backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  scheduleTime: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  scheduleTitle: { fontSize: 15, color: Colors.text, fontWeight: '600', marginTop: 2 },

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

  // Form sheet
  formSheet: { flex: 1, backgroundColor: Colors.bg },
  formTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },
  formSub: { fontSize: 14, color: Colors.textSecondary },
  label: { fontSize: 15, fontWeight: '600', color: Colors.text },
  textarea: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.text, textAlignVertical: 'top', minHeight: 100 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  retakeBtn: { alignItems: 'center', padding: 12 },
  retakeBtnText: { color: Colors.textSecondary, fontSize: 14 },

  // Submitting overlay
  submittingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', gap: 16 },
  submittingText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
