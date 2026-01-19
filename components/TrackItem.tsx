
import React from 'react';
import type { Track } from '../types';
import { ClockIcon, StarIcon, FolderIcon } from './icons';
import { CoverArt } from './CoverArt';

// Helper function for rendering stars
const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    // Using smaller stars for this compact view
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
  const baseClasses = "p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors duration-200";
  const selectedClasses = "bg-gray-700 text-white";
  const defaultClasses = "bg-gray-900 text-gray-300 hover:bg-gray-800";

  return (
    <div
      onClick={() => onSelect(track)}
      className={`${baseClasses} ${isSelected ? selectedClasses : defaultClasses}`}
    >
      <div className="w-12 h-12 flex-shrink-0">
          <CoverArt 
            id={track.id}
            artist={track.artist}
            name={track.name}
            className="w-full h-full rounded-md"
            priority={false} // Lazy load list items to prefer performance
          />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold text-gray-100 truncate">{track.name}</p>
        <p className={`text-sm truncate ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>{track.artist}</p>
        
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1" title="Duração">
                <ClockIcon className="w-3 h-3" />
                <span className="font-mono">{track.duration}</span>
            </div>
            <div className="flex items-center gap-1" title="Avaliação">
                {renderRating(track.rating)}
            </div>
            <div title="BPM" className="font-mono">
                 <span>{track.bpm}</span>
            </div>
             <div title="Tom" className="font-mono">
                 <span className={`${isSelected ? 'bg-gray-800' : 'bg-gray-950/50'} px-1.5 py-0.5 rounded`}>{track.key}</span>
            </div>
        </div>
         <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500" title="Pasta de Origem">
            <FolderIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{track.location}</span>
        </div>
      </div>
    </div>
  );
};
