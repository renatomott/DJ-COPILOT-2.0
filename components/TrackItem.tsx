
import React from 'react';
import type { Track } from '../types';
import { ClockIcon, StarIcon, FolderIcon } from './icons';
import { CoverArt } from './CoverArt';

// Helper function for rendering stars
const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<StarIcon key={i} className={`w-3 h-3 ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}`} filled={i <= rating} />);
  }
  return <div className="flex items-center">{stars}</div>;
}

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
}

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected }) => {
  const baseClasses = "p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 border";
  const selectedClasses = "bg-blue-900/20 border-blue-500/50 shadow-md";
  const defaultClasses = "bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700";

  return (
    <div
      onClick={() => onSelect(track)}
      className={`${baseClasses} ${isSelected ? selectedClasses : defaultClasses}`}
    >
      <div className="w-12 h-12 flex-shrink-0 relative">
          <CoverArt 
            id={track.id}
            artist={track.artist}
            name={track.name}
            className="w-full h-full rounded-lg"
            priority={false} 
          />
          {isSelected && (
              <div className="absolute inset-0 ring-2 ring-blue-500 rounded-lg z-10"></div>
          )}
      </div>
      
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex justify-between items-start">
            <p className={`font-semibold truncate text-sm ${isSelected ? 'text-white' : 'text-gray-200'}`}>{track.name}</p>
            {track.bpm && (
                <span className="ml-2 text-[10px] font-mono font-bold text-gray-500 bg-gray-950/50 px-1.5 py-0.5 rounded border border-gray-800">{track.bpm}</span>
            )}
        </div>
        <p className="text-xs text-gray-500 truncate mb-1.5">{track.artist}</p>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                {track.key}
            </span>
            <div className="w-px h-3 bg-gray-700"></div>
            <div className="flex items-center gap-1" title="Duração">
                <ClockIcon className="w-3 h-3 text-gray-600" />
                <span className="font-mono text-[10px]">{track.duration}</span>
            </div>
             <div className="hidden sm:flex w-px h-3 bg-gray-700"></div>
             <div className="hidden sm:flex items-center gap-1.5" title="Pasta de Origem">
                <FolderIcon className="w-3 h-3 text-gray-600" />
                <span className="truncate max-w-[100px] text-[10px]">{track.location}</span>
            </div>
        </div>
      </div>
    </div>
  );
};
