/**
 * Auth library — thin, opinionated wrappers around Firebase Auth + Firestore
 * admin checks, exposed as React Query / Zustand-friendly hooks.
 *
 * We deliberately keep auth state in a single React Query cache key so that
 * any subscriber gets revalidation for free. The `onAuthChange` bridge
 * invalidates that cache on every auth transition.
 */
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getDb, getFirebaseAuth } from './firebase';

let persistenceReady: Promise<void> | null = null;
function ensurePersistence() {
  if (!persistenceReady) {
    persistenceReady = setPersistence(getFirebaseAuth(), browserLocalPersistence).catch(
      // Non-fatal: e.g. Safari private mode falls back to in-memory.
      () => undefined,
    );
  }
  return persistenceReady;
}

export async function signIn(email: string, password: string): Promise<User> {
  await ensurePersistence();
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebaseAuth());
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  void ensurePersistence();
  return onAuthStateChanged(getFirebaseAuth(), cb);
}

/**
 * `useAuth` — returns the current user (or null) and a boolean `loading`
 * flag that is true on first paint until Firebase restores persisted state.
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() => ({
    user: getFirebaseAuth().currentUser,
    loading: getFirebaseAuth().currentUser === null,
  }));
  const qc = useQueryClient();

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setState({ user, loading: false });
      // Tell anything subscribing via React Query to revalidate.
      qc.invalidateQueries({ queryKey: ['auth'] });
      qc.invalidateQueries({ queryKey: ['isAdmin'] });
    });
    return unsub;
  }, [qc]);

  return state;
}

/**
 * `useIsAdmin` — reads `/admins/{uid}` and returns a boolean. While loading
 * (or when unauthenticated) it returns `false` to keep the UI safe by default.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ['isAdmin', user?.uid ?? null],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!user) return false;
      const snap = await getDoc(doc(getDb(), 'admins', user.uid));
      return snap.exists();
    },
  });

  return {
    isAdmin: !!query.data,
    loading: authLoading || (!!user && query.isLoading),
  };
}
