import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, Alert,
} from 'react-native';
import { listUsers, registerUser } from '../../services/api';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function StudentsScreen() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const data = await listUsers({ role: 'student' });
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Validation', 'Fill all fields. Password must be 6+ characters.');
      return;
    }
    setAdding(true);
    try {
      await registerUser({ name: name.trim(), email: email.trim(), password, role: 'student', teacherId: profile?.uid });
      Alert.alert('✅ Student Added');
      setShowAdd(false);
      setName(''); setEmail(''); setPassword('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.roles.teacher} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 My Students</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add Student</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={students}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentEmail}>{item.email}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.stat}>🔥 {item.streak || 0} streak</Text>
                <Text style={styles.stat}>📸 {item.totalCheckIns || 0} check-ins</Text>
                <Text style={[styles.active, item.isActive ? styles.activeOn : styles.activeOff]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No students yet</Text>
            <Text style={styles.emptySub}>Tap "Add Student" to get started</Text>
          </View>
        }
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Student</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password (6+ chars)" secureTextEntry />
          <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={adding}>
            {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Student</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  studentName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  studentEmail: { fontSize: 13, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' },
  stat: { fontSize: 12, color: Colors.textSecondary },
  active: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, borderRadius: 8, paddingVertical: 1 },
  activeOn: { backgroundColor: '#D1FAE5', color: Colors.success },
  activeOff: { backgroundColor: '#FEE2E2', color: Colors.danger },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  modal: { flex: 1, padding: 24, paddingTop: 40, backgroundColor: Colors.bg, gap: 12 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, fontSize: 16,
  },
  submitBtn: { backgroundColor: Colors.roles.teacher, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancel: { alignItems: 'center', padding: 12 },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
