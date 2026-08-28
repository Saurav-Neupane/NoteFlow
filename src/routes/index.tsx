import { createBrowserRouter, Navigate, useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { SecureShell } from '@/components/layout';
import { useAuth, useRequireAuth } from '@/hooks';
import { Button, FullScreenSpinner } from '@/components/ui';
import {
  AuthPage,
  DashboardPage,
  NotesPage,
  NoteEditorPage,
  FoldersPage,
  TagsPage,
  TrashPage,
  SettingsPage,
  NotFoundPage,
} from '@/pages';

/** Router-level error screen — catches loader/render errors under the shell. */
function RouteErrorElement() {
  const error = useRouteError();
  const navigate = useNavigate();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  const message =
    isRouteErrorResponse(error)
      ? error.statusText || 'Something went wrong.'
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred.';
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={() => navigate('/dashboard', { replace: true })}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Back to dashboard
      </Button>
    </div>
  );
}

/** Redirect to /dashboard when already authenticated (used by /auth). */
function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthPage />;
}

/** Settings needs the full user (for profile card) plus the id. */
function SettingsRoute() {
  const { user, isReady } = useRequireAuth();
  if (!isReady || !user) return <FullScreenSpinner />;
  return <SettingsPage userId={user.id} user={user} />;
}

/** Route wrapper that injects the current user id into pages. */
function WithUser({ children }: { children: (userId: string) => React.ReactNode }) {
  const { user, isReady } = useRequireAuth();
  if (!isReady || !user) return <FullScreenSpinner />;
  return <>{children(user.id)}</>;
}

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <PublicOnly />,
  },
  {
    element: <SecureShell />,
    errorElement: <RouteErrorElement />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      {
        path: '/dashboard',
        element: <WithUser>{(uid) => <DashboardPage userId={uid} />}</WithUser>,
      },
      {
        path: '/notes',
        element: <WithUser>{(uid) => <NotesPage userId={uid} />}</WithUser>,
      },
      {
        path: '/notes/new',
        element: <WithUser>{(uid) => <NoteEditorPage userId={uid} isNew />}</WithUser>,
      },
      // Static scope segments are enumerated so they rank above the dynamic
      // `/notes/:id` route — otherwise "/notes/favorites" would be treated as a
      // note id and open the editor for a note that doesn't exist.
      ...['favorites', 'recent', 'archived', 'locked', 'trash'].map((scope) => ({
        path: `/notes/${scope}`,
        element: <WithUser>{(uid: string) => <NotesPage userId={uid} scope={scope} />}</WithUser>,
      })),
      {
        path: '/notes/:id',
        element: <WithUser>{(uid) => <NoteEditorPage userId={uid} />}</WithUser>,
      },
      {
        path: '/folders',
        element: <WithUser>{(uid) => <FoldersPage userId={uid} />}</WithUser>,
      },
      {
        path: '/tags',
        element: <WithUser>{(uid) => <TagsPage userId={uid} />}</WithUser>,
      },
      {
        path: '/trash',
        element: <WithUser>{(uid) => <TrashPage userId={uid} />}</WithUser>,
      },
      {
        path: '/settings',
        element: <SettingsRoute />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);