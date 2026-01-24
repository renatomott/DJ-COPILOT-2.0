
import React from 'react';
import type { Track } from '../types';
import { ClockIcon, StarIcon, FolderIcon, PlusIcon } from './icons';
import { CoverArt } from './CoverArt';
import { EnergyBar } from './EnergyBar';

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
  onAddToQueue?: (e: React.MouseEvent, track: Track) => void;
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

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected, onAddToQueue }) => {
  const baseClasses = "p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 border relative group";
  const selectedClasses = "bg-blue-900/30 border-blue-500 shadow-md ring-1 ring-blue-500/30";
  const defaultClasses = "bg-gray-900 border-gray-700 hover:bg-gray-800 hover:border-gray-500";

  return (
    <div
      onClick={() => onSelect(track)}
      className={`${baseClasses} ${isSelected ? selectedClasses : defaultClasses}`}
    >
      <div className="w-14 h-14 flex-shrink-0 relative">
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
      
      <div className="flex-1 overflow-hidden min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-start gap-2 mb-0.5">
            <p className={`font-bold text-base leading-tight text-white line-clamp-2 break-words`}>{track.name}</p>
            {track.bpm && (
                <span className="flex-shrink-0 text-xs font-mono font-black text-white bg-black px-1.5 py-0.5 rounded border border-gray-600 self-start mt-0.5">
                  {track.bpm}
                </span>
            )}
        </div>
        <p className="text-sm text-white opacity-90 line-clamp-1 mb-1.5 font-bold">{track.artist}</p>
        
        <div className="flex items-center gap-3 text-xs text-white">
            <span className={`font-mono text-[0.8em] px-1.5 py-0.5 rounded font-black ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white border border-gray-600'}`}>
                {track.key || 'N/A'}
            </span>
            
            <div className="w-px h-3 bg-gray-600"></div>
            
            {track.energy ? (
                <EnergyBar energy={track.energy} />
            ) : (
                <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3 text-white opacity-70" />
                    <span className="font-mono font-black text-xs">{track.duration}</span>
                </div>
            )}

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

      {onAddToQueue && (
        <button 
            onClick={(e) => onAddToQueue(e, track)}
            className="absolute right-2 bottom-2 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-blue-600 transition-all border border-gray-600 hover:border-blue-500 z-20"
            title="Adicionar ao Set Builder"
        >
            <PlusIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
