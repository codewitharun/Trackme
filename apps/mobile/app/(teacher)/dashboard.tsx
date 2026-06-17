import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getAnalytics, getMissingSummaries, triggerCheckinAlert } from '../../services/api';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [missing, setMissing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([getAnalytics(), getMissingSummaries()]);
      setAnalytics(a);
      setMissing(m);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  const sendAlert = async () => {
    Alert.prompt('Send Check-in Alert', 'Message to send students (or leave blank for default)', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async (msg) => {
          try {
            const r = await triggerCheckinAlert(msg || undefined);
            Alert.alert('✅ Sent', `Notified ${r.recipients} students`);
          } catch {
            Alert.alert('Error', 'Failed to send alert');
          }
        },
      },
    ], 'plain-text');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.roles.teacher} size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Teacher Dashboard</Text>
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>
        <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign Out</Text></TouchableOpacity>
      </View>

      {/* Alert button */}
      <TouchableOpacity style={styles.alertBtn} onPress={sendAlert}>
        <Text style={styles.alertBtnText}>📢 Send Check-in Alert to Students</Text>
      </TouchableOpacity>

      {/* Stats */}
      {analytics && (
        <>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total Students" value={analytics.totalStudents} icon="👥" />
            <StatCard label="Check-ins" value={analytics.checkins.total} icon="📸" />
            <StatCard label="Summaries" value={analytics.summaries.total} icon="📝" />
            <StatCard label="Avg Study Hrs" value={`${analytics.avgStudyHours}h`} icon="⏱" />
          </View>

          {/* Missing summaries */}
          {missing?.count > 0 && (
            <>
              <Text style={styles.sectionTitle}>⚠️ Missing Summaries ({missing.count})</Text>
              {missing.missing.slice(0, 5).map((s: any) => (
                <View key={s.id} style={styles.missingItem}>
                  <Text style={styles.missingName}>{s.name}</Text>
                  <Text style={styles.missingBadge}>No summary</Text>
                </View>
              ))}
            </>
          )}

          {/* Top students */}
          {analytics.topStudents?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🏆 Top Students (Streak)</Text>
              {analytics.topStudents.map((s: any, i: number) => (
                <View key={s.name} style={styles.topStudentItem}>
                  <Text style={styles.topStudentRank}>{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topStudentName}>{s.name}</Text>
                    <Text style={styles.topStudentSub}>🔥 {s.streak} streak · 📸 {s.totalCheckIns} check-ins</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({ label, value, icon }: { label: string; value: any; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 56 },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: Colors.text },
  date: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  signOut: { color: Colors.danger, fontSize: 14, paddingTop: 4 },
  alertBtn: {
    backgroundColor: Colors.roles.teacher, marginHorizontal: 16, borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 8,
  },
  alertBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16 },
  statCard: {
    width: '47%', backgroundColor: Colors.white, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: { fontSize: 28 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  missingItem: {
    backgroundColor: '#FEF2F2', marginHorizontal: 16, marginBottom: 6,
    borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: Colors.danger,
  },
  missingName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  missingBadge: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  topStudentItem: {
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  topStudentRank: { fontSize: 24 },
  topStudentName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  topStudentSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
