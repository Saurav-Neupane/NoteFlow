import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Folder, FolderPlus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FOLDER_COLORS } from '@/constants';
import { useFolders, useFolderMutations } from '@/hooks';
import { buildFolderTree } from '@/services/folder.service';
import toast from 'react-hot-toast';
import type { Folder as FolderType } from '@/types';

interface FoldersProps {
  userId: string;
}

/** Folders manager: create, rename, recolor, delete (nested aware). */
export function FoldersPage({ userId }: FoldersProps) {
  const { data: folders = [] } = useFolders(userId);
  const mutations = useFolderMutations();
  const navigate = useNavigate();

  const [dialog, setDialog] = useState<null | { mode: 'create' | 'edit'; folder?: FolderType; parentId?: string | null }>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [pendingDelete, setPendingDelete] = useState<FolderType | null>(null);

  const tree = buildFolderTree(folders);

  function openCreate(parentId: string | null = null) {
    setName('');
    setColor(FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]);
    setDialog({ mode: 'create', parentId });
  }

  function openEdit(folder: FolderType) {
    setName(folder.name);
    setColor(folder.color);
    setDialog({ mode: 'edit', folder });
  }

  function submit() {
    if (!name.trim()) return;
    if (dialog?.mode === 'create') {
      mutations.create.mutate(
        { userId, name: name.trim(), color, parent_id: dialog.parentId ?? null },
        { onSuccess: () => toast.success('Folder created') }
      );
    } else if (dialog?.mode === 'edit' && dialog.folder) {
      mutations.update.mutate(
        { id: dialog.folder.id, patch: { name: name.trim(), color } },
        { onSuccess: () => toast.success('Folder updated') }
      );
    }
    setDialog(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Folders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize notes into nested folders.</p>
        </div>
        <Button onClick={() => openCreate(null)}>
          <FolderPlus className="h-4 w-4" />
          New folder
        </Button>
      </div>

      {tree.length === 0 ? (
        <EmptyFolders onCreate={() => openCreate(null)} />
      ) : (
        <div className="space-y-2">
          {tree.map((node) => (
            <FolderNode
              key={node.id}
              node={node}
              onOpen={(f) => navigate(`/notes?folder=${f.id}`)}
              onEdit={openEdit}
              onCreateChild={(parentId) => openCreate(parentId)}
              onDelete={(f) => setPendingDelete(f)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'edit' ? 'Edit folder' : 'New folder'}</DialogTitle>
            <DialogDescription>Give your folder a name and pick a color.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work" autoFocus />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Color</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-ring ring-offset-2' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={submit} disabled={!name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="Notes in this folder are kept and moved to All notes; any subfolders move up one level. This cannot be undone."
        confirmLabel="Delete folder"
        destructive
        onConfirm={async () => {
          if (!pendingDelete) return;
          await mutations.remove.mutateAsync(pendingDelete.id);
          toast.success('Folder deleted');
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function FolderNode({
  node,
  onOpen,
  onEdit,
  onCreateChild,
  onDelete,
  depth = 0,
}: {
  node: ReturnType<typeof buildFolderTree>[number];
  onOpen: (f: FolderType) => void;
  onEdit: (f: FolderType) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (f: FolderType) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2.5"
        style={{ marginLeft: depth * 20 }}
      >
        <button onClick={() => hasChildren && setOpen((v) => !v)} className="text-muted-foreground">
          {hasChildren ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="w-4" />}
        </button>
        <button onClick={() => onOpen(node)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Folder className="h-4 w-4 shrink-0" style={{ color: node.color }} />
          <span className="truncate text-sm font-medium">{node.name}</span>
          <span className="ml-1 text-xs text-muted-foreground">{node.children.length ? `${node.children.length} nested` : ''}</span>
        </button>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <ActionBtn label="Rename" onClick={() => onEdit(node)}><Pencil className="h-3.5 w-3.5" /></ActionBtn>
          <ActionBtn label="Add subfolder" onClick={() => onCreateChild(node.id)}><FolderPlus className="h-3.5 w-3.5" /></ActionBtn>
          <ActionBtn label="Delete" danger onClick={() => onDelete(node)}><Trash2 className="h-3.5 w-3.5" /></ActionBtn>
        </div>
      </motion.div>
      {open && hasChildren && (
        <div className="mt-1.5 space-y-1.5">
          {node.children.map((child) => (
            <FolderNode key={child.id} node={child} onOpen={onOpen} onEdit={onEdit} onCreateChild={onCreateChild} onDelete={onDelete} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${danger ? 'text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:bg-accent'}`}>
      {children}
    </button>
  );
}

function EmptyFolders({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
      <Folder className="h-10 w-10 text-primary/40" />
      <div>
        <p className="text-sm font-semibold">No folders yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Group related notes together.</p>
      </div>
      <Button onClick={onCreate} size="sm"><FolderPlus className="mr-1.5 h-4 w-4" />Create folder</Button>
    </div>
  );
}