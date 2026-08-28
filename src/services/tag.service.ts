import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { nanoid } from '@/utils/id';
import { DatabaseError } from '@/utils/errors';
import type { Tag } from '@/types';

/** Tags CRUD (Cloud Firestore).
 *  Tag membership lives inline on note documents as `tag_ids: string[]`. */

export async function fetchTags(userId: string): Promise<Tag[]> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.tags), where('user_id', '==', userId))
    );
    return snap.docs
      .map((d) => ({ ...(d.data() as Tag), id: d.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function createTag(
  userId: string,
  input: { name: string; color: string }
): Promise<Tag> {
  try {
    const id = nanoid();
    const row: Tag = {
      id,
      user_id: userId,
      name: input.name.trim(),
      color: input.color,
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, DB.tags, id), row);
    return row;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function updateTag(
  tagId: string,
  patch: Partial<Pick<Tag, 'name' | 'color'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, DB.tags, tagId), patch);
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function deleteTag(tagId: string): Promise<void> {
  try {
    // Remove this tag from any notes that reference it, then delete the tag.
    const notesSnap = await getDocs(
      query(collection(db, DB.notes), where('tag_ids', 'array-contains', tagId))
    );
    await Promise.all(
      notesSnap.docs.map((d) => {
        const current = (d.data() as { tag_ids?: string[] }).tag_ids ?? [];
        return updateDoc(d.ref, {
          tag_ids: current.filter((id) => id !== tagId),
          updated_at: new Date().toISOString(),
        });
      })
    );
    await deleteDoc(doc(db, DB.tags, tagId));
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function fetchTagUsage(tagId: string): Promise<number> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.notes), where('tag_ids', 'array-contains', tagId))
    );
    return snap.size;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/**
 * Count how many (non-trashed) notes reference each tag in one pass over the
 * user's notes — far cheaper than one `array-contains` query per tag.
 */
export async function fetchTagUsageMap(userId: string): Promise<Record<string, number>> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.notes), where('user_id', '==', userId))
    );
    const counts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const data = d.data() as { tag_ids?: string[]; deleted_at?: string | null };
      if (data.deleted_at) return;
      (data.tag_ids ?? []).forEach((id) => {
        counts[id] = (counts[id] ?? 0) + 1;
      });
    });
    return counts;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}
