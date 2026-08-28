import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToNotes } from '@/services/realtime.service';
import { useNotesStore } from '@/stores';
import { noteKeys } from './useNotes';
import type { Note } from '@/types';

/**
 * Subscribe the active tab to realtime note changes.
 *
 * Snapshot events are written into BOTH the Zustand mirror (used by the editor)
 * and the TanStack Query cache (used by every list view) — otherwise edits made
 * on another device would never appear in the UI.
 */
export function useRealtimeNotes(userId?: string) {
  const upsertNote = useNotesStore((s) => s.upsertNote);
  const removeNote = useNotesStore((s) => s.removeNote);
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const cleanup = subscribeToNotes(
      userId,
      (payload) => {
        const incoming = payload.new;
        const gone = payload.eventType === 'DELETE';

        if (gone) {
          removeNote(incoming.id);
        } else {
          upsertNote(incoming);
        }

        // Keep the query cache — the source of truth for all list views — in sync.
        qc.setQueryData<Note[]>(noteKeys.list(userId), (prev) => {
          if (!prev) return prev;
          if (gone) return prev.filter((n) => n.id !== incoming.id);
          const idx = prev.findIndex((n) => n.id === incoming.id);
          // Companion arrays don't arrive with snapshots — preserve what we have.
          const merged = mergeCompanions(prev[idx], incoming);
          if (idx === -1) return [merged, ...prev];
          const next = [...prev];
          next[idx] = merged;
          return next;
        });
        qc.setQueryData<Note | null>(noteKeys.detail(incoming.id), (prev) =>
          gone ? null : prev ? mergeCompanions(prev, incoming) : prev
        );
        if (incoming.deleted_at || gone) {
          void qc.invalidateQueries({ queryKey: noteKeys.trash(userId) });
        }
      },
      {
        // The first snapshot replays the whole collection; the initial fetch
        // already covered that, so only react to genuine changes.
        skipInitial: true,
        onError: (err) => console.error('[realtime] notes listener failed', err),
      }
    );
    return cleanup;
  }, [userId, upsertNote, removeNote, qc]);
}

/** Firestore snapshots carry note fields only — keep hydrated companions. */
function mergeCompanions(previous: Note | undefined, incoming: Note): Note {
  if (!previous) return incoming;
  return {
    ...incoming,
    tags: previous.tags ?? [],
    attachments: previous.attachments ?? [],
  };
}
