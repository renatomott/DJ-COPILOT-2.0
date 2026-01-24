
import React, { useState } from 'react';
import type { Track } from '../types';
import { StarIcon, ClockIcon, ActivityIcon, ChevronDownIcon, FolderIcon, TagIcon } from './icons';
import { EnergyBar } from './EnergyBar';

interface TrackListItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
}

const renderRating = (rating: number) => {
  const stars = [];
  // Escala de 0 a 100 do Rekordbox convertida para 5 estrelas (20 pts cada)
  const normalizedRating = Math.round(rating / 20);
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-2.5 h-2.5 ${isFilled ? 'text-yellow-400 fill-current' : 'text-white opacity-10'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

export const TrackListItem: React.FC<TrackListItemProps> = ({ track, onSelect, isSelected }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      onClick={() => onSelect(track)}
      className={`
        relative border-b border-gray-800/50 cursor-pointer transition-all duration-200
        flex flex-col
        md:grid md:grid-cols-[1fr_90px_50px_50px_60px_75px] md:gap-2 md:py-2.5 md:items-center md:px-3
        ${isSelected ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'bg-transparent border-l-2 border-l-transparent hover:bg-white/5'}
      `}
    >
      {/* MOBILE CONTAINER PADDING */}
      <div className="p-3 md:p-0 flex flex-col gap-2 md:contents">
        
        {/* HEADER ROW (Mobile): Name/Artist + Chevron */}
        <div className="flex justify-between items-start md:contents">
            <div className="flex flex-col min-w-0 pr-2 md:col-span-1">
                <span className={`font-bold text-sm leading-tight break-words whitespace-normal md:truncate md:text-xs ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                {track.name}
                </span>
                <span className="text-xs opacity-60 font-medium leading-tight break-words whitespace-normal mt-0.5 md:truncate md:text-[10px]">
                {track.artist}
                </span>
            </div>
            
            {/* Mobile Only: Expand Button */}
            <button 
                onClick={handleExpand}
                className="md:hidden p-2 -mr-2 -mt-2 text-gray-500 hover:text-white transition-colors"
            >
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
        </div>
      
        {/* ESSENTIAL INFO ROW (Mobile: Wrapped Flex | Desktop: Grid Cells) */}
        <div className="flex flex-wrap items-center gap-2 w-full md:contents">
            
            {/* Genre (Hidden on Mobile Collapsed, Shown on Desktop) */}
            <div className="hidden md:block md:truncate md:opacity-80 flex-shrink-0">
                <span className="bg-gray-800/50 px-2 py-1 md:px-1.5 md:py-0.5 rounded border border-gray-700/50 text-[10px] md:text-[9px] uppercase font-black text-gray-300">
                    {track.genre || '---'}
                </span>
            </div>
            
            {/* BPM Badge */}
            <div className="bg-gray-800/60 border border-gray-700 rounded px-2 py-1 flex items-center gap-1.5 md:contents md:bg-transparent md:border-none md:p-0">
                <ActivityIcon className="w-3 h-3 text-white opacity-50 md:hidden" />
                <span className="font-mono font-black text-xs text-white opacity-90 md:text-center md:block md:w-full">
                    {track.bpm}
                </span>
            </div>
            
            {/* Key Badge */}
            <div className={`bg-gray-800/60 border border-gray-700 rounded px-2 py-1 md:contents md:bg-transparent md:border-none md:p-0`}>
                <span className={`font-mono font-black text-xs md:text-center md:block md:w-full ${isSelected ? 'text-blue-300' : 'text-blue-400'}`}>
                    {track.key}
                </span>
            </div>
            
            {/* Duration Badge */}
            <div className="bg-gray-800/60 border border-gray-700 rounded px-2 py-1 flex items-center gap-1.5 md:contents md:bg-transparent md:border-none md:p-0">
                <ClockIcon className="w-3 h-3 text-white opacity-50 md:hidden" />
                <span className="font-mono text-xs font-medium text-white opacity-70 md:text-center md:block md:w-full">
                    {track.duration}
                </span>
            </div>

            {/* Rating */}
            <div className="ml-auto md:ml-0 md:flex md:justify-end md:pr-1">
                {renderRating(track.rating)}
            </div>
        </div>
      </div>

      {/* MOBILE EXPANDED DETAILS */}
      {isExpanded && (
        <div className="md:hidden px-3 pb-3 pt-1 mt-1 border-t border-gray-800/50 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-3">
                {/* Genre (Shown here on mobile) */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-1">
                        <TagIcon className="w-3 h-3" /> Gênero
                    </span>
                    <span className="text-xs font-bold text-white truncate">{track.genre || 'N/A'}</span>
                </div>

                {/* Energy */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black text-gray-500">Energia</span>
                    <EnergyBar energy={track.energy || 0} />
                </div>

                {/* Location */}
                <div className="col-span-2 flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black text-gray-500 flex items-center gap-1">
                        <FolderIcon className="w-3 h-3" /> Local
                    </span>
                    <span className="text-xs text-blue-300 truncate font-mono">{track.location}</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
