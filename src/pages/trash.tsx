import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTrash, useNoteMutations } from '@/hooks';
import { noteColorVar } from '@/constants';
import { formatRelative } from '@/utils/date';
import toast from 'react-hot-toast';

interface TrashProps {
  userId: string;
}

/** Trash manager: restore or permanently delete notes. */
export function TrashPage({ userId }: TrashProps) {
  const { data: trash = [], isLoading } = useTrash(userId);
  const mutations = useNoteMutations();
  const navigate = useNavigate();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  function restore(noteId: string) {
    mutations.restore.mutate(noteId, { onSuccess: () => toast.success('Note restored') });
  }

  const pendingTitle = trash.find((n) => n.id === pendingDelete)?.title || 'Untitled';

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold leading-tight">Trash</h1>
            <p className="text-xs text-muted-foreground">
              {trash.length > 0 ? `${trash.length} ${trash.length === 1 ? 'note' : 'notes'} in trash` : 'Notes stay here until you delete them.'}
            </p>
          </div>
        </div>
        {trash.length > 0 && (
          <Button variant="destructive" size="sm" onClick={() => setConfirmEmpty(true)}>
            <Trash className="h-4 w-4" />
            Empty trash
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : trash.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Deleted notes will appear here so you can restore them."
          action={<Button variant="outline" onClick={() => navigate('/notes')}>Browse notes</Button>}
        />
      ) : (
        <div className="space-y-2">
          {trash.map((note) => (
            <motion.div
              key={note.id}
              layout
              className="flex items-center gap-3 rounded-2xl border bg-card/60 px-4 py-3"
              style={{ background: noteColorVar(note.color) }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{note.title || 'Untitled'}</p>
                <p className="text-xs text-muted-foreground">{formatRelative(note.deleted_at ?? note.updated_at)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => restore(note.id)}>
                <RotateCcw className="h-4 w-4" />
                Restore
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Permanently delete ${note.title || 'Untitled'}`}
                onClick={() => setPendingDelete(note.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        title="Empty trash?"
        description="This permanently deletes every note in the trash, along with their attachments. This cannot be undone."
        confirmLabel="Empty trash"
        destructive
        onConfirm={async () => {
          const count = await mutations.emptyTrash.mutateAsync(userId);
          toast.success(count > 0 ? `Deleted ${count} ${count === 1 ? 'note' : 'notes'}` : 'Trash was already empty');
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Delete permanently?"
        description={`"${pendingTitle}" and its attachments will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete forever"
        destructive
        onConfirm={async () => {
          if (!pendingDelete) return;
          await mutations.remove.mutateAsync(pendingDelete);
          toast.success('Note deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
