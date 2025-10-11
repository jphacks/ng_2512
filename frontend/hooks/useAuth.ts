import { useEffect, useState } from 'react';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { initUserProfile } from '@/services/profile';

type UseAuth = {
  user: User | null;
  loading: boolean;
  error: any;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

export function useAuth(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => { try { unsub(); } catch { /* noop */ } };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider();
      const cred = await signInWithPopup(auth, provider);
      setUser(cred.user);
      try { await initUserProfile(); } catch (_) { /* surface only auth error */ }
      return cred.user;
    } catch (e) {
      try {
        const code = (e as any)?.code;
        if (code === 'auth/configuration-not-found') {
          // Provide actionable guidance for common root causes
          const msg = [
            'Firebase Auth configuration not found.',
            'Check:',
            '- EXPO_PUBLIC_FIREBASE_API_KEY and EXPO_PUBLIC_FIREBASE_PROJECT_ID are defined',
            '- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN is set (or fallback applied)',
            '- Google provider is enabled in Firebase Console',
            '- Restart dev server: expo start -c',
          ].join('\n');
          setError(new Error(msg));
        } else {
          setError(e);
        }
      } catch {
        setError(e);
      }
      console.error(e);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await fbSignOut(getFirebaseAuth());
      setUser(null);
    } catch (e) {
      setError(e);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, signInWithGoogle, signOut };
}
