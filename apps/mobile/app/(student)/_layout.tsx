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
      <Tabs.Screen name="home"     options={{ title: 'Home' }} />
      <Tabs.Screen name="summary"  options={{ title: 'Summary' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
      {/* checkin is now a modal inside home — hide from tab bar */}
      <Tabs.Screen name="checkin"  options={{ href: null }} />
    </Tabs>
  );
}
