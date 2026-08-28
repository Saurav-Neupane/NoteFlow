import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Check,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  PenTool,
  History,
  FileQuestion,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RichEditor } from '@/components/features/editor/rich-editor';
import { NoteActions } from '@/components/features/notes/note-actions';
import { DrawingPad } from '@/components/features/editor/drawing-pad';
import { Checklist } from '@/components/features/editor/checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useNote, useNoteMutations, useVersions } from '@/hooks';
import { useSettingsStore } from '@/stores';
import {
  createAttachment,
  snapshotVersion,
  restoreVersion,
} from '@/services/note.service';
import { uploadFile } from '@/services/storage.service';
import { parseChecklist } from '@/utils/checklist';
import { htmlToPlainText } from '@/utils/text';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_FILE_TYPES,
} from '@/constants';
import type { NoteVersion } from '@/types';

interface NoteEditorProps {
  userId: string;
  isNew?: boolean;
}

interface EditorStats {
  words: number;
  chars: number;
  readMinutes: number;
  checklist: { done: number; total: number };
}

const IDLE_STATS: EditorStats = { words: 0, chars: 0, readMinutes: 1, checklist: { done: 0, total: 0 } };

const ACCEPT_BY_KIND: Record<'image' | 'file', string[]> = {
  image: ACCEPTED_IMAGE_TYPES,
  file: ACCEPTED_FILE_TYPES,
};

/* ------------------------------------------------------------------ *
 * Local draft mirror
 *
 * Firestore is the source of truth, but a reload (or a crash) must never
 * destroy typed work. Every keystroke is mirrored into localStorage under a
 * per-user, per-note key and cleared the moment the write to Firestore lands.
 * ------------------------------------------------------------------ */

interface DraftPayload {
  title: string;
  html: string;
  at: number;
}

const DRAFT_PREFIX = 'noteflow:draft:';

function draftKey(userId: string, noteId: string | null): string {
  return `${DRAFT_PREFIX}${userId}:${noteId ?? 'new'}`;
}

function readDraft(key: string): DraftPayload | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftPayload>;
    if (typeof parsed?.title !== 'string' || typeof parsed?.html !== 'string') return null;
    return { title: parsed.title, html: parsed.html, at: parsed.at ?? 0 };
  } catch {
    return null;
  }
}

function writeDraft(key: string, payload: DraftPayload): void {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota or private mode — the draft mirror is best-effort */
  }
}

function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

interface PersistOptions {
  /** Write even when nothing changed (manual Save, attachments). */
  force?: boolean;
  /** Don't show the "Saving…" indicator (background auto-save / exit flush). */
  silent?: boolean;
  /** Show the success toast. */
  notify?: boolean;
}

/** Full note editor: title + rich content + auto-save + attachments. */
export function NoteEditorPage({ userId, isNew = false }: NoteEditorProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mutations = useNoteMutations();
  const autoSaveEnabled = useSettingsStore((s) => s.settings.auto_save);
  const autoSaveDelay = useSettingsStore((s) => s.settings.auto_save_delay);

  // A brand-new note has no id until its first save creates the Firestore doc.
  const existingQuery = useNote(!isNew ? id : undefined, userId);
  const existing = existingQuery.data;

  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [initialHtml, setInitialHtml] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [stats, setStats] = useState<EditorStats>(IDLE_STATS);
  const [showDrawing, setShowDrawing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(!isNew && id ? id : null);

  // Persisted-content trackers so autosave only fires on real changes.
  const lastSavedRef = useRef('');
  const lastSavedTitleRef = useRef('');
  // Guards the async gap while the first create is in flight.
  const creatingRef = useRef(false);
  // Ensures we hydrate each loaded note exactly once (never clobber live edits).
  const hydratedIdRef = useRef<string | null>(null);
  // Always-fresh mirrors for the unmount / beforeunload flush. Reading these
  // instead of state keeps the flush effect mount-scoped, so it can never be
  // torn down and re-run (and therefore re-save) on every keystroke.
  const latestRef = useRef({ title: '', html: '' });
  const noteIdRef = useRef<string | null>(!isNew && id ? id : null);
  const dirtyRef = useRef(false);
  const draftKeyRef = useRef(draftKey(userId, !isNew && id ? id : null));
  const mutationsRef = useRef(mutations);
  const editorRef = useRef<HTMLDivElement>(null);

  // `useNoteMutations()` returns a fresh object on every render; parking it in a
  // ref lets `persist` stay referentially stable.
  mutationsRef.current = mutations;

  const note = isNew ? undefined : (existing ?? undefined);
  const checkItems = useMemo(() => parseChecklist(html), [html]);
  const versionsQuery = useVersions(showHistory ? noteId ?? undefined : undefined);

  /** Record a successful write: nothing is dirty and no draft needs keeping. */
  const markSaved = useCallback((savedTitle: string, savedHtml: string, savedId: string) => {
    lastSavedTitleRef.current = savedTitle;
    lastSavedRef.current = savedHtml;
    dirtyRef.current = false;
    clearDraft(draftKeyRef.current);
    draftKeyRef.current = draftKey(userId, savedId);
    clearDraft(draftKeyRef.current);
    setDirty(false);
    setSavedAt(new Date());
  }, [userId]);

  // Mirror every edit into refs + localStorage so neither an unmount nor a
  // full page reload can lose typed work.
  useEffect(() => {
    latestRef.current = { title, html };
    if (!hydrated) return;
    const isDirty = title !== lastSavedTitleRef.current || html !== lastSavedRef.current;
    dirtyRef.current = isDirty;
    setDirty(isDirty);
    if (isDirty) {
      writeDraft(draftKeyRef.current, { title, html, at: Date.now() });
    }
  }, [title, html, hydrated]);

  // Hydrate a brand-new note: restore an interrupted draft if one survives.
  useEffect(() => {
    if (!isNew || hydrated) return;
    const draft = readDraft(draftKey(userId, null));
    if (draft && (draft.title.trim() || htmlToPlainText(draft.html).trim())) {
      setTitle(draft.title);
      setHtml(draft.html);
      setInitialHtml(draft.html);
      toast('Restored your unsaved draft', { icon: '📝' });
    }
    setHydrated(true);
  }, [isNew, hydrated, userId]);

  // Hydrate an existing note once it resolves; a newer local draft wins so a
  // reload mid-edit shows what the user typed, not the last server state.
  useEffect(() => {
    if (isNew || !existing) return;
    if (hydratedIdRef.current === existing.id) return;
    hydratedIdRef.current = existing.id;

    const baseTitle = existing.title;
    const baseHtml = existing.content ?? '';
    lastSavedTitleRef.current = baseTitle;
    lastSavedRef.current = baseHtml;
    draftKeyRef.current = draftKey(userId, existing.id);

    const draft = readDraft(draftKeyRef.current);
    const useDraft = !!draft && (draft.title !== baseTitle || draft.html !== baseHtml);
    const nextTitle = useDraft ? draft.title : baseTitle;
    const nextHtml = useDraft ? draft.html : baseHtml;

    setTitle(nextTitle);
    setHtml(nextHtml);
    setInitialHtml(nextHtml);
    setNoteId(existing.id);
    noteIdRef.current = existing.id;
    setHydrated(true);
    if (useDraft) {
      dirtyRef.current = true;
      setDirty(true);
      toast('Restored your unsaved changes', { icon: '📝' });
    }
  }, [existing, isNew, userId]);

  // The contenteditable normalizes markup when it mounts, so its very first
  // emit can differ textually from the stored content. Adopt that first emit as
  // the baseline instead of treating it as an edit (which would otherwise mark
  // an untouched note dirty and trigger a pointless write).
  const firstEmitRef = useRef(true);
  const handleContentChange = useCallback((next: string) => {
    if (firstEmitRef.current) {
      firstEmitRef.current = false;
      if (!dirtyRef.current) lastSavedRef.current = next;
    }
    setHtml(next);
  }, []);

  /**
   * The single write path to Firestore. Creates the document on first save and
   * patches it afterwards, always under the authenticated `user_id`. Returns
   * the note id on success, `null` when nothing was written.
   */
  const persist = useCallback(
    async (nextTitle: string, nextHtml: string, opts: PersistOptions = {}): Promise<string | null> => {
      const { force = false, silent = false, notify = false } = opts;
      const text = htmlToPlainText(nextHtml);
      const currentId = noteIdRef.current;

      // ---- First save: create the document ----
      if (!currentId) {
        if (creatingRef.current) return null;
        if (!force && !nextTitle.trim() && !text.trim()) return null;
        creatingRef.current = true;
        if (!silent) setSaving(true);
        try {
          const created = await mutationsRef.current.create.mutateAsync({
            userId,
            title: nextTitle.trim() || 'Untitled',
            content: nextHtml,
            content_text: text,
          });
          noteIdRef.current = created.id;
          hydratedIdRef.current = created.id; // don't re-hydrate after we navigate
          setNoteId(created.id);
          markSaved(nextTitle, nextHtml, created.id);
          if (notify) toast.success('Note saved successfully');
          // Swap the URL to the real note so a refresh loads the saved doc.
          navigate(`/notes/${created.id}`, { replace: true });
          return created.id;
        } catch {
          return null; // the mutation surfaces its own toast
        } finally {
          creatingRef.current = false;
          setSaving(false);
        }
      }

      // ---- Subsequent saves: patch ----
      const unchanged =
        nextTitle === lastSavedTitleRef.current && nextHtml === lastSavedRef.current;
      if (unchanged && !force) return currentId;
      if (unchanged && force) {
        if (notify) toast.success('Note saved successfully');
        return currentId;
      }

      if (!silent) setSaving(true);
      try {
        await mutationsRef.current.update.mutateAsync({
          id: currentId,
          patch: {
            title: nextTitle.trim() || 'Untitled',
            content: nextHtml,
            content_text: text,
          },
        });
        markSaved(nextTitle, nextHtml, currentId);
        if (notify) toast.success('Note saved successfully');
        return currentId;
      } catch {
        return null; // the mutation surfaces its own toast
      } finally {
        setSaving(false);
      }
    },
    [markSaved, navigate, userId]
  );

  // Keep a stable handle for the mount-scoped exit flush below.
  const persistRef = useRef(persist);
  persistRef.current = persist;

  /**
   * Background auto-save. Deliberately `silent` — typing must never light up
   * the "Saving…" indicator. Only real changes (`dirty`) schedule a write, and
   * the timer resets on each edit rather than on each render.
   */
  useEffect(() => {
    if (!hydrated || !dirty || !autoSaveEnabled) return;
    const delay = Math.max(400, autoSaveDelay || 800);
    const timer = setTimeout(() => {
      const { title: t, html: h } = latestRef.current;
      void persist(t, h, { silent: true });
    }, delay);
    return () => clearTimeout(timer);
  }, [title, html, hydrated, dirty, autoSaveEnabled, autoSaveDelay, persist]);

  /**
   * Exit flush. Mount-scoped (empty deps) so the cleanup runs exactly once, on
   * real unmount — pressing Back, navigating away, or closing the route — and
   * pushes the current draft to Firestore before it disappears.
   */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      // The draft is already mirrored to localStorage, so nothing is lost; the
      // prompt just gives the user a chance to let the save finish.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (!dirtyRef.current) return;
      const { title: t, html: h } = latestRef.current;
      if (!t.trim() && !htmlToPlainText(h).trim()) return;
      void persistRef.current(t, h, { silent: true });
    };
  }, []);

  /** Ensure a Firestore doc exists before attaching companions to it. */
  async function ensureNoteId(): Promise<string | null> {
    if (noteIdRef.current) return noteIdRef.current;
    return persist(title, html, { force: true });
  }

  /** Manual Save: write immediately, confirm, and keep the route in sync. */
  async function handleManualSave() {
    const currentId = noteIdRef.current;
    // Snapshot the last persisted state into history before overwriting it.
    if (currentId && lastSavedRef.current) {
      void snapshotVersion(
        currentId,
        lastSavedTitleRef.current,
        lastSavedRef.current,
        htmlToPlainText(lastSavedRef.current),
        userId
      );
    }
    await persist(title, html, { force: true, notify: true });
  }

  /** Back: flush the draft to Firestore first so nothing typed is lost. */
  async function handleBack() {
    if (dirtyRef.current) {
      const { title: t, html: h } = latestRef.current;
      if (t.trim() || htmlToPlainText(h).trim()) {
        await persist(t, h);
      }
    }
    navigate(-1);
  }

  function pickFile(kind: 'image' | 'file') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'image' ? 'image/*' : ACCEPTED_FILE_TYPES.join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await attachFile(file, kind);
    };
    input.click();
  }

  async function attachFile(file: File, kind: 'image' | 'file') {
    const accepted = ACCEPT_BY_KIND[kind];
    if (file.type && !accepted.includes(file.type) && kind !== 'file') {
      toast.error(`Unsupported ${kind} type: ${file.type || 'unknown'}`);
      return;
    }
    const targetId = await ensureNoteId();
    if (!targetId) {
      toast.error('Could not save the note before attaching.');
      return;
    }
    toast.loading('Uploading…', { id: 'upload' });
    try {
      const { path, publicUrl } = await uploadFile(userId, 'attachment', file);
      await createAttachment({
        note_id: targetId,
        user_id: userId,
        type: kind === 'image' ? 'image' : 'file',
        name: file.name,
        url: publicUrl,
        path,
        size: file.size,
      });
      const el = editorRef.current;
      if (el) {
        el.focus();
        if (kind === 'image') {
          document.execCommand('insertImage', false, publicUrl);
        } else {
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${publicUrl}" target="_blank" rel="noreferrer">📎 ${file.name}</a>`
          );
        }
        setHtml(el.innerHTML);
        void persist(title, el.innerHTML, { force: true });
      }
      toast.success('Attachment added', { id: 'upload' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed', { id: 'upload' });
    }
  }

  function handleDrawing(dataUrl: string) {
    setShowDrawing(false);
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertHTML', false, `<img src="${dataUrl}" alt="Drawing" />`);
    setHtml(el.innerHTML);
    void persist(title, el.innerHTML, { force: true });
  }

  async function handleRestore(version: NoteVersion) {
    if (!noteId) return;
    try {
      await restoreVersion(noteId, version);
      setTitle(version.title);
      setHtml(version.content ?? '');
      setInitialHtml(version.content ?? '');
      markSaved(version.title, version.content ?? '', noteId);
      setShowHistory(false);
      mutations.invalidate();
      toast.success('Version restored');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not restore version');
    }
  }

  const loading = !isNew && !hydrated && existingQuery.isLoading;
  const notFound = !isNew && !hydrated && !existingQuery.isLoading && existing === null;

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Note not found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            This note may have been deleted, or it belongs to another account.
          </p>
        </div>
        <Button onClick={() => navigate('/notes', { replace: true })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to notes
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-2 border-b bg-background/80 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Button variant="ghost" size="icon" onClick={() => void handleBack()} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {saving ? <SavingInline /> : dirty ? <UnsavedInline /> : savedAt ? <SavedAt at={savedAt} /> : 'Draft'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {noteId && (
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)} aria-label="Version history">
              <History className="h-4.5 w-4.5" />
            </Button>
          )}
          {note && <NoteActions note={note} />}
          <Button size="sm" onClick={() => void handleManualSave()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <EditorShell />
      ) : (
        <div className="mx-auto max-w-3xl">
          {note?.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {note.tags.map((t) => (
                <span key={t.id} className="rounded-md px-1.5 py-0.5 text-[11px] font-medium" style={{ background: `${t.color}2e`, color: t.color }}>
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            aria-label="Note title"
            className="mt-2 h-auto border-0 bg-transparent px-0 font-display text-3xl font-extrabold tracking-tight shadow-none focus-visible:ring-0"
          />

          <div className="mt-2">
            {hydrated ? (
              <RichEditor
                innerRef={editorRef}
                initialHtml={initialHtml}
                onContentChange={(next) => handleContentChange(next)}
                onStatsChange={setStats}
                placeholder="Start writing…"
              />
            ) : (
              <Skeleton className="h-64 w-full rounded-2xl" />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1">{stats.words} words</span>
            <span className="rounded-full bg-muted px-2.5 py-1">{stats.chars} chars</span>
            <span className="rounded-full bg-muted px-2.5 py-1">{stats.readMinutes} min read</span>
            {stats.checklist.total > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                ✓ {stats.checklist.done}/{stats.checklist.total}
              </span>
            )}
          </div>

          <AnimatePresence>
            {showDrawing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3">
                <DrawingPad onSubmit={handleDrawing} onCancel={() => setShowDrawing(false)} />
              </motion.div>
            )}
          </AnimatePresence>

          {checkItems.length > 0 && (
            <div className="mt-3">
              <Checklist
                items={checkItems}
                onChange={(items) => {
                  const el = editorRef.current;
                  if (!el) return;
                  el.querySelectorAll('[data-check]').forEach((li, i) => {
                    const item = items[i];
                    if (item) li.setAttribute('data-check', String(item.checked));
                  });
                  setHtml(el.innerHTML);
                }}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-1.5 pb-24">
            <ToolbarChip icon={ImageIcon} label="Image" onClick={() => pickFile('image')} />
            <ToolbarChip icon={PenTool} label="Drawing" onClick={() => setShowDrawing(true)} />
            <ToolbarChip icon={Paperclip} label="Attach" onClick={() => pickFile('file')} />
          </div>
        </div>
      )}

      <VersionHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        versions={versionsQuery.data ?? []}
        loading={versionsQuery.isLoading}
        onRestore={handleRestore}
      />
    </motion.div>
  );
}

function VersionHistoryDialog({
  open,
  onOpenChange,
  versions,
  loading,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  versions: NoteVersion[];
  loading: boolean;
  onRestore: (v: NoteVersion) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>Restore an earlier snapshot of this note.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading history…
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No earlier versions yet. Snapshots are saved when you press Save.
            </p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{v.title || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.snapshot_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onRestore(v)}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorShell() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

function SavingInline() {
  return (
    <span className="inline-flex items-center gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />
      Saving…
    </span>
  );
}

function UnsavedInline() {
  return <span className="inline-flex items-center gap-1 text-amber-500">Unsaved changes</span>;
}

function SavedAt({ at }: { at: Date }) {  return (
    <span className="inline-flex items-center gap-1 text-emerald-500">
      <Check className="h-3 w-3" />
      Saved {at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function ToolbarChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
