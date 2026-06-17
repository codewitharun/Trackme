import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.roles.admin,
        tabBarStyle: { borderTopWidth: 1, borderTopColor: Colors.border },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="users" options={{ title: 'Users' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="org-setup" options={{ href: null }} />
    </Tabs>
  );
}
