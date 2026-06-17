import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { getCheckins, getSummaries, getSchedules, submitCheckin, checkoutCheckin } from '../../services/api';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';

type CheckinPhase = 'camera' | 'form';

export default function StudentHome() {
  const { profile, org, signOut } = useAuth();
  const router  = useRouter();
  const today   = format(new Date(), 'yyyy-MM-dd');

  // Data
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCheckins, setTodayCheckins] = useState<any[]>([]);
  const [todaySummary, setTodaySummary]   = useState<any>(null);
  const [schedules, setSchedules]         = useState<any[]>([]);
  const [checkingOut, setCheckingOut]     = useState(false);

  // Check-in modal
  const [showCheckin, setShowCheckin]     = useState(false);
  const [checkinPhase, setCheckinPhase]   = useState<CheckinPhase>('camera');
  const [photoUri, setPhotoUri]           = useState<string | null>(null);
  const [activity, setActivity]           = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [permission, requestPermission]   = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const activityLabel = org?.activityLabel || 'Check-in';
  const reportLabel   = org?.reportLabel   || 'Daily Report';

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

  useEffect(() => { load(); }, []);

  const activeSession = todayCheckins.find(c => !c.checkoutAt);

  const handleCheckout = async () => {
    if (!activeSession) return;
    setCheckingOut(true);
    try {
      const r = await checkoutCheckin(activeSession.id);
      Alert.alert('✅ Checked Out', `Session: ${r.durationMins} min`);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to check out');
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Check-in modal handlers ────────────────────────────────────────────────
  const openCheckin = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Required', 'Camera permission is needed for check-in.');
        return;
      }
    }
    setPhotoUri(null);
    setActivity('');
    setCheckinPhase('camera');
    setShowCheckin(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setCheckinPhase('form');
    }
  };

  const handleSubmitCheckin = async () => {
    if (!photoUri || !activity.trim()) {
      Alert.alert('Required', 'Describe what you are doing');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: photoUri, type: 'image/jpeg', name: 'checkin.jpg' } as any);
      formData.append('activity', activity.trim());
      await submitCheckin(formData);
      setShowCheckin(false);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

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
            <Text style={styles.streakSub}>{profile?.totalCheckIns || 0} total {activityLabel.toLowerCase()}s</Text>
          </View>
        </View>

        {/* Active session banner */}
        {activeSession && (
          <View style={styles.activeBanner}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>
              Session active since {format(new Date(activeSession.submittedAt), 'hh:mm a')}
            </Text>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout} disabled={checkingOut}>
              {checkingOut
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.checkoutBtnText}>Check Out</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Status */}
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusCard, { borderColor: todayCheckins.length > 0 ? Colors.success : Colors.border }]}>
            <Text style={styles.statusIcon}>{todayCheckins.length > 0 ? '✅' : '📸'}</Text>
            <Text style={styles.statusLabel}>{activityLabel}s</Text>
            <Text style={styles.statusValue}>{todayCheckins.length}</Text>
          </View>
          <View style={[styles.statusCard, { borderColor: todaySummary ? Colors.success : Colors.border }]}>
            <Text style={styles.statusIcon}>{todaySummary ? '✅' : '📝'}</Text>
            <Text style={styles.statusLabel}>{reportLabel}</Text>
            <Text style={styles.statusValue}>{todaySummary ? 'Done' : 'Pending'}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, !!activeSession && styles.actionDisabled]}
            onPress={() => !activeSession && openCheckin()}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>{activeSession ? 'In Session' : activityLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(student)/summary')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>{todaySummary ? `View ${reportLabel}` : reportLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(student)/schedule')}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule */}
        {schedules.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {schedules.slice(0, 3).map((s: any) => (
              <View key={s.id} style={styles.scheduleItem}>
                <Text style={styles.scheduleTime}>{s.startTime} – {s.endTime}</Text>
                <Text style={styles.scheduleTitle}>{s.title}</Text>
              </View>
            ))}
          </>
        )}

        {/* Today's check-ins */}
        {todayCheckins.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's {activityLabel}s</Text>
            {todayCheckins.map((c: any) => (
              <View key={c.id} style={styles.checkinItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkinActivity}>{c.activity || 'Session'}</Text>
                  {c.durationMins != null
                    ? <Text style={styles.checkinMeta}>⏱ {c.durationMins} min</Text>
                    : !c.checkoutAt && <Text style={styles.checkinMeta}>🟢 Active</Text>}
                </View>
                <Text style={[
                  styles.checkinStatus,
                  c.status === 'approved' ? { color: Colors.success } :
                  c.status === 'rejected' ? { color: Colors.danger } : { color: Colors.textSecondary },
                ]}>
                  {c.status === 'approved' ? '✅ Approved' : c.status === 'rejected' ? '❌ Rejected' : '⏳ Review'}
                </Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Check-in Modal ────────────────────────────────────────────────── */}
      <Modal visible={showCheckin} animationType="slide" onRequestClose={() => setShowCheckin(false)}>
        {checkinPhase === 'camera' ? (
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
                  <Text style={styles.camHintText}>Take a photo to confirm your session</Text>
                  <Text style={styles.camHintSub}>Camera only — no gallery uploads</Text>
                </View>
                <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.formSheet} contentContainerStyle={{ padding: 24, paddingTop: 48, gap: 16 }}>
              <Text style={styles.formTitle}>{activityLabel} Details</Text>
              <Text style={styles.formSub}>Photo taken ✅ — describe what you're doing.</Text>

              <Text style={styles.label}>What are you {org?.participantRole === 'Employee' ? 'working on' : 'studying'}? *</Text>
              <TextInput
                style={styles.textarea}
                value={activity}
                onChangeText={setActivity}
                placeholder={`e.g. Chapter 5 revision, React Native…`}
                multiline
                numberOfLines={4}
                autoFocus
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmitCheckin}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>Submit {activityLabel} ✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCheckinPhase('camera')} style={styles.retakeBtn}>
                <Text style={styles.retakeBtnText}>↩ Retake Photo</Text>
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
  greeting: { fontSize: 16, color: Colors.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text },
  orgTag: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  signOut: { color: Colors.danger, fontSize: 14, padding: 8 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: Colors.primary, margin: 16, borderRadius: 16, padding: 20 },
  streakIcon: { fontSize: 40 },
  streakNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  streakSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ECFDF5', marginHorizontal: 16, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: Colors.success },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  activeText: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },
  checkoutBtn: { backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  checkoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  statusRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  statusCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2 },
  statusIcon: { fontSize: 28 },
  statusLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  statusValue: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  actionBtn: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionDisabled: { opacity: 0.4 },
  actionIcon: { fontSize: 28 },
  actionLabel: { fontSize: 12, color: Colors.text, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  scheduleItem: { backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  scheduleTime: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  scheduleTitle: { fontSize: 15, color: Colors.text, fontWeight: '600', marginTop: 2 },
  checkinItem: { backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkinActivity: { fontSize: 14, color: Colors.text },
  checkinMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  checkinStatus: { fontSize: 13, fontWeight: '600' },
  // Camera modal
  camOverlay: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 56, paddingBottom: 48, backgroundColor: 'rgba(0,0,0,0.3)' },
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
  retakeBtnText: { color: Colors.textSecondary, fontSize: 15 },
});
