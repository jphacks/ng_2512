import { useEffect, useState } from 'react';
import { listenUserProfile, UserProfile } from '@/services/profile';

type UseUserProfile = {
  profile: UserProfile | null;
  loading: boolean;
  error: any;
};

export function useUserProfile(uid?: string | null): UseUserProfile {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!uid);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsub = listenUserProfile(
      uid,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      (e) => {
        setError(e);
        setLoading(false);
      }
    );
    return () => {
      try { unsub && unsub(); } catch (_) { /* noop */ }
    };
  }, [uid]);

  return { profile, loading, error };
}

