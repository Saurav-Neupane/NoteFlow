import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { DB } from '@/constants';
import { nanoid } from '@/utils/id';
import { DatabaseError, ValidationError } from '@/utils/errors';
import type { Folder } from '@/types';

/** Folders + nested folders CRUD (Cloud Firestore). */

export async function fetchFolders(userId: string): Promise<Folder[]> {
  try {
    const snap = await getDocs(
      query(collection(db, DB.folders), where('user_id', '==', userId))
    );
    return snap.docs
      // Stamp the document id so folders written by any path have a usable id.
      .map((d) => ({ ...(d.data() as Folder), id: d.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function createFolder(
  userId: string,
  input: { name: string; color: string; parent_id?: string | null }
): Promise<Folder> {
  try {
    const id = nanoid();
    const now = new Date().toISOString();
    const row: Folder = {
      id,
      user_id: userId,
      name: input.name,
      color: input.color,
      parent_id: input.parent_id ?? null,
      created_at: now,
      updated_at: now,
    };
    await setDoc(doc(db, DB.folders, id), row);
    return row;
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

export async function updateFolder(
  folderId: string,
  patch: Partial<Pick<Folder, 'name' | 'color' | 'parent_id'>>
): Promise<void> {
  // A folder cannot be its own parent — that would orphan it from the tree.
  if (patch.parent_id === folderId) {
    throw new ValidationError('A folder cannot be moved inside itself.');
  }
  try {
    await updateDoc(doc(db, DB.folders, folderId), {
      ...patch,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/**
 * Delete a folder, reparenting its children and un-filing its notes.
 * All three writes go in one batch so the tree can never be left inconsistent.
 */
export async function deleteFolder(folderId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    const [notesSnap, childSnap] = await Promise.all([
      getDocs(query(collection(db, DB.notes), where('folder_id', '==', folderId))),
      getDocs(query(collection(db, DB.folders), where('parent_id', '==', folderId))),
    ]);

    const batch = writeBatch(db);
    notesSnap.docs.forEach((d) => batch.update(d.ref, { folder_id: null, updated_at: now }));
    childSnap.docs.forEach((d) => batch.update(d.ref, { parent_id: null, updated_at: now }));
    batch.delete(doc(db, DB.folders, folderId));
    await batch.commit();
  } catch (err) {
    throw new DatabaseError((err as Error).message, err);
  }
}

/** Build a nested tree for the sidebar. */
export interface FolderNode extends Folder {
  children: FolderNode[];
}

export function buildFolderTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: FolderNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
