import React from 'react';

/**
 * [BUG-006 FIX]: KaTeX rendering boundary.
 * Wraps KaTeX/math components to prevent fatal white screen crashes
 * when the AI returns malformed LaTeX expressions.
 * 
 * React 19 compatible: minimal class with no property conflicts.
 */
class KaTeXBoundaryInner extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  declare state: { hasError: boolean };
  declare props: Readonly<{ children: React.ReactNode; fallback?: React.ReactNode }>;

  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[KaTeXBoundary] Math render crashed:', error.message);
  }

  handleRetry() {
    (this as any).setState({ hasError: false });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
          <span>⚠️</span>
          <span>Matematik ifadesi görüntülenemedi</span>
          <button 
            onClick={this.handleRetry}
            className="ml-1 px-1.5 py-0.5 bg-amber-500/20 rounded text-[10px] hover:bg-amber-500/30 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const KaTeXBoundary = KaTeXBoundaryInner;
