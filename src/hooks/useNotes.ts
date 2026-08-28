import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as noteService from '@/services/note.service';
import { useNotesStore } from '@/stores';
import { toPublicMessage } from '@/utils/errors';
import type { Note, NoteColor } from '@/types';

/**
 * Query keys for every note-related cache entry.
 *
 * List-style keys are scoped by `userId` so that signing into a different
 * account can never surface the previous account's cached rows, and so the
 * realtime listener can address exactly one list.
 */
export const noteKeys = {
  all: ['notes'] as const,
  list: (userId?: string) => [...noteKeys.all, 'list', userId ?? ''] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
  trash: (userId?: string) => [...noteKeys.all, 'trash', userId ?? ''] as const,
  versions: (id: string) => [...noteKeys.all, 'versions', id] as const,
};

/** Loads the user's notes and mirrors them into the Zustand store. */
export function useNotes(userId?: string) {
  const setNotes = useNotesStore((s) => s.setNotes);
  return useQuery({
    queryKey: noteKeys.list(userId),
    queryFn: async () => {
      if (!userId) return [];
      const notes = await noteService.fetchNotes(userId);
      setNotes(notes);
      return notes;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/** Loads one fully hydrated note. `userId` enforces ownership on read. */
export function useNote(id?: string, userId?: string) {
  return useQuery({
    queryKey: noteKeys.detail(id ?? ''),
    queryFn: () => noteService.fetchNoteById(id as string, userId as string),
    enabled: !!id && !!userId,
    staleTime: 15_000,
  });
}

export function useTrash(userId?: string) {
  return useQuery({
    queryKey: noteKeys.trash(userId),
    queryFn: () => (userId ? noteService.fetchTrash(userId) : []),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useVersions(noteId?: string) {
  return useQuery({
    queryKey: noteKeys.versions(noteId ?? ''),
    queryFn: () => (noteId ? noteService.fetchVersions(noteId) : []),
    enabled: !!noteId,
  });
}

/** Surface a failed mutation to the user instead of dropping it on the floor. */
function fail(action: string) {
  return (error: unknown) => toast.error(`${action} failed: ${toPublicMessage(error)}`);
}

/**
 * Central note mutations. Every mutation invalidates the whole `notes` key
 * space on settle so lists, detail and trash views converge, and
 * every mutation reports its own failure.
 */
export function useNoteMutations() {
  const qc = useQueryClient();
  const applyOptimistic = useNotesStore((s) => s.applyOptimistic);
  const removeNote = useNotesStore((s) => s.removeNote);
  // Fire-and-forget: kick off a background refetch but DON'T return the promise.
  // Returning it from `onSettled` would make `mutateAsync` (and therefore the
  // editor's "Saving…" spinner) block until the network refetch settles, which
  // is what left the UI stuck until a manual page refresh.
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: noteKeys.all });
  };

  const create = useMutation({
    mutationFn: (input: noteService.CreateNoteInput & { userId: string }) =>
      noteService.createNote(input.userId, input),
    onError: fail('Creating note'),
    onSettled: invalidate,
  });

  /** Patch a note, optimistically updating both the store and the caches. */
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: noteService.NoteUpdate }) =>
      noteService.updateNote(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: noteKeys.detail(id) });
      const previousLists = qc.getQueriesData<Note[]>({ queryKey: noteKeys.all });
      const previousDetail = qc.getQueryData<Note | null>(noteKeys.detail(id));

      applyOptimistic({ id, ...patch });
      const stamp = new Date().toISOString();
      qc.setQueriesData<Note[]>({ queryKey: noteKeys.all }, (prev) =>
        Array.isArray(prev)
          ? prev.map((n) => (n.id === id ? { ...n, ...patch, updated_at: stamp } : n))
          : prev
      );
      qc.setQueryData<Note | null>(noteKeys.detail(id), (prev) =>
        prev ? { ...prev, ...patch, updated_at: stamp } : prev
      );

      return { previousLists, previousDetail };
    },
    onError: (error, { id }, ctx) => {
      // Roll the caches back to exactly what they held before the attempt.
      ctx?.previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx) qc.setQueryData(noteKeys.detail(id), ctx.previousDetail);
      fail('Saving note')(error);
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => noteService.deleteNoteHard(id),
    onSuccess: (_data, id) => removeNote(id),
    onError: fail('Deleting note'),
    onSettled: invalidate,
  });

  const moveToTrash = useMutation({
    mutationFn: (id: string) => noteService.moveToTrash(id),
    onError: fail('Moving note to trash'),
    onSettled: invalidate,
  });

  const restore = useMutation({
    mutationFn: (id: string) => noteService.restoreFromTrash(id),
    onError: fail('Restoring note'),
    onSettled: invalidate,
  });

  const emptyTrash = useMutation({
    mutationFn: (userId: string) => noteService.emptyTrash(userId),
    onError: fail('Emptying trash'),
    onSettled: invalidate,
  });

  const duplicate = useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: Note }) =>
      noteService.duplicateNote(userId, note),
    onError: fail('Duplicating note'),
    onSettled: invalidate,
  });

  const setColor = useMutation({
    mutationFn: ({ id, color }: { id: string; color: NoteColor }) =>
      noteService.setNoteColor(id, color),
    onMutate: ({ id, color }) => applyOptimistic({ id, color }),
    onError: fail('Changing color'),
    onSettled: invalidate,
  });

  const setFolder = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      noteService.setNoteFolder(id, folderId),
    onMutate: ({ id, folderId }) => applyOptimistic({ id, folder_id: folderId }),
    onError: fail('Moving note'),
    onSettled: invalidate,
  });

  /** Attribute toggles share one shape: a boolean flag on the note. */
  const toggleFlag = useMutation({
    mutationFn: ({
      id,
      flag,
      value,
    }: {
      id: string;
      flag: 'is_pinned' | 'is_favorite' | 'is_archived' | 'is_locked';
      value: boolean;
    }) => noteService.patchNote(id, { [flag]: value }),
    onMutate: ({ id, flag, value }) => applyOptimistic({ id, [flag]: value }),
    onError: fail('Updating note'),
    onSettled: invalidate,
  });

  const setTags = useMutation({
    mutationFn: ({ id, tagIds }: { id: string; tagIds: string[] }) =>
      noteService.replaceNoteTags(id, tagIds),
    onError: fail('Updating tags'),
    onSettled: invalidate,
  });

  return {
    create,
    update,
    remove,
    moveToTrash,
    restore,
    emptyTrash,
    duplicate,
    setColor,
    setFolder,
    toggleFlag,
    setTags,
    invalidate,
  };
}
