import { create } from 'zustand';
import type { Tag } from '@/types';

interface TagState {
  /** Pending tag id → in-flight color update (keeps cards snappy). */
  applyingColor: Record<string, boolean>;
  setApplyingColor: (id: string, value: boolean) => void;
  /** Local-only map of optimistic tag counts. */
  tagCounts: Record<string, number>;
  setTagCounts: (counts: Record<string, number>) => void;
}

/** Ephemeral tag UI state. */
export const useTagStore = create<TagState>((set) => ({
  applyingColor: {},
  setApplyingColor: (id, value) =>
    set((s) => ({ applyingColor: { ...s.applyingColor, [id]: value } })),
  tagCounts: {},
  setTagCounts: (tagCounts) => set({ tagCounts }),
}));