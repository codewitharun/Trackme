import { Redirect } from 'expo-router';

// The root layout handles auth-based redirection.
// This file just satisfies Expo Router's requirement for an index route.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
