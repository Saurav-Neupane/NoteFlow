import { useState, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { DB } from '@/constants';
import { copyText } from '@/utils/clipboard';
import type { SharingAccess } from '@/types';

interface ShareResult {
  ok: boolean;
  message: string;
  url?: string;
}

/**
 * Generates a shareable link for a note. Optionally records a note_share doc
 * with the recipient email so access can be managed later (Cloud Firestore).
 */
export function useShareNote() {
  const [busy, setBusy] = useState(false);

  const share = useCallback(
    async (noteId: string, opts?: { email?: string; access?: SharingAccess }): Promise<ShareResult> => {
      setBusy(true);
      try {
        const base = `${window.location.origin}/s/${noteId}`;
        const access: SharingAccess = opts?.access ?? 'view';

        if (opts?.email) {
          // Deterministic id keeps one share row per (note, recipient) pair.
          const id = `${noteId}_${opts.email}`;
          await setDoc(
            doc(db, DB.noteShares, id),
            { note_id: noteId, shared_with: opts.email, access, created_at: new Date().toISOString() },
            { merge: true }
          );
        }

        await copyText(base);
        return { ok: true, message: 'Link copied to clipboard', url: base };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : 'Share failed' };
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return { share, busy };
}
