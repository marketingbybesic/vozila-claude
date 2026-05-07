import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message?.slice(0, 200),
        fatal: true,
      });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-card border border-border p-8 text-center">
          <h1 className="text-xl font-light uppercase tracking-widest mb-4">
            Greška u prikazu
          </h1>
          <p className="text-sm text-muted-foreground font-light mb-6 leading-relaxed">
            Stranica je naišla na neočekivanu pogrešku. Pokušaj ponovno ili
            osvježi stranicu.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-[10px] text-left text-muted-foreground font-mono bg-muted p-3 mb-6 overflow-auto max-h-40">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.reset}
              className="px-5 h-11 bg-primary text-primary-foreground font-light uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors"
            >
              Pokušaj ponovno
            </button>
            <button
              onClick={() => window.location.assign('/')}
              className="px-5 h-11 border border-foreground/20 font-light uppercase tracking-widest text-xs hover:bg-foreground/5 transition-colors"
            >
              Početna
            </button>
          </div>
        </div>
      </div>
    );
  }
}
