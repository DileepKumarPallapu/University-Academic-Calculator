import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="apple-main-container p-8 sm:p-10 my-8 max-w-lg mx-auto text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {this.props.fallbackTitle || 'Something went wrong.'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">
            {this.props.fallbackMessage ||
              'An unexpected calculation or render issue occurred. Your saved profile and history remain intact.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="apple-btn-primary h-11 px-6 text-sm font-semibold gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
