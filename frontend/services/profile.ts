import { doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { Timestamp } from 'firebase/firestore';
import { getFirestoreDb, getFirebaseFunctions, getFirebaseAuth } from '@/lib/firebase';

export type UserProfile = {
  uid: string;
  displayName: string | null;
  photoUrl: string | null;
  username: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

export function userDocRef(uid: string) {
  const db = getFirestoreDb();
  return doc(db, 'users', uid);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<UserProfile, 'uid'>) } as UserProfile;
}

export function listenUserProfile(
  uid: string,
  onNext: (p: UserProfile | null) => void,
  onError?: (e: any) => void
): Unsubscribe {
  return onSnapshot(
    userDocRef(uid),
    (docSnap) => {
      if (!docSnap.exists()) { onNext(null); return; }
      onNext({ uid, ...(docSnap.data() as Omit<UserProfile, 'uid'>) } as UserProfile);
    },
    (err) => { if (onError) onError(err); }
  );
}

export async function initUserProfile(): Promise<UserProfile | null> {
  // Callable: users_initProfile will create users/{uid} if missing using auth context
  const fn = httpsCallable(getFirebaseFunctions(), 'users_initProfile');
  const res = await fn({});
  const data = (res?.data ?? null) as any;
  if (!data || typeof data !== 'object') return null;
  return data as UserProfile;
}

export function currentUid(): string | null {
  try { return getFirebaseAuth().currentUser?.uid ?? null; } catch { return null; }
}

