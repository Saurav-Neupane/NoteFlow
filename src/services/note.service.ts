import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { nanoid } from '@/utils/id';
import { DatabaseError } from '@/utils/errors';
import type { Note, NoteColor, NoteVersion, Attachment, Tag } from '@/types';

/** Notes CRUD + companion objects (tags, attachments, versions).
 *  Backed by Cloud Firestore.
 *
 *  Data model note: tag membership is stored inline on each note document as a
 *  `tag_ids: string[]` array (Firestore is a document store, so a join table
 *  isn't needed). We hydrate those ids into full `Tag` objects on read.
 */

/** The stored shape of a note document (companions live in other collections). */
type NoteDoc = Omit<Note, 'tags' | 'attachments'> & {
  tag_ids?: string[];
};

/** Firestore rejects `undefined`; drop those keys before writing. */
function stripUndefined<T extends object>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as T;
}

/** Build a lookup of the user's tags so notes can hydrate their `tags` array. */
async function getUserTagMap(userId: string): Promise<Map<string, Tag>> {
  const snap = await getDocs(query(collection(db, DB.tags), where('user_id', '==', userId)));
  const map = new Map<string, Tag>();
  snap.forEach((d) => map.set(d.id, { ...(d.data() as Tag), id: d.id }));
  return map;
}

/** Normalize a raw Firestore document into a complete NoteDoc.
 *  Documents written by older schema versions may be missing fields, and every
 *  downstream sort/filter assumes they exist — so default them exactly once. */
export function normalizeNoteDoc(raw: DocumentData, fallbackId?: string): NoteDoc {
  const now = new Date(0).toISOString();
  return {
    id: (raw.id as string) ?? fallbackId ?? '',
    user_id: (raw.user_id as string) ?? '',
    folder_id: (raw.folder_id as string | null) ?? null,
    title: (raw.title as string) ?? '',
    content: (raw.content as string | null) ?? null,
    content_text: (raw.content_text as string | null) ?? null,
    color: (raw.color as NoteColor) ?? 'default',
    is_pinned: raw.is_pinned === true,
    is_favorite: raw.is_favorite === true,
    is_archived: raw.is_archived === true,
    is_locked: raw.is_locked === true,
    shared_with: (raw.shared_with as string[] | null) ?? null,
    sharing_access: raw.sharing_access as Note['sharing_access'],
    created_at: (raw.created_at as string) ?? now,
    updated_at: (raw.updated_at as string) ?? (raw.created_at as string) ?? now,
    deleted_at: (raw.deleted_at as string | null) ?? null,
    tag_ids: Array.isArray(raw.tag_ids) ? (raw.tag_ids as string[]) : [],
  };
}

function docToNoteDoc(d: QueryDocumentSnapshot<DocumentData>): NoteDoc {
  return normalizeNoteDoc(d.data(), d.id);
}

/** Convert a stored note document into the in-memory Note shape. */
function mapNote(raw: NoteDoc, tagMap?: Map<string, Tag>): Note {
  const { tag_ids, ...rest } = raw;
  const tags: Tag[] = tagMap
    ? (tag_ids ?? []).map((id) => tagMap.get(id)).filter((t): t is Tag => !!t)
    : [];
  return {
    ...(rest as Omit<Note, 'tags' | 'attachments'>),
    tags,
    attachments: [],
  };
}

export async function fetchNotes(userId: string): Promise<Note[]> {
  try {
    const [snap, tagMap] = await Promise.all([
      getDocs(query(collection(db, DB.notes), where('user_id', '==', userId))),
      getUserTagMap(userId),
    ]);
    const notes = snap.docs.map((d) => mapNote(docToNoteDoc(d), tagMap));
    // Sort client-side (pinned first, then most recently updated) to avoid
    // requiring a composite Firestore index.
    return notes.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
    });
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Load a single note. `userId` is required so a note belonging to another
 *  account can never be rendered even if security rules are misconfigured. */
export async function fetchNoteById(noteId: string, userId: string): Promise<Note | null> {
  try {
    const noteSnap = await getDoc(doc(db, DB.notes, noteId));
    if (!noteSnap.exists()) return null;
    const raw = normalizeNoteDoc(noteSnap.data(), noteSnap.id);
    if (raw.user_id !== userId) return null;

    const [tagMap, attachments] = await Promise.all([
      getUserTagMap(userId),
      getDocs(query(collection(db, DB.attachments), where('note_id', '==', noteId))),
    ]);

    const note = mapNote(raw, tagMap);
    note.attachments = attachments.docs
      .map((d) => ({ ...(d.data() as Attachment), id: d.id }))
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    return note;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export interface CreateNoteInput {
  title?: string;
  content?: string | null;
  content_text?: string | null;
  color?: NoteColor;
  folder_id?: string | null;
  is_pinned?: boolean;
  is_favorite?: boolean;
  is_locked?: boolean;
  tags?: string[];
  shared_with?: string[] | null;
}

export async function createNote(userId: string, input: CreateNoteInput): Promise<Note> {
  try {
    const id = nanoid();
    const now = new Date().toISOString();
    const row: NoteDoc = {
      id,
      user_id: userId,
      title: input.title ?? 'Untitled',
      content: input.content ?? null,
      content_text: input.content_text ?? null,
      color: input.color ?? 'default',
      folder_id: input.folder_id ?? null,
      is_pinned: input.is_pinned ?? false,
      is_favorite: input.is_favorite ?? false,
      is_archived: false,
      is_locked: input.is_locked ?? false,
      shared_with: input.shared_with ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      tag_ids: input.tags ?? [],
    };

    await setDoc(doc(db, DB.notes, id), row);

    const tagMap = input.tags?.length ? await getUserTagMap(userId) : undefined;
    return mapNote(row, tagMap);
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export type NoteUpdate = Partial<
  Pick<
    Note,
    | 'title'
    | 'content'
    | 'content_text'
    | 'color'
    | 'folder_id'
    | 'is_pinned'
    | 'is_favorite'
    | 'is_archived'
    | 'is_locked'
    | 'shared_with'
    | 'deleted_at'
    | 'sharing_access'
  >
>;

/** Write a patch without reading the document back. Cheap — use this for
 *  attribute toggles and autosave where the caller already knows the result. */
export async function patchNote(noteId: string, updates: NoteUpdate): Promise<void> {
  try {
    await updateDoc(doc(db, DB.notes, noteId), {
      ...stripUndefined(updates),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Write a patch and return the fully hydrated note. */
export async function updateNote(noteId: string, updates: NoteUpdate): Promise<Note> {
  try {
    const ref = doc(db, DB.notes, noteId);
    await updateDoc(ref, {
      ...stripUndefined(updates),
      updated_at: new Date().toISOString(),
    });
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Note no longer exists');
    const raw = normalizeNoteDoc(snap.data(), snap.id);
    const tagMap = raw.tag_ids?.length ? await getUserTagMap(raw.user_id) : undefined;
    return mapNote(raw, tagMap);
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Collect every companion document that belongs to a set of notes. */
async function collectCompanions(noteIds: string[]) {
  const chunks: string[][] = [];
  for (let i = 0; i < noteIds.length; i += 10) chunks.push(noteIds.slice(i, i + 10));

  const collections = [DB.attachments, DB.versions] as const;
  const refs: { path: string; ref: ReturnType<typeof doc> }[] = [];
  const storagePaths: string[] = [];

  await Promise.all(
    chunks.flatMap((ids) =>
      collections.map(async (name) => {
        const snap = await getDocs(query(collection(db, name), where('note_id', 'in', ids)));
        snap.docs.forEach((d) => {
          refs.push({ path: d.ref.path, ref: d.ref });
          if (name === DB.attachments) {
            const storagePath = (d.data() as Attachment).path;
            if (storagePath) storagePaths.push(storagePath);
          }
        });
      })
    )
  );
  return { refs, storagePaths };
}

/** Commit deletes in 500-op batches (Firestore's per-batch limit). */
async function batchDelete(refs: { ref: ReturnType<typeof doc> }[]): Promise<void> {
  for (let i = 0; i < refs.length; i += 500) {
    const batch = writeBatch(db);
    refs.slice(i, i + 500).forEach((r) => batch.delete(r.ref));
    await batch.commit();
  }
}

/** Best-effort removal of Storage objects — never blocks the Firestore delete. */
async function purgeStorage(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { deleteFile } = await import('./storage.service');
  await Promise.allSettled(paths.map((p) => deleteFile(p)));
}

/** Permanently delete a note and every companion document it owns. */
export async function deleteNoteHard(noteId: string): Promise<void> {
  try {
    const { refs, storagePaths } = await collectCompanions([noteId]);
    await batchDelete([...refs, { ref: doc(db, DB.notes, noteId) }]);
    await purgeStorage(storagePaths);
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Soft-delete → moves note to trash (restorable) by stamping `deleted_at`. */
export async function moveToTrash(noteId: string): Promise<Note> {
  return updateNote(noteId, { deleted_at: new Date().toISOString() });
}

export async function restoreFromTrash(noteId: string): Promise<Note> {
  return updateNote(noteId, { deleted_at: null });
}

export async function emptyTrash(userId: string): Promise<number> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.notes), where('user_id', '==', userId))
    );
    const trashed = snap.docs.filter((d) => docToNoteDoc(d).deleted_at);
    if (!trashed.length) return 0;
    const { refs, storagePaths } = await collectCompanions(trashed.map((d) => d.id));
    await batchDelete([...refs, ...trashed.map((d) => ({ ref: d.ref }))]);
    await purgeStorage(storagePaths);
    return trashed.length;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Load all trash entries (soft-deleted notes) for the user. */
export async function fetchTrash(userId: string): Promise<Note[]> {
  try {
    const [snap, tagMap] = await Promise.all([
      getDocs(query(collection(db, DB.notes), where('user_id', '==', userId))),
      getUserTagMap(userId),
    ]);
    return snap.docs
      .map(docToNoteDoc)
      .filter((n) => n.deleted_at)
      .map((n) => mapNote(n, tagMap))
      .sort((a, b) => (b.deleted_at ?? '').localeCompare(a.deleted_at ?? ''));
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Duplicate a note (deep copies content and tags). */
export async function duplicateNote(userId: string, note: Note): Promise<Note> {
  return createNote(userId, {
    title: `${note.title} (copy)`,
    content: note.content,
    content_text: note.content_text,
    color: note.color,
    folder_id: note.folder_id,
    tags: note.tags?.map((t) => t.id),
  });
}

/** Favorite / pin / archive are attribute updates, but kept as explicit helpers. */
export async function toggleFavorite(noteId: string, value: boolean): Promise<void> {
  await patchNote(noteId, { is_favorite: value });
}

export async function togglePin(noteId: string, value: boolean): Promise<void> {
  await patchNote(noteId, { is_pinned: value });
}

export async function toggleArchive(noteId: string, value: boolean): Promise<void> {
  await patchNote(noteId, { is_archived: value });
}

export async function toggleLock(noteId: string, value: boolean): Promise<void> {
  await patchNote(noteId, { is_locked: value });
}

/** Apply color, folder, or label changes. */
export async function setNoteColor(noteId: string, color: NoteColor): Promise<void> {
  await patchNote(noteId, { color });
}

export async function setNoteFolder(noteId: string, folderId: string | null): Promise<void> {
  await patchNote(noteId, { folder_id: folderId });
}

/** Replace the note's tag membership (stored inline as `tag_ids`). */
export async function replaceNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  try {
    await updateDoc(doc(db, DB.notes, noteId), {
      tag_ids: tagIds,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/* ------------------------------------------------------------------ */
/* Versions                                                             */
/* ------------------------------------------------------------------ */

export async function fetchVersions(noteId: string): Promise<NoteVersion[]> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.versions), where('note_id', '==', noteId))
    );
    return snap.docs
      .map((d) => ({ ...(d.data() as NoteVersion), id: d.id }))
      .sort((a, b) => (b.snapshot_at ?? '').localeCompare(a.snapshot_at ?? ''));
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** How many snapshots to retain per note. Older ones are pruned on write. */
const MAX_VERSIONS_PER_NOTE = 30;

/** Snapshot the current note state into the version history. */
export async function snapshotVersion(
  noteId: string,
  title: string,
  content: string | null,
  content_text: string | null,
  userId?: string
): Promise<void> {
  try {
    const id = nanoid();
    await setDoc(doc(db, DB.versions, id), {
      id,
      note_id: noteId,
      user_id: userId ?? null,
      title,
      content,
      content_text,
      snapshot_at: new Date().toISOString(),
    });

    // Prune history so a long-lived note can't grow unbounded.
    const existing = await fetchVersions(noteId);
    const stale = existing.slice(MAX_VERSIONS_PER_NOTE);
    if (stale.length) {
      await batchDelete(stale.map((v) => ({ ref: doc(db, DB.versions, v.id) })));
    }
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function restoreVersion(noteId: string, version: NoteVersion): Promise<Note> {
  return updateNote(noteId, {
    title: version.title,
    content: version.content,
    content_text: version.content_text,
  });
}

/* ------------------------------------------------------------------ */
/* Attachments                                                          */
/* ------------------------------------------------------------------ */

export async function fetchAttachments(noteId: string): Promise<Attachment[]> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.attachments), where('note_id', '==', noteId))
    );
    return snap.docs
      .map((d) => ({ ...(d.data() as Attachment), id: d.id }))
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function createAttachment(
  input: Omit<Attachment, 'id' | 'created_at'>
): Promise<Attachment> {
  try {
    const id = nanoid();
    const row: Attachment = { id, ...input, created_at: new Date().toISOString() };
    await setDoc(doc(db, DB.attachments, id), stripUndefined(row));
    return row;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Delete an attachment record and, when we know it, the Storage object too. */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  try {
    const ref = doc(db, DB.attachments, attachmentId);
    const snap = await getDoc(ref);
    const storagePath = snap.exists() ? (snap.data() as Attachment).path : undefined;
    await deleteDoc(ref);
    if (storagePath) await purgeStorage([storagePath]);
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}
