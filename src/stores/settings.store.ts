import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, type UserSettings } from '@/types';

interface SettingsState {
  settings: UserSettings;
  hydrated: boolean;
  update: (patch: Partial<UserSettings>) => void;
  setAll: (settings: UserSettings) => void;
  setHydrated: (v: boolean) => void;
}

/**
 * Settings are mirrored to Firestore (per user) but cached locally so the app
 * works offline-first. Server wins on load; local edits write through.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...DEFAULT_SETTINGS },
      hydrated: false,
      update: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setAll: (settings) => set({ settings }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'noteflow-settings',
      partialize: (s) => ({ settings: s.settings }),
    }
  )
);