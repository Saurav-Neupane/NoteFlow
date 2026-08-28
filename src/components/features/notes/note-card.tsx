import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Pin,
  Star,
  Trash2,
  Image as ImageIcon,
  FileText,
  Lock,
} from 'lucide-react';
import { noteColorVar } from '@/constants';
import { formatRelative } from '@/utils/date';
import { useNoteMutations, useIsMobile } from '@/hooks';
import toast from 'react-hot-toast';
import type { Note } from '@/types';

interface NoteCardProps {
  note: Note;
  index?: number;
  optimistic?: boolean;
}

/** A single note card (grid/list aware) with hover/press motion. */
export const NoteCard = memo(function NoteCard({ note, index = 0, optimistic }: NoteCardProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mutations = useNoteMutations();

  const bg = noteColorVar(note.color);
  const hasAttachment = !!note.attachments?.length;

  function togglePinned(e: React.MouseEvent) {
    e.stopPropagation();
    mutations.toggleFlag.mutate({ id: note.id, flag: 'is_pinned', value: !note.is_pinned });
  }
  function toggleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    mutations.toggleFlag.mutate({ id: note.id, flag: 'is_favorite', value: !note.is_favorite });
  }
  function onTrash(e: React.MouseEvent) {
    e.stopPropagation();
    mutations.moveToTrash.mutate(note.id, {
      onSuccess: () => toast.success('Moved to trash'),
    });
  }

  return (
    <motion.button
      layout={!optimistic}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, delay: isMobile ? 0 : Math.min(index * 0.02, 0.1) }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/notes/${note.id}`)}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition-shadow hover:shadow-md focus-ring ${
        optimistic ? 'opacity-70' : ''
      }`}
      style={{ background: bg }}
    >
      <div className="relative flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {note.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
            {note.is_locked && <Lock className="h-3.5 w-3.5 shrink-0 text-violet-500" />}
            {note.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-400" />}
            <h3 className="truncate text-[15px] font-semibold leading-tight">
              {note.title || 'Untitled'}
            </h3>
          </div>
          <div className="flex gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <IconBtn label="Pin" active={note.is_pinned} onClick={togglePinned}>
              <Pin className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Favorite" active={note.is_favorite} onClick={toggleFavorite}>
              <Star className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Delete" onClick={onTrash}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </div>

        {note.is_locked ? (
          <p className="flex items-center gap-1.5 text-sm italic text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Locked — open to view
          </p>
        ) : (
          note.content_text && (
            <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">
              {note.content_text}
            </p>
          )
        )}

        {hasAttachment && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            {note.attachments![0].type === 'image' && <ImageIcon className="h-3 w-3" />}
            {note.attachments![0].type === 'file' && <FileText className="h-3 w-3" />}
            {note.attachments![0].name.slice(0, 30)}
          </div>
        )}

        {note.tags && note.tags.length > 0 && (
          <div className="mt-3 flex items-center gap-2 pt-1">
            {note.tags.slice(0, 3).map((t) => (
              <span
                key={t.id}
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: `${t.color}33`, color: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-[11px] text-muted-foreground">
            {formatRelative(note.updated_at)}
          </span>
        </div>
      </div>
    </motion.button>
  );
});

function IconBtn({
  label,
  children,
  onClick,
  active,
}: {
  label: string;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}