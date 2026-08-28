import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { DatabaseError } from '@/utils/errors';
import { countWords, readingTimeMinutes } from '@/utils/text';
import type { NoteStats } from '@/types';

/** Aggregate note statistics for the home dashboard (Cloud Firestore). */
export async function computeStats(userId: string): Promise<NoteStats> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.notes), where('user_id', '==', userId))
    );

    const notes = snap.docs.map(
      (d) =>
        d.data() as {
          is_pinned?: boolean;
          is_favorite?: boolean;
          is_archived?: boolean;
          deleted_at?: string | null;
          content_text?: string | null;
        }
    );
    const active = notes.filter((n) => !n.deleted_at);

    let words = 0;
    for (const n of active) {
      words += countWords(n.content_text ?? '');
    }

    return {
      total: active.length,
      pinned: active.filter((n) => n.is_pinned).length,
      favorites: active.filter((n) => n.is_favorite).length,
      archived: active.filter((n) => n.is_archived).length,
      trash: notes.filter((n) => n.deleted_at).length,
      words,
      read_time_minutes: readingTimeMinutes(words),
    };
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}
