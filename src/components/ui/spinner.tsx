import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  /** Optional label rendered next to the spinner. */
  label?: string;
}

/** Small inline loading spinner. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground" role="status">
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} aria-hidden />
      {label && <span className="text-sm">{label}</span>}
      <span className="sr-only">{label ?? 'Loading'}</span>
    </span>
  );
}

/** Full-viewport centered spinner for route/auth-level loading states. */
export function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-dvh w-full items-center justify-center">
      <Spinner className="h-6 w-6" label={label} />
    </div>
  );
}
