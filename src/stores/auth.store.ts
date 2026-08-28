import { create } from 'zustand';
import { auth } from '@/services/firebase';
import { mapUser, type AuthSessionUser } from '@/services/auth.service';

interface AuthState {
  user: AuthSessionUser | null;
  loading: boolean;
  setUser: (user: AuthSessionUser | null) => void;
  setLoading: (v: boolean) => void;
}

/** Holds the in-memory auth session; source of truth is Firebase Auth. */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

/** Hydrate the store from Firebase's persisted session at boot. */
export async function bootstrapAuth(): Promise<void> {
  const setUser = useAuthStore.getState().setUser;
  // Live-connect to auth changes so login/logout update the store. The first
  // callback also resolves the initial hydration, so we await it once.
  await new Promise<void>((resolve) => {
    let resolved = false;
    auth.onAuthStateChanged(
      (user) => {
        setUser(user ? mapUser(user) : null);
        if (!resolved) {
          resolved = true;
          resolve();
        }
      },
      () => {
        setUser(null);
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }
    );
  });
}
