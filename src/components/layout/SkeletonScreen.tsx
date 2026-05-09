import React from 'react';

export function SkeletonScreen() {
  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="w-40 h-8 skeleton-shimmer rounded-xl" />
        <div className="w-24 h-8 skeleton-shimmer rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 skeleton-shimmer rounded-2xl border border-white/5" />
        ))}
      </div>

      {/* Main content block */}
      <div className="h-56 skeleton-shimmer rounded-3xl border border-white/5 mt-4" />

      {/* List rows */}
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 skeleton-shimmer rounded-xl border border-white/5" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    </div>
  );
}
