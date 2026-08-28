import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Friendly 404 fallback. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <FileQuestion className="h-10 w-10" />
      </div>
      <div>
        <h1 className="font-display text-3xl font-extrabold">404</h1>
        <p className="mt-1 text-sm text-muted-foreground">This page seems to have drifted away.</p>
      </div>
      <Button onClick={() => navigate('/dashboard')}>Back home</Button>
    </div>
  );
}