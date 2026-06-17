import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getMyOrg } from '../services/api';

export interface OrgConfig {
  id: string;
  name: string;
  type: string;
  icon: string;
  purpose: string;
  adminRole: string;
  supervisorRole: string;
  participantRole: string;
  activityLabel: string;
  reportLabel: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  supervisorId?: string;
  organisationId?: string;
  streak: number;
  totalCheckIns: number;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  org: OrgConfig | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOrg: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, org: null, loading: true,
  signIn: async () => {}, signOut: async () => {}, refreshOrg: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg]         = useState<OrgConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrg = async () => {
    try {
      const o = await getMyOrg();
      setOrg(o);
    } catch {
      setOrg(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AUTH] state changed:', firebaseUser?.email ?? 'null');
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const p = snap.data() as UserProfile;
            setProfile(p);
            console.log('[AUTH] profile loaded role:', p.role);
            // Load org for all roles
            if (p.organisationId) await loadOrg();
          } else {
            setProfile(null);
          }
        } catch (err: any) {
          console.error('[AUTH] profile fetch failed:', err.message);
          setProfile(null);
        }
      } else {
        setProfile(null);
        setOrg(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[AUTH] signIn:', email);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
    setOrg(null);
  };

  return React.createElement(AuthContext.Provider, {
    value: { user, profile, org, loading, signIn, signOut, refreshOrg: loadOrg },
  }, children);
};

export const useAuth = () => useContext(AuthContext);
