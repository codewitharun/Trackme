import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../hooks/useAuth";
import {
  getAnalytics,
  getMissingSummaries,
  triggerCheckinAlert,
} from "../../services/api";

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [missing, setMissing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, m] = await Promise.all([getAnalytics(), getMissingSummaries()]);
      setAnalytics(a);
      setMissing(m);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const sendGlobalAlert = async () => {
    Alert.prompt(
      "Global Check-in Alert",
      "Send to ALL students",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async (msg) => {
            try {
              const r = await triggerCheckinAlert(msg || undefined);
              Alert.alert("✅ Alert Sent", `Notified ${r.recipients} students`);
            } catch {
              Alert.alert("Error", "Failed to send alert");
            }
          },
        },
      ],
      "plain-text",
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.roles.admin} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.badge}>👑 Principal Dashboard</Text>
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.date}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.alertBtn} onPress={sendGlobalAlert}>
        <Text style={styles.alertBtnText}>📢 Send Global Check-in Alert</Text>
      </TouchableOpacity>

      {analytics && (
        <>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total Students"
              value={analytics.totalStudents}
              icon="👥"
              color={Colors.primary}
            />
            <StatCard
              label="Check-ins Today"
              value={analytics.checkins.total}
              icon="📸"
              color={Colors.success}
            />
            <StatCard
              label="Summaries Today"
              value={analytics.summaries.total}
              icon="📝"
              color="#8B5CF6"
            />
            <StatCard
              label="Avg Study Hours"
              value={`${analytics.avgStudyHours}h`}
              icon="⏱"
              color={Colors.warning}
            />
            <StatCard
              label="Approved Check-ins"
              value={analytics.checkins.approved}
              icon="✅"
              color={Colors.success}
            />
            <StatCard
              label="On-time Summaries"
              value={analytics.summaries.onTime}
              icon="🎯"
              color={Colors.primary}
            />
          </View>

          {missing?.count > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                ⚠️ Missing Summaries Today ({missing.count})
              </Text>
              {missing.missing.slice(0, 8).map((s: any) => (
                <View key={s.id} style={styles.missingItem}>
                  <Text style={styles.missingName}>{s.name}</Text>
                  <Text style={styles.missingEmail}>{s.email}</Text>
                </View>
              ))}
            </>
          )}

          {analytics.topStudents?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🏆 Top Students</Text>
              {analytics.topStudents.map((s: any, i: number) => (
                <View key={s.name} style={styles.topItem}>
                  <Text style={styles.rank}>
                    {["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName}>{s.name}</Text>
                    <Text style={styles.topSub}>
                      🔥 {s.streak} streak · 📸 {s.totalCheckIns} check-ins
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: any;
  icon: string;
  color: string;
}) {
  return (
    <View
      style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    paddingTop: 56,
  },
  badge: {
    fontSize: 13,
    color: Colors.roles.admin,
    fontWeight: "700",
    marginBottom: 4,
  },
  name: { fontSize: 24, fontWeight: "800", color: Colors.text },
  date: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  signOut: { color: Colors.danger, fontSize: 14 },
  alertBtn: {
    backgroundColor: Colors.roles.admin,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  alertBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 16,
  },
  statCard: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: { fontSize: 28 },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  missingItem: {
    backgroundColor: "#FEF2F2",
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  missingName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  missingEmail: { fontSize: 12, color: Colors.textSecondary },
  topItem: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rank: { fontSize: 24 },
  topName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  topSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
