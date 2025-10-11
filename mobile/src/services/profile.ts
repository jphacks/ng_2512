import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';

let emulatorsConfigured = false;

function ensureFirebaseTargets() {
  if (emulatorsConfigured) return;
  try {
    if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === '1') {
      // localhost defaults commonly used by Firebase Emulator Suite
      try { functions().useEmulator('127.0.0.1', 5001); } catch (_) { /* noop */ }
      try { firestore().useEmulator('127.0.0.1', 8080); } catch (_) { /* noop */ }
    }
  } catch (_) {
    // Best effort; avoid hard failure in non-Expo contexts
  } finally {
    emulatorsConfigured = true;
  }
}

export type UserProfile = {
  uid: string;
  displayName: string | null;
  photoUrl: string | null;
  username: string | null;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

export function userDocRef(uid: string) {
  ensureFirebaseTargets();
  return firestore().collection('users').doc(uid);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await userDocRef(uid).get();
  if (!snap.exists) return null;
  return { uid, ...(snap.data() as Omit<UserProfile, 'uid'>) } as UserProfile;
}

export function listenUserProfile(
  uid: string,
  onNext: (p: UserProfile | null) => void,
  onError?: (e: any) => void
) {
  return userDocRef(uid).onSnapshot(
    (doc) => {
      if (!doc.exists) { onNext(null); return; }
      onNext({ uid, ...(doc.data() as Omit<UserProfile, 'uid'>) } as UserProfile);
    },
    (err) => { if (onError) onError(err); }
  );
}

export async function initUserProfile(): Promise<UserProfile | null> {
  ensureFirebaseTargets();
  // Callable: users_initProfile will create users/{uid} if missing
  const callable = functions().httpsCallable('users_initProfile');
  const res = await callable({});
  // Expect the function to return the current user profile document
  const data = (res?.data ?? null) as any;
  if (!data || typeof data !== 'object') return null;
  return data as UserProfile;
}

