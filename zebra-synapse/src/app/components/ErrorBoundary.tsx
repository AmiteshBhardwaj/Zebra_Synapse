import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";
import { safeLocalStorage, safeSessionStorage } from "../../lib/safeStorage";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fullPage?: boolean;
  componentName?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary] Caught error in ${this.props.componentName || "Component"}:`, error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleFullReset = (): void => {
    try {
      safeLocalStorage.clear();
      safeSessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.fullPage) {
        return (
          <div className="min-h-screen w-full bg-[#050914] text-white flex items-center justify-center p-4 selection:bg-cyan-500/20 selection:text-cyan-300">
            <div className="relative max-w-lg w-full rounded-3xl border border-white/10 bg-[rgba(10,18,34,0.85)] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)] text-center">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                <ShieldAlert className="h-7 w-7" />
              </div>

              <h1 className="mt-5 text-xl font-bold tracking-tight text-white font-['Manrope']">
                Workspace Display Interrupted
              </h1>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Zebra Synapse encountered an unexpected hardware or browser render interruption. Your clinical data remains secure.
              </p>

              {this.state.error?.message && (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 text-left">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-semibold">
                    Diagnostics Note
                  </p>
                  <p className="mt-1 font-mono text-xs text-rose-200/90 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="w-full sm:flex-1 h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(8,145,178,0.4)] cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reload Workspace</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleFullReset}
                  className="w-full sm:w-auto h-11 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Cache</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="my-3 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4 text-left backdrop-blur-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber-300">
                {this.props.componentName ? `${this.props.componentName} Unavailable` : "Component Display Glitch"}
              </p>
              <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                {this.state.error?.message || "This module encountered a browser compatibility exception."}
              </p>
              <button
                type="button"
                onClick={this.handleRetry}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
