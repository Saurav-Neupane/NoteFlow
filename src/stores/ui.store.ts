import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, UserSettings, ViewMode } from '@/types';
import { accentToHsl } from '@/constants';

interface UIState {
  theme: ThemeMode;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  commandSearchOpen: boolean;
  appLocked: boolean;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setViewMode: (v: ViewMode) => void;
  setSidebarOpen: (v: boolean) => void;
  setCommandSearchOpen: (v: boolean) => void;
  setAppLocked: (v: boolean) => void;
  applySettings: (s: UserSettings) => void;
}

function getSystemDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const dark = mode === 'dark' || (mode === 'system' && getSystemDark());
  root.classList.toggle('dark', dark);
}

/** Push accent color into the CSS variables the Tailwind theme consumes. */
function applyAccent(accent?: string | null): void {
  const hsl = accentToHsl(accent);
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      viewMode: 'grid',
      sidebarOpen: true,
      commandSearchOpen: false,
      appLocked: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
      setViewMode: (viewMode) => set({ viewMode }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCommandSearchOpen: (commandSearchOpen) => set({ commandSearchOpen }),
      setAppLocked: (appLocked) => set({ appLocked }),
      applySettings: (s) => {
        applyTheme(s.theme);
        applyAccent(s.accent);
        const root = document.documentElement;
        root.setAttribute('data-font-size', s.font_size);
        root.setAttribute('data-reduce-motion', String(s.reduce_motion));
        set({ theme: s.theme, viewMode: s.view_mode });
      },
    }),
    {
      name: 'noteflow-ui',
      partialize: (s) => ({ theme: s.theme, viewMode: s.viewMode }),
    }
  )
);

/** Init theme + accent once at app boot (before React renders). */
export function initTheme(): void {
  const state = useUIStore.getState();
  applyTheme(state.theme);
  // Zustand's persist wraps state as { state: {...}, version }, so the settings
  // store's accent/font live under `.state.settings`.
  try {
    const raw = localStorage.getItem('noteflow-settings');
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: { settings?: Partial<UserSettings> } };
    const settings = parsed.state?.settings;
    if (!settings) return;
    applyAccent(settings.accent);
    if (settings.font_size) {
      document.documentElement.setAttribute('data-font-size', settings.font_size);
    }
    if (settings.reduce_motion !== undefined) {
      document.documentElement.setAttribute(
        'data-reduce-motion',
        String(settings.reduce_motion)
      );
    }
  } catch {
    /* ignore malformed persisted settings */
  }
}