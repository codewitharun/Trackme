import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { getSchedules, createSchedule, deleteSchedule } from '../../services/api';
import { Colors } from '../../constants/colors';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function TeacherScheduleScreen() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);

  const load = async () => {
    const data = await getSchedules();
    setSchedules(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleDay = (d: string) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleCreate = async () => {
    if (!title.trim() || !startTime || !endTime || selectedDays.length === 0) {
      Alert.alert('Required', 'Fill all required fields and select at least one day');
      return;
    }
    setCreating(true);
    try {
      await createSchedule({ title: title.trim(), description: desc.trim(), startTime, endTime, days: selectedDays });
      Alert.alert('✅ Schedule Created');
      setShowCreate(false);
      setTitle(''); setDesc('');
      load();
    } catch {
      Alert.alert('Error', 'Failed to create schedule');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Schedule', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSchedule(id); load(); } },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.roles.teacher} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 Schedules</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={schedules}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTime}>
              <Text style={styles.time}>{item.startTime}</Text>
              <Text style={styles.timeSep}>–</Text>
              <Text style={styles.time}>{item.endTime}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.schedTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.schedDesc}>{item.description}</Text> : null}
              <Text style={styles.schedDays}>{item.days?.join(', ')}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.title)}>
              <Text style={styles.deleteBtn}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No schedules yet</Text>
          </View>
        }
      />

      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
          <Text style={styles.modalTitle}>Create Schedule</Text>

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Morning Study Block" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="Optional description" />

          <Text style={styles.label}>Start Time (HH:MM)</Text>
          <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" keyboardType="numbers-and-punctuation" />

          <Text style={styles.label}>End Time (HH:MM)</Text>
          <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="11:00" keyboardType="numbers-and-punctuation" />

          <Text style={styles.label}>Days *</Text>
          <View style={styles.daysRow}>
            {DAYS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dayBtn, selectedDays.includes(d) && styles.daySelected]}
                onPress={() => toggleDay(d)}
              >
                <Text style={[styles.dayText, selectedDays.includes(d) && styles.dayTextSelected]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Schedule</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 56 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  addBtn: { backgroundColor: Colors.roles.teacher, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  cardTime: { alignItems: 'center' },
  time: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  timeSep: { color: Colors.textMuted, fontSize: 12 },
  schedTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  schedDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  schedDays: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  deleteBtn: { fontSize: 22, padding: 4 },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 17, color: Colors.textSecondary, marginTop: 12 },
  modal: { flex: 1, padding: 24, paddingTop: 40, backgroundColor: Colors.bg },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, fontSize: 16,
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  daySelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontWeight: '600', color: Colors.text, fontSize: 13 },
  dayTextSelected: { color: '#fff' },
  submitBtn: { backgroundColor: Colors.roles.teacher, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancel: { alignItems: 'center', padding: 12 },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
