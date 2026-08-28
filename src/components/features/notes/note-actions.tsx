import { useState } from 'react';
import {
  Pin,
  Star,
  Archive,
  Trash2,
  Copy,
  Palette,
  Share2,
  Download,
  FileText,
  Lock,
  Printer,
  MoreHorizontal,
  FileDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NOTE_COLORS } from '@/constants';
import { toast } from 'react-hot-toast';
import { copyText } from '@/utils/clipboard';
import { exportNoteAsPdf, exportNoteAsTxt } from '@/utils/export';
import { useNoteMutations, useShareNote } from '@/hooks';
import type { Note } from '@/types';

interface NoteActionsProps {
  note: Note;
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

/** Full action menu for a note (pin, color, labels, export, share). */
export function NoteActions({ note, trigger, align = 'center' }: NoteActionsProps) {
  const mutations = useNoteMutations();
  const { share } = useShareNote();
  const [localColor, setLocalColor] = useState(note.color);

  function toggle(field: 'is_pinned' | 'is_favorite' | 'is_archived' | 'is_locked') {
    mutations.update.mutate({ id: note.id, patch: { [field]: !note[field] } });
  }

  function onColor(color: (typeof NOTE_COLORS)[number]['value']) {
    setLocalColor(color);
    mutations.setColor.mutate({ id: note.id, color });
    toast.success('Color updated');
  }

  async function onCopy() {
    const ok = await copyText(note.content_text ?? '');
    toast[ok ? 'success' : 'error'](ok ? 'Note copied' : 'Could not copy');
  }

  function onExportTxt() {
    const ok = exportNoteAsTxt(note);
    toast[ok ? 'success' : 'error'](ok ? 'Exported as .txt' : 'Export failed');
  }

  async function onExportPdf() {
    const ok = await exportNoteAsPdf(note);
    toast[ok ? 'success' : 'error'](ok ? 'Exported as PDF' : 'Export failed');
  }

  async function onShare() {
    const res = await share(note.id);
    toast[res.ok ? 'success' : 'error'](res.message);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>{note.title || 'Untitled'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <MenuItem icon={Pin} active={note.is_pinned} onClick={() => toggle('is_pinned')}>
          {note.is_pinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem icon={Star} active={note.is_favorite} onClick={() => toggle('is_favorite')}>
          {note.is_favorite ? 'Remove favorite' : 'Favorite'}
        </MenuItem>
        <MenuItem icon={Archive} active={note.is_archived} onClick={() => toggle('is_archived')}>
          {note.is_archived ? 'Unarchive' : 'Archive'}
        </MenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Palette className="h-3.5 w-3.5" /> Color
          </p>
          <div className="flex flex-wrap gap-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onColor(c.value)}
                className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                  localColor === c.value ? 'ring-2 ring-ring ring-offset-1' : ''
                }`}
                style={{ background: c.cssVar }}
                aria-label={c.label}
              />
            ))}
          </div>
        </div>
        <DropdownMenuSeparator />
        <MenuItem icon={Lock} active={note.is_locked} onClick={() => { toggle('is_locked'); toast.success(note.is_locked ? 'Note unlocked' : 'Note locked'); }}>
          {note.is_locked ? 'Unlock note' : 'Lock note'}
        </MenuItem>
        <DropdownMenuSeparator />
        <MenuItem icon={Copy} onClick={onCopy}>
          Copy
        </MenuItem>
        <MenuItem icon={FileDown} onClick={onExportPdf}>
          Export PDF
        </MenuItem>
        <MenuItem icon={Download} onClick={onExportTxt}>
          Export text
        </MenuItem>
        <MenuItem icon={Printer} onClick={() => window.print()}>
          Print
        </MenuItem>
        <MenuItem icon={Share2} onClick={onShare}>
          Share
        </MenuItem>
        <MenuItem icon={FileText} onClick={() => toast('Version history is in the editor header', { icon: '📋' })}>
          Version history
        </MenuItem>
        <DropdownMenuSeparator />
        <MenuItem
          icon={Trash2}
          danger
          onClick={() => mutations.moveToTrash.mutate(note.id, { onSuccess: () => toast('Moved to trash', { icon: '🗑️' }) })}
        >
          Delete
        </MenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  active,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className={danger ? 'text-destructive focus:text-destructive' : ''}>
      <Icon className={active ? 'h-4 w-4 text-primary' : 'h-4 w-4'} />
      {children}
    </DropdownMenuItem>
  );
}