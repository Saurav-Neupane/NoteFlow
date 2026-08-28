import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { nanoid } from '@/utils/id';
import { DatabaseError } from '@/utils/errors';
import { DEFAULT_SETTINGS, type UserSettings } from '@/types';

/** User profile + settings persistence (Cloud Firestore).
 *  Settings and profile are keyed by the user's uid (one doc per user). */

export async function fetchSettings(userId: string): Promise<UserSettings> {
  try {
    const snap = await getDoc(doc(db, DB.settings, userId));
    const data = snap.exists() ? (snap.data() as { settings?: Partial<UserSettings> }) : null;
    if (!data?.settings) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...data.settings };
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function saveSettings(userId: string, settings: UserSettings): Promise<void> {
  try {
    await setDoc(
      doc(db, DB.settings, userId),
      { user_id: userId, settings, updated_at: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function fetchProfile(
  userId: string
): Promise<{ full_name: string | null; avatar_url: string | null } | null> {
  try {
    const snap = await getDoc(doc(db, DB.profiles, userId));
    if (!snap.exists()) return null;
    const data = snap.data() as { full_name?: string | null; avatar_url?: string | null };
    return { full_name: data.full_name ?? null, avatar_url: data.avatar_url ?? null };
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function upsertProfile(
  userId: string,
  profile: { full_name: string | null; avatar_url: string | null }
): Promise<void> {
  try {
    await setDoc(
      doc(db, DB.profiles, userId),
      {
        id: userId,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/* ---------------- Activity log ---------------- */

export async function logActivity(
  userId: string,
  action: string,
  target: string
): Promise<void> {
  try {
    const id = nanoid();
    await setDoc(doc(db, DB.activityLogs, id), {
      id,
      user_id: userId,
      action,
      target,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* activity logging is best-effort; never block the caller */
  }
}

export async function fetchActivity(
  userId: string,
  limit = 50
): Promise<{ action: string; target: string; created_at: string }[]> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.activityLogs), where('user_id', '==', userId))
    );
    return snap.docs
      .map((d) => d.data() as { action: string; target: string; created_at: string })
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, limit);
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}
