import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useNotesStore } from '@/stores';
import * as authService from '@/services/auth.service';

/** Returns the current user and hydration flag. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  return { user, loading, setUser };
}

/**
 * Exposes the session plus a sign-out helper.
 *
 * The auth listener itself lives in `bootstrapAuth()`, which runs once at boot
 * and stays subscribed for the lifetime of the app. Subscribing again here
 * would race that listener and could clear a valid user mid-render, so this
 * hook only reads the store.
 */
export function useSession(): {
  user: ReturnType<typeof useAuth>['user'];
  loading: boolean;
  isReady: boolean;
  signOut: () => Promise<void>;
} {
  const { user, loading, setUser } = useAuth();
  const qc = useQueryClient();
  const isReady = !loading;

  const signOut = async () => {
    await authService.signOutUser();
    setUser(null);
    // Drop every cached row so the next account never sees this one's data.
    useNotesStore.getState().clear();
    qc.clear();
  };

  return { user, loading, isReady, signOut };
}

/** Guard hook for protected routes. Redirects to /auth when unauthenticated. */
export function useRequireAuth(): {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  isReady: boolean;
} {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user, navigate]);

  return { user: user as NonNullable<typeof user>, isReady: !loading };
}
