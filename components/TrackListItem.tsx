
import React from 'react';
import type { Track } from '../types';
import { StarIcon } from './icons';

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
  return (
    <div
      onClick={() => onSelect(track)}
      className={`grid grid-cols-[1fr_90px_50px_50px_60px_75px] gap-2 px-3 py-2.5 border-b border-gray-800/50 cursor-pointer transition-colors items-center text-xs
        ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'bg-transparent text-white/80 hover:bg-white/5'}`}
    >
      <div className="flex flex-col min-w-0 pr-2">
        <span className={`font-bold truncate ${isSelected ? 'text-blue-400' : 'text-white'}`}>{track.name}</span>
        <span className="text-[10px] opacity-60 truncate font-medium">{track.artist}</span>
      </div>
      
      <div className="truncate opacity-80">
        <span className="bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50 text-[9px] uppercase font-black text-gray-300">
            {track.genre || '---'}
        </span>
      </div>
      
      <div className="font-mono font-black text-center opacity-90">
        {track.bpm}
      </div>
      
      <div className="font-mono font-black text-center text-blue-400">
        {track.key}
      </div>
      
      <div className="flex items-center justify-center opacity-60 font-mono text-[10px]">
        {track.duration}
      </div>

      <div className="flex justify-end pr-1">
        {renderRating(track.rating)}
      </div>
    </div>
  );
};
