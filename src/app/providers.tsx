import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster, toast } from 'react-hot-toast';

/** Wraps the whole app with data/UI providers. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Surface an error toast for any mutation that doesn't handle its own,
        // so failed writes are never silent. Opt out per-call with meta.silent.
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if (mutation.meta?.silent) return;
            const message = error instanceof Error ? error.message : 'Something went wrong';
            toast.error(message);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '16px',
              fontSize: '14px',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}