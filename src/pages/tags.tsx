import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag, Tags, Pencil, Trash2, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TAG_COLORS } from '@/constants';
import { useTags, useTagUsage, useTagMutations } from '@/hooks';
import toast from 'react-hot-toast';
import type { Tag as TagType } from '@/types';

interface TagsProps {
  userId: string;
}

/** Tags manager with color picker and usage counts. */
export function TagsPage({ userId }: TagsProps) {
  const { data: tags = [] } = useTags(userId);
  const { data: usage = {} } = useTagUsage(userId);
  const mutations = useTagMutations();
  const navigate = useNavigate();

  const [dialog, setDialog] = useState<null | { mode: 'create' | 'edit'; tag?: TagType }>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);
  const [pendingDelete, setPendingDelete] = useState<TagType | null>(null);

  const duplicate = tags.some(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase() && t.id !== dialog?.tag?.id
  );

  function submit() {
    const trimmed = name.trim();
    if (!trimmed || duplicate) return;
    if (dialog?.mode === 'create') {
      mutations.create.mutate(
        { userId, name: trimmed, color },
        { onSuccess: () => toast.success('Tag created') }
      );
    } else if (dialog?.mode === 'edit' && dialog.tag) {
      mutations.update.mutate(
        { id: dialog.tag.id, patch: { name: trimmed, color } },
        { onSuccess: () => toast.success('Tag updated') }
      );
    }
    setDialog(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">Label notes for quick filtering.</p>
        </div>
        <Button
          onClick={() => {
            setName('');
            setColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]);
            setDialog({ mode: 'create' });
          }}
        >
          <Tags className="h-4 w-4" />
          New tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <Tag className="h-10 w-10 text-primary/40" />
          <p className="text-sm font-semibold">No tags yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tags.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="group flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${t.color}22` }}>
                <Hash className="h-4 w-4" style={{ color: t.color }} />
              </span>
              <button onClick={() => navigate(`/notes?tag=${t.id}`)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {usage[t.id] ? `${usage[t.id]} ${usage[t.id] === 1 ? 'note' : 'notes'}` : 'No notes yet'}
                </span>
              </button>
              <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  aria-label={`Edit ${t.name}`}
                  onClick={() => { setName(t.name); setColor(t.color); setDialog({ mode: 'edit', tag: t }); }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Delete ${t.name}`}
                  onClick={() => setPendingDelete(t)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'edit' ? 'Edit tag' : 'New tag'}</DialogTitle>
            <DialogDescription>Label your notes for quick filtering.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. idea" autoFocus />
              {duplicate && <p className="mt-1 text-xs text-destructive">A tag with this name already exists.</p>}
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Color</Label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-ring ring-offset-2' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={submit} disabled={!name.trim() || duplicate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description={
          pendingDelete && usage[pendingDelete.id]
            ? `This tag is used on ${usage[pendingDelete.id]} ${usage[pendingDelete.id] === 1 ? 'note' : 'notes'}. Deleting it removes the label from those notes.`
            : 'This tag will be removed. This cannot be undone.'
        }
        confirmLabel="Delete tag"
        destructive
        onConfirm={async () => {
          if (!pendingDelete) return;
          await mutations.remove.mutateAsync(pendingDelete.id);
          toast.success('Tag deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}