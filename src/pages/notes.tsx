import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Star, Archive, Lock, Clock, Trash2, Folder, type LucideIcon } from 'lucide-react';
import { NoteList } from '@/components/features/notes/note-list';
import { SearchBar } from '@/components/features/search/search-bar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SORT_OPTIONS } from '@/constants';
import { useNotes, useFolders, useTags } from '@/hooks';
import type { Note } from '@/types';

type NotesScope = 'all' | 'favorites' | 'recent' | 'archived' | 'locked' | 'trash' | 'folder' | 'tag';

const SCOPE_META: Record<NotesScope, { title: string; icon: LucideIcon }> = {
  all: { title: 'All notes', icon: FileText },
  favorites: { title: 'Favorites', icon: Star },
  recent: { title: 'Recent', icon: Clock },
  archived: { title: 'Archived', icon: Archive },
  locked: { title: 'Locked', icon: Lock },
  trash: { title: 'Trash', icon: Trash2 },
  folder: { title: 'Folder', icon: Folder },
  tag: { title: 'Tag', icon: Star },
};

interface NotesPageProps {
  userId: string;
  /** Scope supplied by enumerated scope routes (/notes/favorites, …). */
  scope?: string;
}

/** Notes listing page with scope/filter/sort + instant search. */
export function NotesPage({ userId, scope: scopeProp }: NotesPageProps) {
  const { scope: scopeParam } = useParams<{ scope?: string }>();
  const scope = scopeProp ?? scopeParam;
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState('updated_desc');
  const { data: notes = [], isLoading } = useNotes(userId);

  const folderId = searchParams.get('folder');
  const tagId = searchParams.get('tag');

  // Resolve the effective scope once so heading, filtering and counts agree.
  const normalized = useMemo<NotesScope>(() => {
    if (folderId) return 'folder';
    if (tagId) return 'tag';
    const s = (scope as NotesScope) || 'all';
    return s in SCOPE_META ? s : 'all';
  }, [folderId, tagId, scope]);

  const scoped = useMemo<Note[]>(() => {
    if (normalized === 'trash') return notes.filter((n) => n.deleted_at);

    let pool = notes.filter((n) => !n.deleted_at);
    switch (normalized) {
      case 'favorites':
        pool = pool.filter((n) => n.is_favorite);
        break;
      case 'archived':
        pool = pool.filter((n) => n.is_archived);
        break;
      case 'locked':
        pool = pool.filter((n) => n.is_locked);
        break;
      case 'folder':
        pool = pool.filter((n) => n.folder_id === folderId);
        break;
      case 'tag':
        pool = pool.filter((n) => n.tags?.some((t) => t.id === tagId));
        break;
      default:
        break;
    }
    return pool;
  }, [notes, normalized, folderId, tagId]);

  // The archived scope intentionally shows archived notes; every other scope
  // hides them. Pinning only applies outside the archived/trash scopes.
  const showsArchived = normalized === 'archived' || normalized === 'trash';
  const pinned = useMemo(
    () => (showsArchived ? [] : scoped.filter((n) => n.is_pinned && !n.is_archived)),
    [scoped, showsArchived]
  );
  const activePool = useMemo(() => {
    const pool = showsArchived ? scoped : scoped.filter((n) => !n.is_pinned && !n.is_archived);
    const [field, dir] = sort.split('_');
    const sorted = [...pool];
    sorted.sort((a, b) => {
      if (field === 'title') return a.title.localeCompare(b.title) * (dir === 'asc' ? 1 : -1);
      const dateKey = field === 'created' ? 'created_at' : 'updated_at';
      return (new Date(b[dateKey]).getTime() - new Date(a[dateKey]).getTime()) * (dir === 'asc' ? -1 : 1);
    });
    return sorted;
  }, [scoped, showsArchived, sort]);

  // Resolve a friendly heading — folder/tag scopes show the entity name.
  const { data: folders = [] } = useFolders(normalized === 'folder' ? userId : undefined);
  const { data: tags = [] } = useTags(normalized === 'tag' ? userId : undefined);
  const meta = SCOPE_META[normalized] ?? SCOPE_META.all;
  const title = useMemo(() => {
    if (normalized === 'folder') return folders.find((f) => f.id === folderId)?.name ?? 'Folder';
    if (normalized === 'tag') return tags.find((t) => t.id === tagId)?.name ?? 'Tag';
    return meta.title;
  }, [normalized, folders, folderId, tags, tagId, meta.title]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <meta.icon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">{scoped.length} {scoped.length === 1 ? 'note' : 'notes'}</p>
          </div>
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SearchBar notes={scoped} placeholder={`Search ${title.toLowerCase()}…`} />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <NoteList
          notes={activePool}
          pinned={pinned}
          loading={isLoading}
          emptyTitle={title}
          emptyDescription={`No notes in ${title.toLowerCase()}. Create one to get going.`}
          emptyIcon={meta.icon}
        />
      </motion.div>
    </div>
  );
}