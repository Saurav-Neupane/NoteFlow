/** Core domain types for NoteFlow. */

/** A note color keyed off the design-system note palette. */
export type NoteColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

export type ViewMode = 'grid' | 'list';

export type Priority = 'low' | 'medium' | 'high';

export type ThemeMode = 'light' | 'dark' | 'system';

/** First-party orderings, in addition to arbitrary sortBy/order fields. */
export type SortKey =
  | 'none'
  | 'created_desc'
  | 'created_asc'
  | 'updated_desc'
  | 'title_asc'
  | 'title_desc';

/** Realtime note-sync payload emitted by the Firestore snapshot listener. */
export interface NoteRealtimePayload {
  new: Note;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

/** A structured permission model for sharing (locked notes / collaborators). */
export type SharingAccess = 'view' | 'edit';

/** Basic user profile stored in `profiles`. */
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  settings: UserSettings;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  note_id: string;
  user_id: string;
  type: 'image' | 'video' | 'file' | 'pdf' | 'drawing';
  name: string;
  url: string;
  /** Storage object path — required to delete the underlying file. */
  path?: string;
  size: number;
  created_at: string;
}

/** One snapshot in the note's version history. */
export interface NoteVersion {
  id: string;
  note_id: string;
  title: string;
  content: string | null;
  content_text: string | null;
  snapshot_at: string;
}

/** A note invariant of the source of truth (database). */
export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string | null;
  /** Plain-text, searchable and truncated for cards. */
  content_text: string | null;
  /** Optional note color. */
  color: NoteColor;
  is_pinned: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  is_locked: boolean;
  /** AES passphrase hash (for encrypted notes) — stored server-side only. */
  encryption_hash?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  shared_with: string[] | null;
  sharing_access?: SharingAccess;
  /** companion objects loaded with the note */
  tags?: Tag[];
  attachments?: Attachment[];
}

/** User-to-user share association. */
export interface NoteShare {
  id: string;
  note_id: string;
  owner_id: string;
  shared_with_id: string;
  access: SharingAccess;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  target: string;
  created_at: string;
}

export interface SearchFilters {
  query: string;
  category: 'all' | 'favorites' | 'locked' | 'archived' | 'trash' | 'none';
  tags: string[];
  from: string | null;
  to: string | null;
}

export interface UserSettings {
  theme: ThemeMode;
  accent: string;
  font_size: 'sm' | 'md' | 'lg';
  view_mode: ViewMode;
  default_note_color: NoteColor;
  auto_save: boolean;
  auto_save_delay: number;
  reduce_motion: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  accent: '#6366f1',
  font_size: 'md',
  view_mode: 'grid',
  default_note_color: 'default',
  auto_save: true,
  auto_save_delay: 800,
  reduce_motion: false,
};

export type NoteSubscription =
  | { status: 'free' }
  | { status: 'pro'; expires_at: string };

/** Aggregate statistics used on the home dashboard. */
export interface NoteStats {
  total: number;
  pinned: number;
  favorites: number;
  archived: number;
  trash: number;
  words: number;
  read_time_minutes: number;
}

/** Result envelope for every service call. */
export interface Result<T> {
  data: T | null;
  error: string | null;
}