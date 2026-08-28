import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { normalizeNoteDoc } from './note.service';
import type { Note, NoteRealtimePayload } from '@/types';

/**
 * Realtime sync helpers built on Firestore's `onSnapshot`. Each user subscribes
 * to their own rows via a `where('user_id','==',uid)` filter, so edits made on
 * another device push instantly.
 *
 * Note: the first snapshot reports every existing document as `added`, and
 * Firestore never provides the previous document state — consumers must treat
 * every payload as "this is the current truth for this id".
 */

export interface RealtimeOptions {
  /** Called when the listener itself fails (permissions, network, quota). */
  onError?: (error: Error) => void;
  /** Skip the initial full-collection replay and only report later changes. */
  skipInitial?: boolean;
}

export function subscribeToNotes(
  userId: string,
  onNote: (payload: NoteRealtimePayload) => void,
  options: RealtimeOptions = {}
): () => void {
  const q = query(collection(db, DB.notes), where('user_id', '==', userId));
  let first = true;
  return onSnapshot(
    q,
    (snapshot) => {
      const isInitial = first;
      first = false;
      if (isInitial && options.skipInitial) return;
      snapshot.docChanges().forEach((change) => {
        const note = normalizeNoteDoc(change.doc.data(), change.doc.id) as Note;
        const eventType =
          change.type === 'added' ? 'INSERT' : change.type === 'removed' ? 'DELETE' : 'UPDATE';
        onNote({ eventType, new: note });
      });
    },
    (error) => options.onError?.(error)
  );
}
