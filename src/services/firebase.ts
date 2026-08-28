import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase initialization (modular SDK v9+).
 *
 * The client-side Firebase config is safe to embed in the bundle — access is
 * governed by Firebase Security Rules, not by keeping these values secret.
 * Values can still be overridden via `VITE_FIREBASE_*` env vars if desired.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBEKu4GsvBz6PRMA0xCY9aTwa1N6DsiIjk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'noteflow-637ca.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'noteflow-637ca',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'noteflow-637ca.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '539135541946',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:539135541946:web:180e777197eebd62c97883',
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/** Reusable Google OAuth provider. */
export const googleProvider = new GoogleAuthProvider();

// Keep the user signed in across reloads (mirrors Supabase's persistSession).
// Fire-and-forget: local persistence is the default, this is just explicit.
void setPersistence(auth, browserLocalPersistence).catch(() => {
  /* falls back to in-memory persistence if storage is unavailable */
});

/**
 * Resolves once the initial auth state has been restored from storage.
 * Guarded routes await this so they never render a permanent blank screen.
 */
export const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = auth.onAuthStateChanged(() => {
    unsub();
    resolve();
  });
});

/** Convenience accessor for the current user id (or null) after auth is ready. */
export async function currentUserId(): Promise<string | null> {
  await authReady;
  return auth.currentUser?.uid ?? null;
}
