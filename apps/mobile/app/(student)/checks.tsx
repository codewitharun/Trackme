import { useCallback, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { getCheckins } from '../../services/api';
import { format } from 'date-fns';

const STATUS_COLOR: Record<string, string> = {
  approved: Colors.success,
  rejected: '#EF4444',
  submitted: Colors.textSecondary,
};
const STATUS_LABEL: Record<string, string> = {
  approved: '✅ Approved',
  rejected: '❌ Rejected',
  submitted: '⏳ Pending',
};

export default function ChecksScreen() {
  const { org } = useAuth();
  const [checks, setChecks]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]   = useState<any>(null);

  const activityLabel = org?.activityLabel || 'Check-in';

  const load = useCallback(async () => {
    try {
      // Fetch last 30 days of photo checks
      const all = await getCheckins({ type: 'photo' });
      setChecks(all);
    } catch (e) {
      console.warn('[CHECKS]', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // group by date
  const grouped: Record<string, any[]> = {};
  checks.forEach(c => {
    const d = c.date || c.submittedAt?.split('T')[0] || 'unknown';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(c);
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    // trigger load on first render
    load();
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>📸 {activityLabel}s</Text>
          <Text style={styles.sub}>{checks.length} total · tap to see feedback</Text>
        </View>

        {dates.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No photo checks yet</Text>
          </View>
        )}

        {dates.map(date => (
          <View key={date}>
            <Text style={styles.dateHeader}>
              {format(new Date(date + 'T12:00:00Z'), 'EEEE, MMM d')}
            </Text>
            {grouped[date].map(item => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => setSelected(item)}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 20 }}>📷</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.activity} numberOfLines={2}>{item.activity || '(no description)'}</Text>
                  <Text style={styles.time}>{format(new Date(item.submittedAt), 'hh:mm a')}</Text>
                  {item.feedback && (
                    <Text style={styles.feedbackPreview} numberOfLines={1}>💬 {item.feedback}</Text>
                  )}
                </View>
                <Text style={[styles.status, { color: STATUS_COLOR[item.status] || Colors.textSecondary }]}>
                  {STATUS_LABEL[item.status] || '⏳'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <ScrollView style={styles.detail} contentContainerStyle={{ paddingBottom: 48 }}>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.detailClose}>
              <Text style={styles.detailCloseText}>✕ Close</Text>
            </TouchableOpacity>

            {selected.imageUrl && (
              <Image source={{ uri: selected.imageUrl }} style={styles.detailImage} resizeMode="cover" />
            )}

            <View style={styles.detailBody}>
              <Text style={styles.detailDate}>
                {format(new Date(selected.submittedAt), 'EEEE, MMM d · hh:mm a')}
              </Text>

              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[selected.status] + '22' }]}>
                <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[selected.status] }]}>
                  {STATUS_LABEL[selected.status] || '⏳ Pending review'}
                </Text>
              </View>

              <Text style={styles.detailSectionLabel}>What you were doing</Text>
              <Text style={styles.detailContent}>{selected.activity || '(no description)'}</Text>

              {selected.feedback && (
                <>
                  <Text style={styles.detailSectionLabel}>Teacher Feedback</Text>
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackText}>💬 {selected.feedback}</Text>
                    {selected.reviewedAt && (
                      <Text style={styles.feedbackTime}>
                        {format(new Date(selected.reviewedAt), 'MMM d, hh:mm a')}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {!selected.feedback && selected.status === 'submitted' && (
                <View style={styles.pendingBox}>
                  <Text style={styles.pendingText}>⏳ Waiting for teacher review</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  dateHeader: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border },
  thumb: { width: 60, height: 60, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  activity: { fontSize: 14, fontWeight: '600', color: Colors.text, flexShrink: 1 },
  time: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  feedbackPreview: { fontSize: 12, color: Colors.primary, marginTop: 3 },
  status: { fontSize: 12, fontWeight: '600', textAlign: 'right', minWidth: 70 },
  empty: { alignItems: 'center', padding: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  // Detail
  detail: { flex: 1, backgroundColor: Colors.bg },
  detailClose: { padding: 20, paddingTop: 24 },
  detailCloseText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  detailImage: { width: '100%', height: 260 },
  detailBody: { padding: 20, gap: 12 },
  detailDate: { fontSize: 14, color: Colors.textSecondary },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  statusBadgeText: { fontSize: 14, fontWeight: '700' },
  detailSectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  detailContent: { fontSize: 16, color: Colors.text, lineHeight: 24 },
  feedbackBox: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary, gap: 6 },
  feedbackText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  feedbackTime: { fontSize: 12, color: Colors.textSecondary },
  pendingBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14 },
  pendingText: { fontSize: 14, color: '#92400E' },
});
