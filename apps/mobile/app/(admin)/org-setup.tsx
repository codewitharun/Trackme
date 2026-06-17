import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { ORG_PRESETS, OrgPreset } from '../../constants/orgPresets';
import { createOrg } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function OrgSetupScreen() {
  const router = useRouter();
  const { refreshOrg } = useAuth();
  const [step, setStep] = useState<'preset' | 'form'>('preset');
  const [selected, setSelected] = useState<OrgPreset | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [orgName, setOrgName]               = useState('');
  const [purpose, setPurpose]               = useState('');
  const [adminRole, setAdminRole]           = useState('');
  const [supervisorRole, setSupervisorRole] = useState('');
  const [participantRole, setParticipantRole] = useState('');
  const [activityLabel, setActivityLabel]   = useState('');
  const [reportLabel, setReportLabel]       = useState('');

  const pickPreset = (preset: OrgPreset) => {
    setSelected(preset);
    setPurpose(preset.purpose);
    setAdminRole(preset.adminRole);
    setSupervisorRole(preset.supervisorRole);
    setParticipantRole(preset.participantRole);
    setActivityLabel(preset.activityLabel);
    setReportLabel(preset.reportLabel);
    setStep('form');
  };

  const handleSave = async () => {
    if (!orgName.trim()) return Alert.alert('Required', 'Enter your organisation name');
    if (!supervisorRole.trim() || !participantRole.trim())
      return Alert.alert('Required', 'Supervisor and participant role names are required');
    setSaving(true);
    try {
      await createOrg({
        name: orgName.trim(),
        type: selected?.key || 'custom',
        typeLabel: selected?.label || 'Custom',
        icon: selected?.icon || '🏢',
        purpose: purpose.trim(),
        adminRole: adminRole.trim() || 'Admin',
        supervisorRole: supervisorRole.trim(),
        participantRole: participantRole.trim(),
        activityLabel: activityLabel.trim() || 'Check-in',
        reportLabel: reportLabel.trim() || 'Daily Report',
      });
      await refreshOrg();
      router.replace('/(admin)/dashboard');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create organisation');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: pick preset ────────────────────────────────────────────────────
  if (step === 'preset') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
        <Text style={styles.heading}>Set Up Your Organisation</Text>
        <Text style={styles.sub}>
          Choose a preset to auto-fill role names, or start from scratch with Custom.
        </Text>

        <View style={styles.presetGrid}>
          {ORG_PRESETS.map(p => (
            <TouchableOpacity key={p.key} style={styles.presetCard} onPress={() => pickPreset(p)}>
              <Text style={styles.presetIcon}>{p.icon}</Text>
              <Text style={styles.presetLabel}>{p.label}</Text>
              <Text style={styles.presetSub}>{p.supervisorRole} → {p.participantRole}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ── Step 2: fill details ───────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 48 }}>
      <TouchableOpacity onPress={() => setStep('preset')} style={{ marginBottom: 8 }}>
        <Text style={styles.back}>← Change Type</Text>
      </TouchableOpacity>

      <View style={styles.selectedBadge}>
        <Text style={styles.selectedIcon}>{selected?.icon}</Text>
        <Text style={styles.selectedLabel}>{selected?.label}</Text>
      </View>

      <Text style={styles.heading}>Organisation Details</Text>
      <Text style={styles.sub}>You can always edit these later from settings.</Text>

      <Field label="Organisation Name *" value={orgName} onChange={setOrgName} placeholder="e.g. Greenwood Academy" />
      <Field label="Purpose / Description" value={purpose} onChange={setPurpose}
        placeholder="What does your organisation do?" multiline />

      <Text style={styles.sectionHeader}>Role Names</Text>
      <Text style={styles.sectionNote}>
        These labels replace "Admin / Teacher / Student" throughout the app.
      </Text>

      <Field label={`Admin is called`} value={adminRole} onChange={setAdminRole} placeholder="Principal, Director, Owner…" />
      <Field label={`Supervisor is called`} value={supervisorRole} onChange={setSupervisorRole} placeholder="Teacher, Manager, Coach…" />
      <Field label={`Participant is called`} value={participantRole} onChange={setParticipantRole} placeholder="Student, Employee, Trainee…" />

      <Text style={styles.sectionHeader}>Activity Labels</Text>
      <Field label="Check-in is called" value={activityLabel} onChange={setActivityLabel} placeholder="Study Check-in, Work Check-in…" />
      <Field label="Daily report is called" value={reportLabel} onChange={setReportLabel} placeholder="Daily Summary, Standup, Log…" />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Create Organisation →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  heading: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  back: { color: Colors.primary, fontSize: 15, marginBottom: 16 },
  selectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.primary, marginBottom: 20,
  },
  selectedIcon: { fontSize: 28 },
  selectedLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  presetCard: {
    width: '47%', backgroundColor: Colors.white, borderRadius: 14,
    padding: 18, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  presetIcon: { fontSize: 36, marginBottom: 8 },
  presetLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  presetSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8, marginBottom: 4 },
  sectionNote: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white, borderRadius: 10, padding: 13,
    borderWidth: 1, borderColor: Colors.border, fontSize: 15, color: Colors.text,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
