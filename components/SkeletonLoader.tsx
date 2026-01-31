
import React from 'react';
import { MusicIcon } from './icons';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant = 'card' }) => {
  const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-cyan-500/10 before:to-transparent";

  if (variant === 'list') {
    return (
      <div className={`w-full h-12 border-b border-gray-800/50 flex items-center gap-4 px-2 ${shimmer}`}>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-800/60 rounded w-1/3"></div>
          <div className="h-2 bg-slate-800/60 rounded w-1/4"></div>
        </div>
        <div className="hidden md:block h-6 w-16 bg-slate-800/60 rounded"></div>
        <div className="h-3 w-16 bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  // Card Variant - Vinyl Style
  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-xl p-3 mb-2 flex items-center gap-3 ${shimmer}`}>
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center border border-white/5">
          <div className="w-6 h-6 bg-slate-700 rounded-full animate-pulse"></div>
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          <div className="h-3 bg-slate-800 rounded w-1/2"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-4 bg-slate-800 rounded w-10"></div>
          <div className="h-4 bg-slate-800 rounded w-12"></div>
        </div>
      </div>
    </div>
  );
};
