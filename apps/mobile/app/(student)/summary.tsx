import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { getSummaries, submitSummary } from '../../services/api';

const MOODS = [
  { emoji: '😊', label: 'Great',  value: 'great' },
  { emoji: '🙂', label: 'Good',   value: 'good'  },
  { emoji: '😐', label: 'Okay',   value: 'okay'  },
  { emoji: '😔', label: 'Tired',  value: 'tired' },
];

export default function SummaryScreen() {
  const { org } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const reportLabel = org?.reportLabel || 'Daily Summary';

  const [summaries, setSummaries]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null); // null = new
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent]       = useState('');
  const [studyHours, setStudyHours] = useState('');
  const [topics, setTopics]         = useState('');
  const [mood, setMood]             = useState('');

  // Detail view modal
  const [detailItem, setDetailItem] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const data = await getSummaries();
      setSummaries(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  // trigger on first render
  if (loading && summaries.length === 0) { load(); }

  const openForm = (existing?: any) => {
    setEditTarget(existing || null);
    setContent(existing?.content || '');
    setStudyHours(existing ? String(existing.studyHours || '') : '');
    setTopics((existing?.topics || []).join(', '));
    setMood(existing?.mood || '');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!content.trim()) { Alert.alert('Required', 'Write your summary'); return; }
    if (!studyHours || isNaN(parseFloat(studyHours))) { Alert.alert('Required', 'Enter hours studied'); return; }
    setSubmitting(true);
    try {
      const result = await submitSummary({
        content: content.trim(),
        studyHours: parseFloat(studyHours),
        topics: topics.split(',').map(t => t.trim()).filter(Boolean),
        mood,
      });
      setModalOpen(false);
      Alert.alert('✅ Submitted', `Streak: ${result.streak} days 🔥`);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const todaySummary = summaries.find(s => s.date === today);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>📝 {reportLabel}s</Text>
          <Text style={styles.sub}>{summaries.length} total submitted</Text>
        </View>

        {/* Today's summary CTA */}
        <View style={[styles.todayCard, todaySummary && { borderColor: Colors.success }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayLabel}>
              {todaySummary ? `Today's ${reportLabel}` : `Today's ${reportLabel}`}
            </Text>
            <Text style={styles.todaySub}>
              {todaySummary
                ? `${todaySummary.studyHours}h · ${MOODS.find(m => m.value === todaySummary.mood)?.emoji || ''} · ${todaySummary.isOnTime ? '🕙 On time' : '⚠️ Late'}`
                : 'Due by 11:00 PM'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.ctaBtn, todaySummary && { backgroundColor: Colors.success }]}
            onPress={() => todaySummary ? openForm(todaySummary) : openForm()}
          >
            <Text style={styles.ctaBtnText}>{todaySummary ? '✏️ Edit' : '+ Submit'}</Text>
          </TouchableOpacity>
        </View>

        {/* History list */}
        {summaries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No summaries yet</Text>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => openForm()}>
              <Text style={styles.ctaBtnText}>Submit Today's</Text>
            </TouchableOpacity>
          </View>
        )}

        {summaries.map(item => (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => setDetailItem(item)}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardMood}>
                {MOODS.find(m => m.value === item.mood)?.emoji || '📝'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardDate}>
                {format(new Date(item.date + 'T12:00:00Z'), 'EEE, MMM d')}
              </Text>
              <Text style={styles.cardHours}>{item.studyHours}h studied</Text>
              {item.feedback && (
                <Text style={styles.cardFeedback} numberOfLines={1}>💬 {item.feedback}</Text>
              )}
            </View>
            <View style={styles.cardRight}>
              <Text style={[
                styles.cardStatus,
                item.rating ? { color: Colors.success } : { color: Colors.textSecondary },
              ]}>
                {item.rating ? `⭐ ${item.rating}/5` : item.isOnTime ? '✅' : '⚠️'}
              </Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Submit / Edit Form Modal ──────────────────────────────── */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setModalOpen(false)}>
        <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 48, gap: 14 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editTarget ? `Edit ${reportLabel}` : `Today's ${reportLabel}`}
            </Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>How did your day go? *</Text>
          <TextInput
            style={styles.textarea}
            value={content}
            onChangeText={setContent}
            placeholder="What did you study or work on today?"
            multiline
            numberOfLines={5}
          />

          <Text style={styles.label}>Hours studied *</Text>
          <TextInput
            style={styles.input}
            value={studyHours}
            onChangeText={setStudyHours}
            placeholder="e.g. 3.5"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Topics covered</Text>
          <TextInput
            style={styles.input}
            value={topics}
            onChangeText={setTopics}
            placeholder="e.g. Maths, Physics (comma separated)"
          />

          <Text style={styles.label}>Mood</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.value}
                style={[styles.moodBtn, mood === m.value && styles.moodBtnActive]}
                onPress={() => setMood(m.value)}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>{editTarget ? 'Update' : 'Submit'} {reportLabel}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {/* ── Detail View Modal ─────────────────────────────────────── */}
      <Modal visible={!!detailItem} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setDetailItem(null)}>
        {detailItem && (
          <ScrollView style={styles.modal} contentContainerStyle={{ paddingBottom: 48, gap: 14 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {format(new Date(detailItem.date + 'T12:00:00Z'), 'EEEE, MMM d')}
              </Text>
              <TouchableOpacity onPress={() => setDetailItem(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailMeta}>
              <Text style={styles.detailMetaItem}>
                {MOODS.find(m => m.value === detailItem.mood)?.emoji || '📝'} {MOODS.find(m => m.value === detailItem.mood)?.label || ''}
              </Text>
              <Text style={styles.detailMetaItem}>⏱ {detailItem.studyHours}h</Text>
              <Text style={styles.detailMetaItem}>{detailItem.isOnTime ? '🕙 On time' : '⚠️ Late'}</Text>
            </View>

            {detailItem.topics?.length > 0 && (
              <>
                <Text style={styles.label}>Topics</Text>
                <View style={styles.topicsRow}>
                  {detailItem.topics.map((t: string) => (
                    <View key={t} style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Summary</Text>
            <Text style={styles.detailContent}>{detailItem.content}</Text>

            {detailItem.feedback ? (
              <>
                <Text style={styles.label}>Teacher Feedback</Text>
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackText}>💬 {detailItem.feedback}</Text>
                  {detailItem.rating && <Text style={styles.feedbackRating}>⭐ {detailItem.rating}/5</Text>}
                  {detailItem.reviewedAt && (
                    <Text style={styles.feedbackTime}>{format(new Date(detailItem.reviewedAt), 'MMM d, hh:mm a')}</Text>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>⏳ Waiting for teacher feedback</Text>
              </View>
            )}

            {detailItem.date === today && (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => { setDetailItem(null); openForm(detailItem); }}
              >
                <Text style={styles.submitBtnText}>✏️ Edit This Summary</Text>
              </TouchableOpacity>
            )}
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
  todayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 16, borderWidth: 2, borderColor: Colors.primary, gap: 12 },
  todayLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  todaySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  ctaBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardLeft: { width: 40, alignItems: 'center' },
  cardMood: { fontSize: 28 },
  cardDate: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardHours: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardFeedback: { fontSize: 12, color: Colors.primary, marginTop: 3 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardStatus: { fontSize: 13, fontWeight: '600' },
  cardArrow: { fontSize: 22, color: Colors.textSecondary },
  empty: { alignItems: 'center', padding: 60, gap: 16 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  // Modal
  modal: { flex: 1, backgroundColor: Colors.bg, padding: 24, paddingTop: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalClose: { fontSize: 20, color: Colors.textSecondary, padding: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, fontSize: 15 },
  textarea: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, fontSize: 15, textAlignVertical: 'top', minHeight: 120 },
  moodRow: { flexDirection: 'row', gap: 10 },
  moodBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  moodBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
  moodLabelActive: { color: Colors.primary },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Detail
  detailMeta: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  detailMetaItem: { fontSize: 14, fontWeight: '600', color: Colors.text },
  topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: { backgroundColor: Colors.primary + '20', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  topicChipText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  detailContent: { fontSize: 15, color: Colors.text, lineHeight: 24 },
  feedbackBox: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary, gap: 6 },
  feedbackText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  feedbackRating: { fontSize: 14, fontWeight: '700', color: Colors.text },
  feedbackTime: { fontSize: 12, color: Colors.textSecondary },
  pendingBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14 },
  pendingText: { fontSize: 14, color: '#92400E' },
});
