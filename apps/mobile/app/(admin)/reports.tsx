import { format, subDays } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { getAnalytics } from '../../services/api';

export default function ReportsScreen() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'today' | '7d' | '30d'>('today');

  const loadReport = async (r: 'today' | '7d' | '30d') => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    let from = today;
    if (r === '7d') from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    if (r === '30d') from = format(subDays(new Date(), 29), 'yyyy-MM-dd');

    try {
      const data = await getAnalytics({ from, to: today });
      setAnalytics(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadReport('today'); }, []);

  const RANGES = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
  ] as const;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Reports</Text>
      </View>

      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.rangeBtn, range === r.key && styles.rangeBtnActive]}
            onPress={() => { setRange(r.key); loadReport(r.key); }}
          >
            <Text style={[styles.rangeBtnText, range === r.key && styles.rangeBtnTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.roles.admin} size="large" /></View>
      ) : analytics ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {range === 'today' ? 'Today' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </Text>
            <Text style={styles.summaryPeriod}>{analytics.period.from} → {analytics.period.to}</Text>

            <View style={styles.metricsGrid}>
              <Metric label="Total Students" value={analytics.totalStudents} icon="👥" />
              <Metric label="Total Check-ins" value={analytics.checkins.total} icon="📸" />
              <Metric label="Approved" value={analytics.checkins.approved} icon="✅" />
              <Metric label="Summaries" value={analytics.summaries.total} icon="📝" />
              <Metric label="On-time" value={analytics.summaries.onTime} icon="🎯" />
              <Metric label="Avg Study Hours" value={`${analytics.avgStudyHours}h`} icon="⏱" />
            </View>
          </View>

          {/* Engagement rate */}
          {analytics.totalStudents > 0 && (
            <View style={styles.rateCard}>
              <Text style={styles.rateTitle}>Engagement Rates</Text>
              <RateBar
                label="Check-in Rate"
                value={analytics.checkins.total}
                total={analytics.totalStudents * (range === 'today' ? 1 : range === '7d' ? 7 : 30)}
                color={Colors.primary}
              />
              <RateBar
                label="Summary Submission Rate"
                value={analytics.summaries.total}
                total={analytics.totalStudents * (range === 'today' ? 1 : range === '7d' ? 7 : 30)}
                color={Colors.success}
              />
              <RateBar
                label="On-time Submission Rate"
                value={analytics.summaries.onTime}
                total={Math.max(analytics.summaries.total, 1)}
                color={Colors.warning}
              />
            </View>
          )}

          {analytics.topStudents?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
              {analytics.topStudents.map((s: any, i: number) => (
                <View key={s.name} style={styles.leaderItem}>
                  <Text style={styles.leaderRank}>{['🥇', '🥈', '🥉', '#4', '#5'][i]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaderName}>{s.name}</Text>
                    <Text style={styles.leaderSub}>🔥 {s.streak} day streak · 📸 {s.totalCheckIns} total check-ins</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      ) : (
        <View style={styles.center}><Text style={styles.errorText}>Failed to load report</Text></View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Metric({ label, value, icon }: { label: string; value: any; icon: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function RateBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={styles.rateBarItem}>
      <View style={styles.rateBarHeader}>
        <Text style={styles.rateBarLabel}>{label}</Text>
        <Text style={styles.rateBarPct}>{pct}%</Text>
      </View>
      <View style={styles.rateBarBg}>
        <View style={[styles.rateBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { padding: 24, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  rangeRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 16 },
  rangeBtn: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  rangeBtnActive: { backgroundColor: Colors.roles.admin, borderColor: Colors.roles.admin },
  rangeBtnText: { fontWeight: '600', color: Colors.textSecondary },
  rangeBtnTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: Colors.white, margin: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.border },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  summaryPeriod: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '30%', alignItems: 'center', padding: 10 },
  metricIcon: { fontSize: 24 },
  metricValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  metricLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  rateCard: { backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 16, padding: 20, gap: 16, borderWidth: 1, borderColor: Colors.border },
  rateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  rateBarItem: { gap: 6 },
  rateBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rateBarLabel: { fontSize: 13, color: Colors.textSecondary },
  rateBarPct: { fontSize: 13, fontWeight: '700', color: Colors.text },
  rateBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  rateBarFill: { height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  leaderItem: { backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border },
  leaderRank: { fontSize: 24 },
  leaderName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  leaderSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  errorText: { color: Colors.textSecondary, fontSize: 16 },
});
