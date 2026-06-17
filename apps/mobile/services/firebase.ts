import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  inMemoryPersistence,
  getAuth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Log whether the RN-specific persistence is available.
// If this prints "undefined" the metro.config.js fix hasn't taken effect — clear cache.
console.log('[FIREBASE] getReactNativePersistence type:', typeof getReactNativePersistence);

let auth;
try {
  const persistence =
    typeof getReactNativePersistence === 'function'
      ? getReactNativePersistence(AsyncStorage)
      : inMemoryPersistence; // fallback so onAuthStateChanged still fires

  console.log(
    '[FIREBASE] initializeAuth with persistence:',
    typeof getReactNativePersistence === 'function' ? 'AsyncStorage' : 'inMemory'
  );
  auth = initializeAuth(app, { persistence });
} catch {
  // Already initialized (hot reload)
  console.log('[FIREBASE] auth already initialized, reusing');
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
