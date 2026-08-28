import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** App-level error boundary with a friendly reload fallback. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[NoteFlow] ErrorBoundary:', error, info);
  }

  private reset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{this.state.message}</p>
          </div>
          <Button onClick={this.reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}