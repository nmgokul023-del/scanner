import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GISErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GIS View Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-slate-50">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-rose-100 text-rose-800 border border-rose-200 mb-3">
            {this.props.fallbackTitle || 'GIS VIEW ERROR'}
          </span>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Failed to render GIS Component
          </h2>
          <p className="text-xs font-mono text-slate-600 max-w-lg mb-4 bg-white p-3 rounded-xl border border-slate-200 overflow-x-auto text-left whitespace-pre-wrap">
            {this.state.error?.message || 'An unexpected rendering error occurred in the GIS subsystem.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Reload Component
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.hash = '#dashboard';
                window.location.reload();
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Home className="w-4 h-4" /> Reset to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
