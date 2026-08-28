import type { Note, SearchFilters } from '@/types';

/** Client-side instant search across the note cache. Mirrors the FTS index
 *  defined in the SQL schema so results are consistent online and offline. */

const STOPWORDS = new Set([
  'the','a','an','and','or','of','to','in','on','for','is','are','was','be',
  'at','by','with','from','as','that','this','on','it','…',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface SearchResult {
  note: Note;
  /** Score used for relevance ranking (higher = better). */
  score: number;
  matchedInTitle: boolean;
}

function rank(note: Note, tokens: string[]): number {
  const title = note.title.toLowerCase();
  const content = (note.content_text ?? '').toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 8;
    if (title.startsWith(t)) score += 4;
    const idx = content.indexOf(t);
    if (idx >= 0) score += 3;
  }
  return score;
}

export function searchNotes(
  notes: Note[],
  query: string,
  filters: Partial<SearchFilters> = {}
): SearchResult[] {
  const tokens = tokenize(query || '');
  const { category = 'all', tags = [], from = null, to = null } = filters;

  let pool = notes.filter((n) => {
    // Scope category
    switch (category) {
      case 'all':
        return !n.deleted_at && !n.is_archived;
      case 'favorites':
        return n.is_favorite && !n.deleted_at;
      case 'locked':
        return n.is_locked && !n.deleted_at;
      case 'archived':
        return n.is_archived && !n.deleted_at;
      case 'trash':
        return !!n.deleted_at;
      default:
        return !n.deleted_at;
    }
  });

  if (tags.length) {
    pool = pool.filter((n) =>
      tags.every((tagId) => n.tags?.some((t) => t.id === tagId))
    );
  }

  if (from) {
    const f = new Date(from).getTime();
    pool = pool.filter((n) => new Date(n.updated_at).getTime() >= f);
  }
  if (to) {
    const d = new Date(to).getTime() + 86_400_000; // inclusive end-of-day
    pool = pool.filter((n) => new Date(n.updated_at).getTime() <= d);
  }

  if (!tokens.length) {
    return pool.map((note) => ({ note, score: 0, matchedInTitle: false }));
  }

  return pool
    .map((note) => ({
      note,
      score: rank(note, tokens),
      matchedInTitle: tokens.some((t) => note.title.toLowerCase().includes(t)),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Strip HTML for search previews. */
export function previewFor(note: Note, maxLength = 160): string {
  const text = (note.content_text ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '…' : text;
}

export type { Note };