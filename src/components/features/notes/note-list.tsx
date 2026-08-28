import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Table2, LayoutGrid, Star, Plus, type LucideIcon } from 'lucide-react';
import { NoteCard } from './note-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useUIStore } from '@/stores';
import { useIsMobile } from '@/hooks';
import type { Note } from '@/types';

interface NoteListProps {
  notes: Note[];
  loading?: boolean;
  pinned?: Note[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  /** Optional handler for the empty-state action; defaults to creating a note. */
  onCreate?: () => void;
}

/** Responsive masonry-style grid + list toggle with layout animation. */
export function NoteList({
  notes,
  loading = false,
  pinned = [],
  emptyTitle = 'No notes here yet',
  emptyDescription = 'Create your first note to get started.',
  emptyIcon,
  onCreate,
}: NoteListProps) {
  const navigate = useNavigate();
  const { viewMode, setViewMode } = useUIStore();
  const isMobile = useIsMobile();
  const resolvedView = isMobile ? 'grid' : viewMode;
  const isEmpty = !loading && notes.length === 0 && pinned.length === 0;

  const groups = useMemo(() => {
    const sections: { label?: string; items: Note[] }[] = [];
    if (pinned.length) sections.push({ label: 'Pinned', items: pinned });
    if (notes.length) sections.push({ label: 'Notes', items: notes });
    return sections;
  }, [pinned, notes]);

  if (loading) {
    return <NoteGridSkeleton />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon ?? Star}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button onClick={() => (onCreate ? onCreate() : navigate('/notes/new'))}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create a note
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-1 sm:hidden">
        <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            {group.label && (
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
                {group.label}
                <span className="text-xs font-normal text-muted-foreground/70">
                  {group.items.length}
                </span>
              </h2>
            )}
            <div
              className={
                resolvedView === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'flex flex-col gap-3'
              }
            >
              <AnimatePresence mode="popLayout">
                {group.items.map((note, i) => (
                  <NoteCard key={note.id} note={note} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: 'grid' | 'list';
  onToggle: (v: 'grid' | 'list') => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-muted p-1">
      <Button variant="ghost" size="icon-sm" onClick={() => onToggle('grid')} className={viewMode === 'grid' ? 'bg-background shadow-sm' : ''}>
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => onToggle('list')} className={viewMode === 'list' ? 'bg-background shadow-sm' : ''}>
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function NoteGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
          className="skeleton h-44 rounded-2xl"
        />
      ))}
    </div>
  );
}

