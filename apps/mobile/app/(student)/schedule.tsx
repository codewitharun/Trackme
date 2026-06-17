import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "../../constants/colors";
import { getSchedules } from "../../services/api";

const DAY_LABELS: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export default function ScheduleScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
    new Date().getDay()
  ];

  useEffect(() => {
    getSchedules()
      .then(setSchedules)
      .finally(() => setLoading(false));
  }, []);

  const todaySchedules = schedules.filter((s) => s.days?.includes(todayKey));
  const otherSchedules = schedules.filter((s) => !s.days?.includes(todayKey));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 My Schedule</Text>
        <Text style={styles.date}>{format(new Date(), "EEEE, MMMM d")}</Text>
      </View>

      {schedules.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>No schedules assigned yet</Text>
          <Text style={styles.emptySub}>
            Your teacher will add study schedules here
          </Text>
        </View>
      ) : (
        <>
          {todaySchedules.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Today</Text>
              {todaySchedules.map((s) => (
                <ScheduleCard key={s.id} schedule={s} today />
              ))}
            </>
          )}
          {otherSchedules.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Other Days</Text>
              {otherSchedules.map((s) => (
                <ScheduleCard key={s.id} schedule={s} today={false} />
              ))}
            </>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function ScheduleCard({
  schedule: s,
  today,
}: {
  schedule: any;
  today: boolean;
}) {
  return (
    <View style={[styles.card, today && styles.cardToday]}>
      <View style={styles.timeBlock}>
        <Text style={styles.time}>{s.startTime}</Text>
        <Text style={styles.timeDash}>|</Text>
        <Text style={styles.time}>{s.endTime}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.schedTitle}>{s.title}</Text>
        {s.description ? (
          <Text style={styles.schedDesc}>{s.description}</Text>
        ) : null}
        <Text style={styles.schedDays}>
          {s.days?.map((d: string) => DAY_LABELS[d]?.slice(0, 3)).join(", ")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 24, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: "800", color: Colors.text },
  date: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardToday: { borderColor: Colors.primary, borderWidth: 2 },
  timeBlock: { alignItems: "center", minWidth: 52 },
  time: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  timeDash: { color: Colors.border, marginVertical: 2 },
  info: { flex: 1 },
  schedTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  schedDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  schedDays: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  empty: { alignItems: "center", padding: 48 },
  emptyIcon: { fontSize: 60 },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});
