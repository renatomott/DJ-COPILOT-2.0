
import React from 'react';
import type { Track } from '../types';
import { ClockIcon, StarIcon, FolderIcon, PlusIcon, ZapIcon } from './icons';
import { CoverArt } from './CoverArt';
import { EnergyBar } from './EnergyBar';

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
  isOnAir?: boolean;
  onAddToQueue?: (e: React.MouseEvent, track: Track) => void;
}

const renderRating = (rating: number) => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[0.75em] h-[0.75em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/50'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected, isOnAir, onAddToQueue }) => {
  const baseClasses = "p-2 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all duration-300 border relative group overflow-hidden";
  const selectedClasses = "bg-cyan-950/20 border-cyan-500 shadow-md ring-1 ring-cyan-500/30";
  const onAirClasses = "bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse-onair ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-black";
  const defaultClasses = "bg-slate-900/40 border-slate-800 hover:bg-slate-800 hover:border-slate-600";

  return (
    <>
      <style>{`
        @keyframes pulse-onair {
          0%, 100% { border-color: rgba(34, 211, 238, 0.4); box-shadow: 0 0 10px rgba(34, 211, 238, 0.2); }
          50% { border-color: rgba(34, 211, 238, 1); box-shadow: 0 0 25px rgba(34, 211, 238, 0.4); }
        }
        .animate-pulse-onair {
          animation: pulse-onair 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1);
        }
      `}</style>
      <div
        onClick={() => onSelect(track)}
        className={`${baseClasses} ${isOnAir ? onAirClasses : isSelected ? selectedClasses : defaultClasses}`}
      >
        <div className="w-12 h-12 flex-shrink-0 relative">
            <CoverArt 
              id={track.id}
              artist={track.artist}
              name={track.name}
              className="w-full h-full rounded-lg"
              priority={false} 
            />
            {isOnAir && (
                <div className="absolute inset-0 ring-1 ring-cyan-400 rounded-lg z-10"></div>
            )}
        </div>
        
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-start gap-2 mb-0.5">
              <p className={`font-black text-sm leading-tight text-white line-clamp-1 break-words tracking-tight`}>
                {track.name}
              </p>
              {track.bpm && (
                  <span className="flex-shrink-0 text-[9px] font-mono font-black text-cyan-400 bg-black/40 px-1.5 py-0.5 rounded border border-slate-700 self-start shadow-sm">
                    {track.bpm}
                  </span>
              )}
          </div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] text-slate-400 line-clamp-1 font-bold">{track.artist}</p>
            <p className="text-[8px] text-cyan-500/60 truncate uppercase tracking-wider font-black max-w-[40%]">{track.location}</p>
          </div>
          
          <div className="flex items-center gap-2 text-[9px] text-white">
              <span className={`font-mono px-1.5 py-0.5 rounded-md font-black text-[9px] ${isOnAir ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-cyan-400 border border-slate-700'}`}>
                  {track.key || 'N/A'}
              </span>
              
              <div className="w-px h-3 bg-slate-700/50"></div>
              
              {track.energy ? (
                  <EnergyBar energy={track.energy} className="scale-75 origin-left" />
              ) : (
                  <div className="flex items-center gap-1">
                      <ClockIcon className="w-2.5 h-2.5 text-slate-500 opacity-70" />
                      <span className="font-mono font-black text-[9px] text-slate-400">{track.duration}</span>
                  </div>
              )}

              <div className="w-px h-3 bg-slate-700/50 ml-auto"></div>

              <div className="flex items-center">
                  {renderRating(track.rating)}
              </div>
          </div>
        </div>

        {isOnAir && (
          <div className="absolute top-0 left-0 bg-cyan-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-br-md flex items-center gap-1 uppercase tracking-widest shadow-lg z-20 border-r border-b border-cyan-400/50">
            <ZapIcon className="w-1.5 h-1.5 fill-current" /> ON
          </div>
        )}

        {onAddToQueue && !isOnAir && (
          <button 
              onClick={(e) => onAddToQueue(e, track)}
              className="p-2 bg-slate-800/80 rounded-lg text-white opacity-0 group-hover:opacity-100 hover:bg-cyan-600 transition-all border border-slate-600 hover:border-cyan-500 z-20 shadow-lg ml-1"
          >
              <PlusIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </>
  );
};
