
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
        className={`w-2.5 h-2.5 ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

export const TrackListItem: React.FC<TrackListItemProps> = ({ track, onSelect, isSelected }) => {
  return (
    <div 
      onClick={() => onSelect(track)}
      className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
        isSelected 
          ? 'bg-cyan-900/20 border-cyan-500/50 shadow-sm' 
          : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-black text-sm truncate ${isSelected ? 'text-cyan-400' : 'text-gray-200'}`}>
            {track.name}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-bold truncate max-w-[120px]">{track.artist}</span>
          <div className="w-px h-3 bg-gray-700"></div>
          <span className="font-mono">{track.bpm}</span>
          <span className={`font-mono font-bold ${track.key.includes('m') ? 'text-cyan-600' : 'text-pink-600'}`}>
            {track.key}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-4">
        {track.energy && (
             <div className="w-16">
                 <EnergyBar energy={track.energy} />
             </div>
        )}
        <div className="w-20 flex justify-end">
            {renderRating(track.rating)}
        </div>
        <div className="w-12 text-right font-mono text-xs text-gray-500">
            {track.duration}
        </div>
      </div>
    </div>
  );
};
