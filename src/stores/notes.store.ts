import { create } from 'zustand';
import { nanoid } from '@/utils/id';
import type { Note, NoteColor } from '@/types';

export interface OptimisticNote extends Note {
  optimistic?: boolean;
  pending?: boolean;
}

interface NotesState {
  notes: OptimisticNote[];
  setNotes: (notes: Note[]) => void;
  /** Merge incoming realtime payloads into the list. */
  upsertNote: (note: Note) => void;
  removeNote: (id: string) => void;
  applyOptimistic: (patch: Partial<Note> & { id: string }) => void;
  clear: () => void;
}

/**
 * Client-side note cache. TanStack Query is the source of truth for fetches;
 * this store holds optimistic drafts and a lightweight in-memory copy for
 * instant list reads (search, filters, grid vs list toggles).
 */

/** Timestamps are ISO strings; guard against malformed values yielding NaN. */
function timeOf(iso: string | null | undefined): number {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function byPinnedThenRecent(a: OptimisticNote, b: OptimisticNote): number {
  if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
  return timeOf(b.updated_at) - timeOf(a.updated_at);
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  setNotes: (notes) => set({ notes }),
  upsertNote: (note) => {
    const list = get().notes;
    const idx = list.findIndex((n) => n.id === note.id);
    if (idx === -1) set({ notes: [note, ...list] });
    else {
      const next = [...list];
      const existing = next[idx];
      // Realtime payloads carry note fields only — never let them blank out
      // companion arrays that were hydrated by a full fetch.
      next[idx] = {
        ...existing,
        ...note,
        tags: note.tags?.length ? note.tags : existing.tags,
        attachments: note.attachments?.length ? note.attachments : existing.attachments,
        optimistic: false,
      };
      next.sort(byPinnedThenRecent);
      set({ notes: next });
    }
  },
  removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  applyOptimistic: (patch) =>
    set((s) => {
      const next = [...s.notes];
      const idx = next.findIndex((n) => n.id === patch.id);
      if (idx !== -1) {
        next[idx] = { ...next[idx], ...patch, optimistic: true, updated_at: new Date().toISOString() };
      } else {
        next.unshift({
          user_id: '',
          folder_id: null,
          title: '',
          content: null,
          content_text: null,
          color: 'default' as NoteColor,
          is_pinned: false,
          is_favorite: false,
          is_archived: false,
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          shared_with: null,
          optimistic: true,
          ...patch,
        });
      }
      return { notes: next };
    }),
  clear: () => set({ notes: [] }),
}));

/** Build a new optimistic note draft ready for insertion. */
export function newDraftNote(userId: string): OptimisticNote {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    user_id: userId,
    folder_id: null,
    title: '',
    content: null,
    content_text: null,
    color: 'default',
    is_pinned: false,
    is_favorite: false,
    is_archived: false,
    is_locked: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    shared_with: null,
    optimistic: true,
  };
}