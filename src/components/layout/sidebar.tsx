import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  FileText,
  Star,
  Clock,
  Archive,
  Trash2,
  Lock,
  Folder,
  Tag,
  Settings,
  Plus,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { useFolders, useTags } from '@/hooks';
import { useSettingsStore } from '@/stores';
import { buildFolderTree } from '@/services/folder.service';
import type { Note } from '@/types';

interface SidebarProps {
  notes: Note[];
  userId: string;
  collapsed: boolean;
  onToggle: () => void;
}

/** Primary navigation rail — categories, folders, tags, settings. */
export function Sidebar({ notes, userId, collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const settings = useSettingsStore((s) => s.settings);

  const foldersQuery = useFolders(userId);
  const tagsQuery = useTags(userId);
  const folders = buildFolderTree(foldersQuery.data ?? []);
  const counts = countByCategory(notes);

  const categories = [
    { key: '/dashboard', label: 'Home', icon: Home, count: 0 },
    { key: '/notes', label: 'All notes', icon: FileText, count: counts.all },
    { key: '/notes/favorites', label: 'Favorites', icon: Star, count: counts.favorites },
    { key: '/notes/recent', label: 'Recent', icon: Clock, count: 0 },
    { key: '/notes/archived', label: 'Archived', icon: Archive, count: counts.archived },
    { key: '/notes/locked', label: 'Locked', icon: Lock, count: counts.locked },
    { key: '/trash', label: 'Trash', icon: Trash2, count: counts.trash },
  ];

  const isActive = (key: string) =>
    pathname === key || (key !== '/notes' && pathname.startsWith(`${key}/`));

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      <button
        className="flex items-center gap-2 px-4 py-4"
        onClick={() => {
          if (collapsed) onToggle();
          else navigate('/dashboard');
        }}
      >
        <div className="fab-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
          <FileText className="h-5 w-5" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col text-left"
          >
            <span className="font-display text-lg font-bold tracking-tight">NoteFlow</span>
            <span className="-mt-1 text-[10px] text-muted-foreground">v1.0</span>
          </motion.div>
        )}
      </button>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {collapsed ? (
          <CollapsedNav categories={categories} folders={folders} tags={tagsQuery.data ?? []} isActive={isActive} navigate={navigate} />
        ) : (
          <ExpandedNav categories={categories} folders={folders} tags={tagsQuery.data ?? []} isActive={isActive} navigate={navigate} />
        )}
      </div>

      <div className="border-t border-sidebar-border p-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/settings')}
                className={cn('flex h-10 w-full items-center justify-center rounded-xl hover:bg-accent', isActive('/settings') && 'bg-accent text-primary')}
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => navigate('/settings')}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              isActive('/settings') && 'bg-accent text-primary'
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
            <span className="ml-auto text-xs text-muted-foreground">
              {settings.font_size === 'lg' ? 'A+' : settings.font_size === 'sm' ? 'A-' : 'A'}
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}

function countByCategory(notes: Note[]) {
  const active = notes.filter((n) => !n.deleted_at);
  return {
    all: active.length,
    favorites: active.filter((n) => n.is_favorite).length,
    archived: active.filter((n) => n.is_archived).length,
    locked: active.filter((n) => n.is_locked).length,
    trash: notes.filter((n) => n.deleted_at).length,
  };
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

function ExpandedNav({
  categories,
  folders,
  tags,
  isActive,
  navigate,
}: {
  categories: NavItem[];
  folders: ReturnType<typeof buildFolderTree>;
  tags: { id: string; name: string; color: string }[];
  isActive: (k: string) => boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="space-y-0.5">
      {categories.map((c) => (
        <NavRow key={c.key} item={c} active={isActive(c.key)} onClick={() => navigate(c.key)} />
      ))}

      <SectionLabel label="Folders" onAdd={() => navigate('/folders')} />
      {folders.map((f) => (
        <FolderRow key={f.id} folder={f} navigate={navigate} isActive={isActive} />
      ))}

      <SectionLabel label="Tags" onAdd={() => navigate('/tags')} />
      {tags.slice(0, 8).map((t) => (
        <button
          key={t.id}
          onClick={() => navigate(`/notes?tag=${t.id}`)}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
          <span className="min-w-0 flex-1 truncate text-left">{t.name}</span>
        </button>
      ))}

      <SectionLabel label="Workspace" />
      <NavRow item={{ key: '/trash', label: 'Trash', icon: Trash2 }} active={false} onClick={() => navigate('/trash')} />
    </div>
  );
}

function FolderRow({
  folder,
  navigate,
  isActive,
  depth = 0,
}: {
  folder: ReturnType<typeof buildFolderTree>[number];
  navigate: ReturnType<typeof useNavigate>;
  isActive: (k: string) => boolean;
  depth?: number;
}) {
  return (
    <div>
      <button
        onClick={() => navigate(`/notes?folder=${folder.id}`)}
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl py-2 text-sm transition-colors hover:bg-accent',
          'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="w-3.5 shrink-0" />
        <Folder className="h-4 w-4 shrink-0" style={{ color: folder.color }} />
        <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
      </button>
      {folder.children.map((child) => (
        <FolderRow key={child.id} folder={child} navigate={navigate} isActive={isActive} depth={depth + 1} />
      ))}
    </div>
  );
}

function CollapsedNav({
  categories,
  folders,
  tags,
  isActive,
  navigate,
}: {
  categories: NavItem[];
  folders: ReturnType<typeof buildFolderTree>;
  tags: { id: string; color: string }[];
  isActive: (k: string) => boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {categories.map((c) => (
        <Tooltip key={c.key}>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate(c.key)}
              className={cn('flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-accent', isActive(c.key) && 'bg-accent text-primary')}
            >
              <c.icon className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{c.label}</TooltipContent>
        </Tooltip>
      ))}
      <div className="my-2 h-px w-8 bg-border" />
      {folders.slice(0, 3).map((f) => (
        <Tooltip key={f.id}>
          <TooltipTrigger asChild>
            <button onClick={() => navigate(`/notes?folder=${f.id}`)} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-accent">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: f.color }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{f.name}</TooltipContent>
        </Tooltip>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => navigate('/folders')} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-accent">
            <Plus className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Folders</TooltipContent>
      </Tooltip>
      <div className="my-2 h-px w-8 bg-border" />
      {tags.slice(0, 3).map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <button onClick={() => navigate('/tags')} className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-accent">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Tag</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function NavRow({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
      {typeof item.count === 'number' && item.count > 0 && (
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {item.count > 99 ? '99+' : item.count}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <div className="mt-4 mb-1 flex items-center justify-between px-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</span>
      {onAdd && (
        <button onClick={onAdd} className="rounded-md p-0.5 text-muted-foreground/60 hover:text-foreground" aria-label={`Add ${label}`}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}