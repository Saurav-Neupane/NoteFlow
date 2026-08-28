import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search,
  FileText,
  Settings,
  Folder,
  Trash,
  Star,
  Home,
  Tag,
  Plus,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUIStore } from '@/stores';
import type { Note } from '@/types';

interface CommandPaletteProps {
  notes: Note[];
}

/** Global ⌘K command palette for instant search + navigation. */
export function CommandPalette({ notes }: CommandPaletteProps) {
  const open = useUIStore((s) => s.commandSearchOpen);
  const setOpen = useUIStore((s) => s.setCommandSearchOpen);
  const navigate = useNavigate();

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  const filtered = notes
    .filter((n) => !n.deleted_at)
    .filter((n) => {
      const q = query.trim().toLowerCase();
      if (!q) return false;
      return (
        n.title.toLowerCase().includes(q) ||
        (n.content_text ?? '').toLowerCase().includes(q)
      );
    })
    .slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0" hideCloseButton>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">Search notes and navigate the app.</DialogDescription>
        <Command className="rounded-2xl" shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search notes, commands…  (⌘K)"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 && query && (
              <Command.Empty className="p-6 text-center text-sm text-muted-foreground">
                No notes found for “{query}”
              </Command.Empty>
            )}

            <Command.Group heading="Notes" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {filtered.map((note) => (
                <Command.Item
                  key={note.id}
                  value={`note-${note.id}`}
                  onSelect={() => go(`/notes/${note.id}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{note.title || 'Untitled'}</span>
                  {note.is_pinned && <Star className="h-3.5 w-3.5 text-amber-500" />}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {[
                { label: 'Home', icon: Home, path: '/dashboard', group: 'home' },
                { label: 'All notes', icon: FileText, path: '/notes', group: 'notes' },
                { label: 'Folders', icon: Folder, path: '/folders', group: 'folders' },
                { label: 'Tags', icon: Tag, path: '/tags', group: 'tags' },
                { label: 'Trash', icon: Trash, path: '/trash', group: 'trash' },
                { label: 'Settings', icon: Settings, path: '/settings', group: 'settings' },
              ].map((item) => (
                <Command.Item
                  key={item.label}
                  value={item.label.toLowerCase()}
                  onSelect={() => go(item.path)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {item.label}
                </Command.Item>
              ))}
              <Command.Item
                value="new note"
                onSelect={() => go('/notes/new')}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-accent"
              >
                <Plus className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium text-primary">New note</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}