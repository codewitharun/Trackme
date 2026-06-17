import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { deactivateUser, listUsers, registerUser } from '../../services/api';

type InternalRole = 'student' | 'teacher' | 'admin';

export default function UsersScreen() {
  const { profile, org } = useAuth();
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [roleFilter, setRoleFilter] = useState<InternalRole>('student');
  const [showAdd, setShowAdd]   = useState(false);
  const [adding, setAdding]     = useState(false);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole]   = useState<InternalRole>('student');
  const [supervisorId, setSupervisorId] = useState('');
  const [supervisors, setSupervisors]   = useState<any[]>([]);

  // Dynamic display labels from org config
  const labels = {
    student:  org?.participantRole  || 'Student',
    teacher:  org?.supervisorRole   || 'Teacher',
    admin:    org?.adminRole        || 'Admin',
  };

  const load = async (role: InternalRole = roleFilter) => {
    setLoading(true);
    try {
      const data = await listUsers({ role });
      setUsers(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = async () => {
    // Load supervisors for assigning to participants
    try {
      const svs = await listUsers({ role: 'teacher' });
      setSupervisors(svs);
    } catch {}
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Validation', 'Fill all fields. Password must be 6+ characters.');
      return;
    }
    setAdding(true);
    try {
      await registerUser({
        name: name.trim(), email: email.trim(),
        password, role: newRole,
        supervisorId: newRole === 'student' ? supervisorId : undefined,
      });
      Alert.alert(`✅ ${labels[newRole]} Created`);
      setShowAdd(false);
      setName(''); setEmail(''); setPassword(''); setSupervisorId('');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = (uid: string, uname: string) => {
    Alert.alert('Deactivate', `Deactivate ${uname}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: async () => { await deactivateUser(uid); load(); } },
    ]);
  };

  const ROLE_COLORS: Record<string, string> = {
    student: Colors.primary, teacher: Colors.roles.teacher, admin: Colors.roles.admin,
  };

  const TABS: InternalRole[] = ['student', 'teacher', 'admin'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>👥 Users</Text>
          {org && <Text style={styles.orgName}>{org.icon} {org.name}</Text>}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.tab, roleFilter === r && styles.tabActive]}
            onPress={() => { setRoleFilter(r); load(r); }}
          >
            <Text style={[styles.tabText, roleFilter === r && styles.tabTextActive]}>
              {labels[r]}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color={Colors.roles.admin} size="large" /></View>
        : (
          <FlatList
            data={users}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[item.role] || Colors.primary }]}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userRole}>{labels[item.role as InternalRole]}</Text>
                  {item.role === 'student' && (
                    <Text style={styles.userStats}>🔥 {item.streak || 0} · 📸 {item.totalCheckIns || 0}</Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <View style={[styles.statusDot, item.isActive ? styles.dotActive : styles.dotInactive]} />
                  {item.isActive && (
                    <TouchableOpacity onPress={() => handleDeactivate(item.id, item.name)}>
                      <Text style={styles.deactivateBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No {labels[roleFilter]}s yet</Text>
              </View>
            }
          />
        )}

      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <ScrollView style={styles.modal} contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
          <Text style={styles.modalTitle}>Add User</Text>

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {TABS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, newRole === r && styles.roleBtnActive]}
                onPress={() => setNewRole(r)}
              >
                <Text style={[styles.roleBtnText, newRole === r && styles.roleBtnTextActive]}>
                  {labels[r]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            placeholder="Email" keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            placeholder="6+ characters" secureTextEntry />

          {newRole === 'student' && supervisors.length > 0 && (
            <>
              <Text style={styles.label}>Assign {labels.teacher}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.svBtn, !supervisorId && styles.svBtnActive]}
                    onPress={() => setSupervisorId('')}
                  >
                    <Text style={[styles.svBtnText, !supervisorId && { color: '#fff' }]}>None</Text>
                  </TouchableOpacity>
                  {supervisors.map(sv => (
                    <TouchableOpacity
                      key={sv.id}
                      style={[styles.svBtn, supervisorId === sv.id && styles.svBtnActive]}
                      onPress={() => setSupervisorId(sv.id)}
                    >
                      <Text style={[styles.svBtnText, supervisorId === sv.id && { color: '#fff' }]}>
                        {sv.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: Colors.roles.admin }, adding && { opacity: 0.7 }]}
            onPress={handleAdd} disabled={adding}
          >
            {adding
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Create {labels[newRole]}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.cancel}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  orgName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: Colors.roles.admin, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, gap: 8 },
  tab: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.roles.admin, borderColor: Colors.roles.admin },
  tabText: { fontWeight: '600', color: Colors.textSecondary, fontSize: 13 },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: 13, color: Colors.textSecondary },
  userRole: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 1 },
  userStats: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardActions: { alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: Colors.success },
  dotInactive: { backgroundColor: Colors.danger },
  deactivateBtn: { color: Colors.danger, fontSize: 18, padding: 4 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  modal: { flex: 1, padding: 24, paddingTop: 40, backgroundColor: Colors.bg },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text },
  input: { backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, fontSize: 16 },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  roleBtnActive: { backgroundColor: Colors.roles.admin, borderColor: Colors.roles.admin },
  roleBtnText: { fontWeight: '600', color: Colors.textSecondary, fontSize: 13 },
  roleBtnTextActive: { color: '#fff' },
  svBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  svBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  svBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  submitBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancel: { alignItems: 'center', padding: 12 },
  cancelText: { color: Colors.textSecondary, fontSize: 15 },
});
