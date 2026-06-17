import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert,
} from 'react-native';
import { getSummaries, addFeedback } from '../../services/api';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';

const RATINGS = ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
const MOOD_EMOJI: Record<string, string> = { great: '😊', good: '🙂', okay: '😐', tired: '😔' };

export default function SummariesScreen() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    getSummaries({ date: today }).then(setSummaries).finally(() => setLoading(false));
  }, []);

  const handleFeedback = async () => {
    if (!feedback.trim()) return Alert.alert('Required', 'Please write feedback');
    setSubmitting(true);
    try {
      await addFeedback(selected.id, { feedback: feedback.trim(), rating: rating || null });
      Alert.alert('✅ Feedback sent');
      setSelected(null);
      setFeedback('');
      setRating(0);
      const data = await getSummaries({ date: today });
      setSummaries(data);
    } catch {
      Alert.alert('Error', 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.roles.teacher} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Daily Summaries</Text>
        <Text style={styles.sub}>{format(new Date(), 'MMMM d')} · {summaries.length} submitted</Text>
      </View>

      <FlatList
        data={summaries}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.studentName}>{item.studentName}</Text>
              <Text style={styles.mood}>{MOOD_EMOJI[item.mood] || '—'}</Text>
            </View>
            <Text style={styles.content} numberOfLines={2}>{item.content}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.hours}>⏱ {item.studyHours}h studied</Text>
              <Text style={[styles.timing, item.isOnTime ? styles.onTime : styles.late]}>
                {item.isOnTime ? '✅ On time' : '⚠️ Late'}
              </Text>
            </View>
            {item.feedback ? (
              <Text style={styles.hasFeedback}>Feedback given ✓</Text>
            ) : (
              <Text style={styles.needsFeedback}>Tap to give feedback →</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No summaries submitted yet today</Text>
          </View>
        }
      />

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📝 {selected?.studentName}'s Summary</Text>
            <TouchableOpacity onPress={() => { setSelected(null); setFeedback(''); setRating(0); }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalMeta}>
            {selected?.studyHours}h studied · {MOOD_EMOJI[selected?.mood] || ''} {selected?.mood}
            {selected?.isOnTime ? ' · ✅ On time' : ' · ⚠️ Late'}
          </Text>

          <Text style={styles.fieldLabel}>Summary</Text>
          <Text style={styles.fieldValue}>{selected?.content}</Text>

          {selected?.topics?.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Topics</Text>
              <Text style={styles.fieldValue}>{selected.topics.join(', ')}</Text>
            </>
          )}

          {selected?.feedback ? (
            <>
              <Text style={styles.fieldLabel}>Your Feedback</Text>
              <Text style={[styles.fieldValue, { color: Colors.primary }]}>{selected.feedback}</Text>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Rate this session</Text>
              <View style={styles.ratingRow}>
                {RATINGS.map((r, i) => (
                  <TouchableOpacity key={i} onPress={() => setRating(i + 1)}>
                    <Text style={[styles.ratingStar, i < rating && styles.ratingActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Feedback *</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Write encouraging feedback..."
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleFeedback} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Feedback</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 56 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  studentName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  mood: { fontSize: 22 },
  content: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  hours: { fontSize: 13, color: Colors.textSecondary },
  timing: { fontSize: 13, fontWeight: '600' },
  onTime: { color: Colors.success },
  late: { color: Colors.warning },
  hasFeedback: { fontSize: 12, color: Colors.success },
  needsFeedback: { fontSize: 12, color: Colors.primary },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 17, color: Colors.textSecondary, marginTop: 12 },
  modal: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, flex: 1 },
  close: { fontSize: 20, color: Colors.textSecondary },
  modalMeta: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, color: Colors.text, marginTop: 4, lineHeight: 22 },
  ratingRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ratingStar: { fontSize: 28, opacity: 0.3 },
  ratingActive: { opacity: 1 },
  feedbackInput: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top', marginTop: 8,
  },
  submitBtn: { backgroundColor: Colors.roles.teacher, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
