import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { getCheckins, reviewCheckin } from '../../services/api';
import { Colors } from '../../constants/colors';
import { format } from 'date-fns';

export default function CheckinsScreen() {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const data = await getCheckins({ date: today });
    setCheckins(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleReview = async (status: 'approved' | 'rejected') => {
    setReviewing(true);
    try {
      await reviewCheckin(selected.id, { status, feedback: feedback.trim() || undefined });
      setSelected(null);
      setFeedback('');
      load();
    } catch {
      Alert.alert('Error', 'Failed to review check-in');
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.roles.teacher} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📸 Today's Check-ins</Text>
        <Text style={styles.sub}>{format(new Date(), 'MMMM d, yyyy')} · {checkins.length} submissions</Text>
      </View>

      <FlatList
        data={checkins}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => item.status === 'submitted' ? setSelected(item) : null}
            activeOpacity={item.status === 'submitted' ? 0.7 : 1}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.img} />
            <View style={styles.info}>
              <Text style={styles.studentName}>{item.studentName}</Text>
              <Text style={styles.activity}>{item.activity || 'No description'}</Text>
              <Text style={styles.time}>{format(new Date(item.submittedAt), 'hh:mm a')}</Text>
              <View style={[styles.badge,
                item.status === 'approved' ? styles.badgeApproved :
                item.status === 'rejected' ? styles.badgeRejected :
                styles.badgePending
              ]}>
                <Text style={styles.badgeText}>
                  {item.status === 'approved' ? '✅ Approved' : item.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                </Text>
              </View>
              {item.status === 'submitted' && (
                <Text style={styles.tapHint}>Tap to review →</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No check-ins today yet</Text>
          </View>
        }
      />

      {/* Review Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Review Check-in</Text>
          <Text style={styles.modalStudent}>{selected?.studentName}</Text>
          {selected?.imageUrl && (
            <Image source={{ uri: selected.imageUrl }} style={styles.modalImg} resizeMode="cover" />
          )}
          <Text style={styles.modalActivity}>{selected?.activity}</Text>

          <Text style={styles.feedbackLabel}>Feedback (optional)</Text>
          <TextInput
            style={styles.feedbackInput}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Add feedback for the student..."
            multiline
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.btnReject]}
              onPress={() => handleReview('rejected')}
              disabled={reviewing}
            >
              <Text style={styles.modalBtnText}>❌ Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.btnApprove]}
              onPress={() => handleReview('approved')}
              disabled={reviewing}
            >
              {reviewing ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>✅ Approve</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalClose} onPress={() => { setSelected(null); setFeedback(''); }}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
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
    backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', borderWidth: 1, borderColor: Colors.border,
  },
  img: { width: 100, height: 100 },
  info: { flex: 1, padding: 12, gap: 3 },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  activity: { fontSize: 13, color: Colors.textSecondary },
  time: { fontSize: 12, color: Colors.textMuted },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  badgeApproved: { backgroundColor: '#D1FAE5' },
  badgeRejected: { backgroundColor: '#FEE2E2' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  tapHint: { fontSize: 11, color: Colors.primary, marginTop: 2 },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary, marginTop: 12 },
  modal: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: Colors.bg },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  modalStudent: { fontSize: 16, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  modalImg: { width: '100%', height: 250, borderRadius: 14, marginVertical: 16 },
  modalActivity: { fontSize: 15, color: Colors.text, marginBottom: 16 },
  feedbackLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  feedbackInput: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border, minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnReject: { backgroundColor: Colors.danger },
  btnApprove: { backgroundColor: Colors.success },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalClose: { marginTop: 12, alignItems: 'center' },
  modalCloseText: { color: Colors.textSecondary, fontSize: 15 },
});
