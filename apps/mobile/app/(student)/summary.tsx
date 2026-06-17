import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { getSummaries, submitSummary } from '../../services/api';

const MOODS = [
  { emoji: '😊', label: 'Great', value: 'great' },
  { emoji: '🙂', label: 'Good', value: 'good' },
  { emoji: '😐', label: 'Okay', value: 'okay' },
  { emoji: '😔', label: 'Tired', value: 'tired' },
];

export default function SummaryScreen() {
  const router = useRouter();
  const [existing, setExisting] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [content, setContent] = useState('');
  const [studyHours, setStudyHours] = useState('');
  const [topics, setTopics] = useState('');
  const [mood, setMood] = useState('');

  const today = new Date().toISOString().split('T')[0]; // UTC — matches server

  useEffect(() => {
    getSummaries({ date: today })
      .then((summaries: any[]) => {
        if (summaries.length > 0) {
          const s = summaries[0];
          setExisting(s);
          // Pre-fill form for editing
          setContent(s.content || '');
          setStudyHours(String(s.studyHours || ''));
          setTopics((s.topics || []).join(', '));
          setMood(s.mood || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please write your study summary');
      return;
    }
    if (!studyHours || isNaN(parseFloat(studyHours))) {
      Alert.alert('Required', 'Please enter hours studied');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitSummary({
        content: content.trim(),
        studyHours: parseFloat(studyHours),
        topics: topics.split(',').map(t => t.trim()).filter(Boolean),
        mood,
      });
      const streakMsg = result.streak > 1 ? ` 🔥 ${result.streak}-day streak!` : '';
      Alert.alert(
        existing ? '✅ Summary Updated!' : (result.isOnTime ? '✅ Summary Submitted!' : '⚠️ Late Submission'),
        `Your study summary has been saved.${streakMsg}`,
        [{ text: 'OK', onPress: () => router.replace('/(student)/home') }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save summary');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  const deadline = new Date();
  deadline.setHours(23, 0, 0, 0);
  const minsLeft = Math.floor((deadline.getTime() - Date.now()) / 60000);

  // Read-only view (submitted, not editing)
  if (existing && !editMode) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Today's Summary</Text>
          <TouchableOpacity onPress={() => setEditMode(true)}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.submittedCard}>
          <Text style={styles.submittedIcon}>✅</Text>
          <Text style={styles.submittedTitle}>Submitted</Text>
          <Text style={styles.submittedAt}>
            {format(new Date(existing.submittedAt), 'hh:mm a')}
            {existing.isOnTime ? ' · on time' : ' · late'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.field}>Summary</Text>
          <Text style={styles.value}>{existing.content}</Text>
          <Text style={styles.field}>Hours Studied</Text>
          <Text style={styles.value}>{existing.studyHours}h</Text>
          {existing.topics?.length > 0 && (
            <>
              <Text style={styles.field}>Topics</Text>
              <Text style={styles.value}>{existing.topics.join(', ')}</Text>
            </>
          )}
          {existing.mood && (
            <>
              <Text style={styles.field}>Mood</Text>
              <Text style={styles.value}>
                {MOODS.find(m => m.value === existing.mood)?.emoji} {MOODS.find(m => m.value === existing.mood)?.label}
              </Text>
            </>
          )}
          {existing.feedback && (
            <>
              <Text style={styles.field}>Teacher Feedback</Text>
              <Text style={[styles.value, { color: Colors.primary }]}>{existing.feedback}</Text>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  // Form view (new or editing)
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => existing ? setEditMode(false) : router.back()}>
          <Text style={styles.back}>← {existing ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{existing ? 'Edit Summary' : 'Daily Summary'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {minsLeft < 120 && minsLeft > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⏰ {minsLeft} minutes until 11 PM deadline!</Text>
        </View>
      )}

      <View style={styles.formBody}>
        <Text style={styles.label}>What did you study today? *</Text>
        <TextInput
          style={styles.textarea}
          value={content}
          onChangeText={setContent}
          placeholder="Describe your study session..."
          multiline
          numberOfLines={5}
          maxLength={1000}
        />
        <Text style={styles.charCount}>{content.length}/1000</Text>

        <Text style={styles.label}>Hours Studied *</Text>
        <TextInput
          style={styles.input}
          value={studyHours}
          onChangeText={setStudyHours}
          placeholder="e.g. 3.5"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Topics Covered (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={topics}
          onChangeText={setTopics}
          placeholder="e.g. Calculus, Physics, English"
        />

        <Text style={styles.label}>How was your day?</Text>
        <View style={styles.moodRow}>
          {MOODS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.moodBtn, mood === m.value && styles.moodSelected]}
              onPress={() => setMood(m.value)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, mood === m.value && { color: Colors.primary }]}>{m.label}</Text>
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
            : <Text style={styles.submitBtnText}>{existing ? 'Update Summary ✓' : 'Submit Summary ✓'}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 56 },
  back: { color: Colors.primary, fontSize: 16 },
  editBtn: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  warningBanner: { backgroundColor: Colors.warning, marginHorizontal: 16, borderRadius: 12, padding: 12 },
  warningText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  formBody: { padding: 16, gap: 8 },
  label: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 8 },
  textarea: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.text,
    textAlignVertical: 'top', minHeight: 120,
  },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.text,
  },
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  moodRow: { flexDirection: 'row', gap: 10 },
  moodBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  moodSelected: { borderColor: Colors.primary, backgroundColor: '#EEF2FF' },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submittedCard: {
    alignItems: 'center', backgroundColor: Colors.white, margin: 16,
    borderRadius: 16, padding: 24, borderWidth: 2, borderColor: Colors.success,
  },
  submittedIcon: { fontSize: 48 },
  submittedTitle: { fontSize: 20, fontWeight: '800', color: Colors.success, marginTop: 8 },
  submittedAt: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: Colors.white, margin: 16, borderRadius: 16, padding: 20, gap: 4 },
  field: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginTop: 12 },
  value: { fontSize: 15, color: Colors.text },
});
