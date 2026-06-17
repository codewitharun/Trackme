import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.roles.teacher,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: Colors.border },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="checkins" options={{ title: 'Check-ins' }} />
      <Tabs.Screen name="summaries" options={{ title: 'Summaries' }} />
      <Tabs.Screen name="students" options={{ title: 'Students' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
    </Tabs>
  );
}
