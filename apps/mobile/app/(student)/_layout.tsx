import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: Colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => null }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in', tabBarIcon: () => null }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary', tabBarIcon: () => null }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: () => null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    </Tabs>
  );
}
