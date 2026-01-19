
import React from 'react';
import type { Track } from '../types';
import { ClockIcon, StarIcon, FolderIcon } from './icons';
import { CoverArt } from './CoverArt';

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
}

const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= rating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[0.8em] h-[0.8em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white opacity-20'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected }) => {
  const baseClasses = "p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 border";
  const selectedClasses = "bg-blue-900/30 border-blue-500 shadow-md ring-1 ring-blue-500/30";
  const defaultClasses = "bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-gray-500";

  return (
    <div
      onClick={() => onSelect(track)}
      className={`${baseClasses} ${isSelected ? selectedClasses : defaultClasses}`}
    >
      <div className="w-11 h-11 flex-shrink-0 relative">
          <CoverArt 
            id={track.id}
            artist={track.artist}
            name={track.name}
            className="w-full h-full rounded-lg"
            priority={false} 
          />
          {isSelected && (
              <div className="absolute inset-0 ring-1 ring-blue-500 rounded-lg z-10"></div>
          )}
      </div>
      
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex justify-between items-start gap-2 mb-0.5">
            <p className={`font-bold truncate text-sm text-white`}>{track.name}</p>
            {track.bpm && (
                <span className="flex-shrink-0 text-xs font-mono font-black text-white bg-black px-1.5 py-0.5 rounded border border-gray-600">
                  {track.bpm}
                </span>
            )}
        </div>
        <p className="text-xs text-white opacity-90 truncate mb-2 font-bold">{track.artist}</p>
        
        <div className="flex items-center gap-3 text-xs text-white">
            <span className={`font-mono text-[0.8em] px-1.5 py-0.5 rounded font-black ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white border border-gray-600'}`}>
                {track.key}
            </span>
            
            <div className="w-px h-3 bg-gray-600"></div>
            
            <div className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3 text-white opacity-70" />
                {/* Fonte aumentada para text-sm e peso black */}
                <span className="font-mono font-black text-sm">{track.duration}</span>
            </div>

            <div className="w-px h-3 bg-gray-600"></div>

            {/* Renderização da Classificação */}
            <div className="flex items-center">
                {renderRating(track.rating)}
            </div>
            
             <div className="hidden sm:flex items-center gap-1 ml-auto">
                <FolderIcon className="w-3 h-3 text-white opacity-70" />
                <span className="truncate max-w-[120px] font-bold text-blue-300">{track.location}</span>
            </div>
        </div>
      </div>
    </div>
  );
};
