import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import { FAB } from './fab';
import { CommandPalette } from './command-palette';
import { ErrorBoundary } from './error-boundary';
import { PageTransition } from './page-transition';
import { useRequireAuth, useNotes, useSettings, useKeyboardShortcuts, useIsDesktop, useRealtimeNotes } from '@/hooks';
import { useUIStore } from '@/stores';
import { FullScreenSpinner } from '@/components/ui';
import type { AuthSessionUser } from '@/services/auth.service';

interface AppShellProps {
  user: AuthSessionUser;
}

/** Persistent authenticated layout: sidebar + top bar + routed content + FAB. */
export function AppShell({ user }: AppShellProps) {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { sidebarOpen, setSidebarOpen, setCommandSearchOpen } = useUIStore();
  const collapsed = !isDesktop && !sidebarOpen;
  const notesQuery = useNotes(user.id);
  const notes = notesQuery.data ?? [];

  useRealtimeNotes(user.id);
  // Load & apply the user's server-side settings (theme, accent, font, motion).
  useSettings(user.id);

  // Collapse sidebar automatically on mobile by default.
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [isDesktop, setSidebarOpen]);

  useKeyboardShortcuts(
    [
      {
        keys: ['ctrl', 'k'],
        handler: () => setCommandSearchOpen(true),
        excludeInputs: false,
      },
      {
        keys: ['ctrl', 'n'],
        handler: () => navigate('/notes/new'),
        excludeInputs: true,
      },
    ],
    [setCommandSearchOpen, navigate]
  );

  function onCreateNote() {
    navigate('/notes/new');
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className={`${collapsed ? 'w-[72px]' : 'w-64'} hidden lg:block shrink-0`}>
        <Sidebar notes={notes} userId={user.id} collapsed={collapsed} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      {/* Mobile overlay sidebar */}
      {!isDesktop && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="h-full shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
            <Sidebar notes={notes} userId={user.id} collapsed={false} onToggle={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} onSearchFocus={() => setCommandSearchOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <ErrorBoundary>
            <PageTransition className="mx-auto max-w-6xl px-4 pb-24 pt-2 sm:px-6">
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette notes={notes} />
      <FAB onCreateNote={onCreateNote} />
    </div>
  );
}

/** Guarded shell that waits for auth then renders the app. */
export function SecureShell() {
  const { user, isReady } = useRequireAuth();
  // While auth resolves, show a spinner rather than a blank frame; once resolved
  // without a user, useRequireAuth has already kicked off the /auth redirect.
  if (!isReady) return <FullScreenSpinner label="Loading NoteFlow…" />;
  if (!user) return <FullScreenSpinner />;
  return <AppShell user={user} />;
}