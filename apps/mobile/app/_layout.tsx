import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { registerForPushNotifications, addResponseListener } from '../services/notifications';

function RootNavigator() {
  const { user, profile, org, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth     = segments[0] === '(auth)';
    const inOrgSetup = segments[1] === 'org-setup';

    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && profile) {
      if (inAuth) {
        // Logged in — go to role home
        if (profile.role === 'admin') {
          router.replace(org ? '/(admin)/dashboard' : '/(admin)/org-setup');
        } else if (profile.role === 'teacher') {
          router.replace('/(teacher)/dashboard');
        } else {
          router.replace('/(student)/home');
        }
      } else if (profile.role === 'admin' && !org && !inOrgSetup) {
        // Admin with no org — force setup
        router.replace('/(admin)/org-setup');
      }
    }
  }, [user, profile, org, loading]);

  useEffect(() => {
    if (user) registerForPushNotifications();
  }, [user]);

  useEffect(() => {
    const sub = addResponseListener((response) => {
      const type = response.notification.request.content.data?.type;
      if (type === 'CHECKIN_PROMPT' && profile?.role === 'student') {
        router.push('/(student)/home');
      } else if (type === 'SUMMARY_REMINDER' && profile?.role === 'student') {
        router.push('/(student)/summary');
      }
    });
    return () => sub.remove();
  }, [profile]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
