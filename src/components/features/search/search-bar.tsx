import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, Star, Lock, Archive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks';
import { searchNotes } from '@/services/search.service';
import type { Note, SearchFilters } from '@/types';

interface SearchBarProps {
  notes: Note[];
  placeholder?: string;
  /** When true, clicking a result opens the note. */
  navigable?: boolean;
}

const CATEGORY_OPTIONS: { value: SearchFilters['category']; label: string }[] = [
  { value: 'all', label: 'All notes' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'locked', label: 'Locked' },
  { value: 'archived', label: 'Archived' },
  { value: 'trash', label: 'Trash' },
];

/** Instant, client-side search with advanced filters + dropdown results. */
export function SearchBar({ notes, placeholder = 'Search notes…', navigable = true }: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<SearchFilters>>({});
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 120);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const results = useMemo(() => {
    const q = debouncedQuery.trim();
    const hasFilters = (filters.category && filters.category !== 'all') || !!filters.tags?.length || filters.from || filters.to;
    if (!q && !hasFilters) return [];
    return searchNotes(notes, q, filters).slice(0, 6);
  }, [debouncedQuery, filters, notes]);

  const activeFilterCount =
    (filters.category && filters.category !== 'all' ? 1 : 0) +
    (filters.tags?.length ?? 0);

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className="h-11 rounded-2xl bg-muted/60 pl-10 pr-16 backdrop-blur-md"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setQuery('');
                setFilters({});
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Scope</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_OPTIONS.map((c) => (
                      <Badge
                        key={c.value}
                        variant={(filters.category ?? 'all') === c.value ? 'default' : 'outline'}
                        className="cursor-pointer select-none"
                        onClick={() => setFilters((f) => ({ ...f, category: c.value }))}
                      >
                        {c.value === 'favorites' && <Star className="mr-1 h-3 w-3" />}
                        {c.value === 'locked' && <Lock className="mr-1 h-3 w-3" />}
                        {c.value === 'archived' && <Archive className="mr-1 h-3 w-3" />}
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">From</p>
                    <Input
                      type="date"
                      value={filters.from ?? ''}
                      onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || null }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">To</p>
                    <Input
                      type="date"
                      value={filters.to ?? ''}
                      onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || null }))}
                      className="h-9"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setFilters({})}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {showResults && (query.trim() || activeFilterCount > 0) && (
        <div className="glass-strong absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border p-2">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Search className="h-6 w-6" />
              <span>No notes match “{query}”</span>
            </div>
          ) : (
            results.map(({ note, matchedInTitle }) => (
              <button
                key={note.id}
                onClick={() => {
                  setShowResults(false);
                  if (navigable) navigate(`/notes/${note.id}`);
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <div
                  className="mt-0.5 h-8 w-8 shrink-0 rounded-lg"
                  style={{ background: `var(--note-${note.color})` }}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${matchedInTitle ? 'text-primary' : ''}`}>
                    {note.title || 'Untitled'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {(note.content_text ?? '').slice(0, 80)}
                  </p>
                </div>
                {note.tags?.slice(0, 2).map((t) => (
                  <span
                    key={t.id}
                    className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ background: t.color }}
                    title={t.name}
                  />
                ))}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}