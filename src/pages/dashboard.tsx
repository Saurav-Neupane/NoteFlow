import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  Star,
  Clock,
  Archive,
  Lock,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Folder,
  Tag,
} from 'lucide-react';
import { SearchBar } from '@/components/features/search/search-bar';
import { NoteCard } from '@/components/features/notes/note-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { greetingFor, formatFullDate } from '@/utils/date';
import { formatNumber } from '@/utils/format';
import { useNotes } from '@/hooks';
import type { Note } from '@/types';

interface DashboardProps {
  userId: string;
}

/** Home dashboard: greeting, search, stats, pinned/recent/favorite, quick actions. */
export function DashboardPage({ userId }: DashboardProps) {
  const navigate = useNavigate();
  const { data: notes = [], isLoading } = useNotes(userId);

  const active = useMemo(() => notes.filter((n) => !n.deleted_at && !n.is_archived), [notes]);
  const pinned = useMemo(() => active.filter((n) => n.is_pinned).slice(0, 8), [active]);
  const favorites = useMemo(() => active.filter((n) => n.is_favorite).slice(0, 8), [active]);
  const recent = useMemo(
    () => [...active].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8),
    [active]
  );
  const locked = useMemo(() => active.filter((n) => n.is_locked).length, [active]);
  const archived = useMemo(() => notes.filter((n) => n.is_archived && !n.deleted_at).length, [notes]);
  const trash = useMemo(() => notes.filter((n) => n.deleted_at).length, [notes]);

  const stats = [
    { label: 'All notes', value: active.length, icon: FileText, color: 'text-primary bg-primary/10', to: '/notes' },
    { label: 'Pinned', value: pinned.length, icon: CheckCircle2, color: 'text-amber-500 bg-amber-500/10', to: '/notes' },
    { label: 'Favorites', value: favorites.length, icon: Star, color: 'text-rose-500 bg-rose-500/10', to: '/notes/favorites' },
    { label: 'Locked', value: locked, icon: Lock, color: 'text-violet-500 bg-violet-500/10', to: '/notes/locked' },
    { label: 'Archived', value: archived, icon: Archive, color: 'text-slate-500 bg-slate-500/10', to: '/notes/archived' },
    { label: 'Trash', value: trash, icon: Trash2, color: 'text-red-500 bg-red-500/10', to: '/trash' },
  ];

  const quickActions = [
    { label: 'New note', icon: Plus, onClick: () => navigate('/notes/new'), gradient: 'from-indigo-500 to-violet-500' },
    { label: 'All notes', icon: FileText, onClick: () => navigate('/notes'), gradient: 'from-sky-500 to-blue-500' },
    { label: 'Favorites', icon: Star, onClick: () => navigate('/notes/favorites'), gradient: 'from-rose-500 to-pink-500' },
    { label: 'Folder', icon: Folder, onClick: () => navigate('/folders'), gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Tag', icon: Tag, onClick: () => navigate('/tags'), gradient: 'from-pink-500 to-rose-500' },
    { label: 'Archived', icon: Archive, onClick: () => navigate('/notes/archived'), gradient: 'from-purple-500 to-fuchsia-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting + date */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl"
          >
            {greetingFor()} 👋
          </motion.h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatFullDate(new Date().toISOString())}</p>
        </div>
        <Button onClick={() => navigate('/notes/new')}>
          <Plus className="h-4 w-4" />
          New note
        </Button>
      </div>

      <SearchBar notes={active} placeholder="Search your notes…" />

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {quickActions.map((qa, i) => (
          <motion.button
            key={qa.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={qa.onClick}
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card/60 p-4 transition-shadow hover:shadow-md"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${qa.gradient}`}>
              <qa.icon className="h-5 w-5" />
            </span>
            <span className="text-center text-xs font-medium">{qa.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Stats */}
      <div>
        <SectionTitle icon={TrendingUp} title="Statistics" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate(s.to)}
              className="flex items-center gap-3 rounded-2xl border bg-card/60 p-3 text-left transition-colors hover:bg-accent/60"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-lg font-bold leading-none">{isLoading ? '—' : formatNumber(s.value)}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Pinned */}
      {!isLoading && pinned.length > 0 && (
        <Section>
          <SectionHeader title="Pinned notes" icon={CheckCircle2} to="/notes" count={pinned.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pinned.map((note, i) => <NoteCard key={note.id} note={note} index={i} />)}
          </div>
        </Section>
      )}

      {/* Recent */}
      <Section>
        <SectionHeader title="Recent notes" icon={Clock} to="/notes/recent" count={recent.length} />
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : recent.length === 0 ? (
          <EmptyNotes onCreate={() => navigate('/notes/new')} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((note, i) => <NoteCard key={note.id} note={note} index={i} />)}
          </div>
        )}
      </Section>

      {/* Favorites */}
      {!isLoading && favorites.length > 0 && (
        <Section>
          <SectionHeader title="Favorites" icon={Star} to="/notes/favorites" count={favorites.length} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((note, i) => <NoteCard key={note.id} note={note} index={i} />)}
          </div>
        </Section>
      )}

      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-fuchsia-500/10 to-primary/10 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">NoteFlow Pro</p>
            <p className="text-xs text-muted-foreground">AI summaries, handwriting, and more — coming soon.</p>
          </div>
          <Button variant="outline" size="sm">Learn more</Button>
        </div>
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
      <Icon className="h-4 w-4" />
      {title}
    </h2>
  );
}

function SectionHeader({ title, icon: Icon, to, count }: { title: string; icon: React.ComponentType<{ className?: string }>; to: string; count: number }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} className="mb-3 flex w-full items-center gap-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground">
      <Icon className="h-4 w-4" />
      {title}
      <span className="text-xs font-normal text-muted-foreground/70">{count}</span>
      <span className="ml-auto text-xs text-primary">View all →</span>
    </button>
  );
}

function EmptyNotes({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
      <Sparkles className="h-8 w-8 text-primary/50" />
      <div>
        <p className="text-sm font-semibold">Your canvas awaits</p>
        <p className="mt-1 text-xs text-muted-foreground">Capture your first idea with NoteFlow.</p>
      </div>
      <Button onClick={onCreate} size="sm">
        <Plus className="mr-1.5 h-4 w-4" />
        Create note
      </Button>
    </div>
  );
}