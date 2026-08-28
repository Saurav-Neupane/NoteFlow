import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, authReady } from './firebase';
import { type Result } from '@/types';

/** Authentication + profile services built on Firebase Auth. */

export interface AuthSessionUser {
  id: string;
  email: string | undefined;
  fullName: string | null;
  avatarUrl: string | null;
}

/** Normalize a Firebase user into the app's session-user shape. */
export function mapUser(user: User): AuthSessionUser {
  return {
    id: user.uid,
    email: user.email ?? undefined,
    fullName: user.displayName ?? null,
    avatarUrl: user.photoURL ?? null,
  };
}

/** Turn a Firebase auth error code into a friendly, user-facing message. */
function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by the browser. Please allow popups and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return (err as Error)?.message?.replace(/^Firebase:\s*/, '') || 'Something went wrong.';
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<Result<AuthSessionUser>> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { data: mapUser(cred.user), error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<Result<AuthSessionUser>> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Persist the display name onto the Firebase user profile.
    if (fullName) {
      await fbUpdateProfile(cred.user, { displayName: fullName });
    }
    return { data: mapUser(cred.user), error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

export async function signInWithGoogle(): Promise<Result<AuthSessionUser>> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { data: mapUser(cred.user), error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

/** LocalStorage key used to complete the email-link (magic link) flow. */
const MAGIC_LINK_EMAIL_KEY = 'noteflow:magic-link-email';

export async function sendMagicLink(email: string): Promise<Result<null>> {
  try {
    await sendSignInLinkToEmail(auth, email, {
      url: `${window.location.origin}/auth`,
      handleCodeInApp: true,
    });
    // Remember the email so we can complete sign-in when the user returns.
    window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

/**
 * Completes an email-link sign-in if the current URL is a valid magic link.
 * Called once at boot. Returns the signed-in user or null when not applicable.
 */
export async function completeMagicLinkSignIn(): Promise<AuthSessionUser | null> {
  try {
    if (!isSignInWithEmailLink(auth, window.location.href)) return null;
    let email = window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY);
    // If opened on a different device, ask the user to re-enter their email.
    if (!email) {
      email = window.prompt('Please confirm your email to finish signing in') ?? '';
      if (!email) return null;
    }
    const cred = await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY);
    // Strip the one-time link params from the URL.
    window.history.replaceState({}, document.title, window.location.pathname);
    return mapUser(cred.user);
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<Result<null>> {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth`,
    });
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

export async function updatePassword(newPassword: string): Promise<Result<null>> {
  try {
    if (!auth.currentUser) return { data: null, error: 'You must be signed in.' };
    await fbUpdatePassword(auth.currentUser, newPassword);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

export async function getSessionUser(): Promise<AuthSessionUser | null> {
  await authReady;
  return auth.currentUser ? mapUser(auth.currentUser) : null;
}

export async function updateProfile({
  fullName,
  avatarUrl,
}: {
  fullName?: string;
  avatarUrl?: string;
}): Promise<Result<AuthSessionUser>> {
  try {
    if (!auth.currentUser) return { data: null, error: 'You must be signed in.' };
    await fbUpdateProfile(auth.currentUser, {
      ...(fullName !== undefined ? { displayName: fullName } : {}),
      ...(avatarUrl !== undefined ? { photoURL: avatarUrl } : {}),
    });
    return { data: mapUser(auth.currentUser), error: null };
  } catch (err) {
    return { data: null, error: friendlyError(err) };
  }
}

export function onAuthStateChange(
  callback: (user: AuthSessionUser | null) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(user ? mapUser(user) : null);
  });
}

/** Returns the current user id or null (async, after auth is ready). */
export async function getCurrentUserId(): Promise<string | null> {
  await authReady;
  return auth.currentUser?.uid ?? null;
}
