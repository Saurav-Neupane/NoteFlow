import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { DatabaseError } from '@/utils/errors';
import type { Note } from '@/types';

/** Cloud backup (JSON export/restore) for the user's library (Cloud Firestore). */

export interface BackupPayload {
  app: 'NoteFlow';
  version: string;
  exported_at: string;
  notes: Note[];
}

export async function exportBackupJson(userId: string): Promise<BackupPayload> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.notes), where('user_id', '==', userId))
    );
    const notes = snap.docs
      .map((d) => d.data() as Note)
      .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

    return {
      app: 'NoteFlow',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      notes,
    };
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function importBackupJson(userId: string, payload: BackupPayload): Promise<number> {
  if (payload.app !== 'NoteFlow') {
    throw new DatabaseError('Invalid backup file.');
  }
  const notes = payload.notes ?? [];
  if (!notes.length) return 0;

  try {
    await Promise.all(
      notes.map((n) =>
        setDoc(
          doc(db, DB.notes, n.id),
          {
            id: n.id,
            user_id: userId,
            folder_id: n.folder_id ?? null,
            title: n.title || 'Untitled',
            content: n.content ?? null,
            content_text: n.content_text ?? null,
            color: n.color ?? 'default',
            is_pinned: n.is_pinned ?? false,
            is_favorite: n.is_favorite ?? false,
            is_archived: n.is_archived ?? false,
            is_locked: n.is_locked ?? false,
            created_at: n.created_at,
            updated_at: n.updated_at,
            deleted_at: n.deleted_at ?? null,
            shared_with: n.shared_with ?? null,
            // Preserve tag membership from either the inline array or hydrated tags.
            tag_ids:
              (n as unknown as { tag_ids?: string[] }).tag_ids ??
              n.tags?.map((t) => t.id) ??
              [],
          },
          { merge: true }
        )
      )
    );
    return notes.length;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}
