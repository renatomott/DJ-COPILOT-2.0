
import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant = 'card' }) => {
  
  if (variant === 'list') {
    return (
      <div className="w-full h-12 border-b border-gray-800/50 flex items-center gap-4 px-2 animate-pulse">
        {/* Title/Artist Column */}
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-800 rounded w-1/3"></div>
          <div className="h-2 bg-gray-800 rounded w-1/4"></div>
        </div>
        
        {/* Badges (Hidden on mobile usually, but kept for desktop feel) */}
        <div className="hidden md:block h-6 w-16 bg-gray-800 rounded"></div>
        <div className="hidden md:block h-6 w-10 bg-gray-800 rounded"></div>
        <div className="hidden md:block h-6 w-10 bg-gray-800 rounded"></div>
        
        {/* Rating */}
        <div className="h-3 w-16 bg-gray-800 rounded"></div>
      </div>
    );
  }

  // Card Variant (Default) - Used for Suggestions and Card View
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 mb-2 animate-pulse flex items-center gap-3">
      {/* Cover Art Placeholder */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 rounded-xl flex-shrink-0"></div>
      
      <div className="flex-1 min-w-0 py-1">
        {/* Title & Artist */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-800 rounded w-1/2"></div>
        </div>
        
        {/* Badges Row */}
        <div className="flex gap-2">
          <div className="h-4 bg-gray-800 rounded w-10"></div>
          <div className="h-4 bg-gray-800 rounded w-12"></div>
          <div className="h-4 bg-gray-800 rounded w-16 ml-auto"></div>
        </div>
      </div>
    </div>
  );
};
