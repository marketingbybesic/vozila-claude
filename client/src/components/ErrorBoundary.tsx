import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertCircle className="w-16 h-16 text-primary mx-auto" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-light uppercase tracking-[0.15em] text-foreground mb-4">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
              Došlo je do neočekivane greške. Molimo vas pokušajte ponovno.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-lg font-light uppercase tracking-[0.15em] text-xs hover:bg-primary/90 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4" />
              Pokušaj ponovno
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
