
import React from 'react';
import type { Track, ViewMode } from '../types';
import { ClockIcon, StarIcon, PlusIcon, ZapIcon, PlayIcon, FolderIcon } from './icons';
import { CoverArt } from './CoverArt';
import { EnergyBar } from './EnergyBar';

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
  isOnAir?: boolean;
  onAddToQueue?: (e: React.MouseEvent, track: Track) => void;
  variant?: ViewMode;
}

const renderRating = (rating: number) => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[0.85em] h-[0.85em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/50'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected, isOnAir, onAddToQueue, variant = 'card' }) => {
  const isList = variant === 'list';
  const baseClasses = `rounded-xl flex items-center cursor-pointer transition-all duration-300 border relative group overflow-hidden`;
  const selectedClasses = "bg-cyan-950/20 border-cyan-500 shadow-md ring-1 ring-cyan-500/30";
  const onAirClasses = "bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse-onair ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-black";
  const defaultClasses = "bg-slate-900/40 border-slate-800 hover:bg-slate-800 hover:border-slate-600";

  // LIST VIEW LAYOUT
  if (isList) {
      return (
        <div 
            onClick={() => onSelect(track)} 
            className={`${baseClasses} gap-3 px-3 py-2 ${isOnAir ? onAirClasses : isSelected ? selectedClasses : defaultClasses}`}
        >
            {/* Left: BPM & Key (Stacked for compactness) */}
            <div className="flex flex-col items-center justify-center gap-0.5 min-w-[3rem] border-r border-white/5 pr-3">
                 <span className="text-[11px] font-mono font-bold text-white">{track.bpm}</span>
                 <span className={`text-[9px] font-mono font-bold px-1.5 rounded-sm w-full text-center ${track.key && track.key.includes('m') ? 'bg-cyan-900/40 text-cyan-300' : 'bg-pink-900/40 text-pink-300'}`}>
                    {track.key || '--'}
                 </span>
            </div>
            
            {/* Middle: Title & Artist & Folder */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <p className={`text-[13px] font-bold truncate leading-tight ${isSelected ? 'text-cyan-100' : 'text-white'}`}>{track.name}</p>
                    {track.energy && <EnergyBar energy={track.energy} className="w-8 scale-75 hidden sm:flex" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-400 truncate font-bold uppercase max-w-[50%]">{track.artist}</p>
                    {track.location && (
                        <>
                            <div className="w-px h-2 bg-slate-700"></div>
                            <p className="text-[9px] text-cyan-700/80 truncate font-mono uppercase">{track.location}</p>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Metadata & Action */}
            <div className="flex items-center gap-3 pl-2 border-l border-white/5">
                 <div className="hidden sm:block opacity-80 scale-90">
                    {renderRating(track.rating)}
                 </div>
                 <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] font-mono font-bold text-slate-500">{track.duration}</span>
                 </div>
                 
                {onAddToQueue && (
                    <button 
                        onClick={(e) => onAddToQueue(e, track)} 
                        className="p-1.5 text-slate-500 hover:text-white transition-colors bg-white/5 hover:bg-cyan-600 rounded-lg ml-1"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
      );
  }

  // CARD VIEW LAYOUT (Default)
  return (
    <>
      <style>{`@keyframes pulse-onair { 0%, 100% { border-color: rgba(34, 211, 238, 0.4); box-shadow: 0 0 10px rgba(34, 211, 238, 0.2); } 50% { border-color: rgba(34, 211, 238, 1); box-shadow: 0 0 25px rgba(34, 211, 238, 0.4); } } .animate-pulse-onair { animation: pulse-onair 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1); }`}</style>
      <div
        onClick={() => onSelect(track)}
        className={`${baseClasses} p-2 gap-2.5 ${isOnAir ? onAirClasses : isSelected ? selectedClasses : defaultClasses}`}
      >
        <div className="w-14 h-14 flex-shrink-0 relative group/cover rounded-lg overflow-hidden">
            <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full" priority={false} />
            
            {isOnAir && (<div className="absolute inset-0 ring-1 ring-cyan-400 z-10 pointer-events-none"></div>)}
            
            {/* Play Count Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-[2px] h-4 flex items-center justify-center pointer-events-none z-10">
                 <div className="flex items-center gap-0.5">
                    <PlayIcon className="w-2 h-2 text-white/70" />
                    <span className="text-[8px] font-black text-white">{track.playCount}</span>
                 </div>
            </div>

            {/* Add to Queue Button - OVERLAY on Album Art */}
            {onAddToQueue && !isOnAir && (
                <button 
                    onClick={(e) => onAddToQueue(e, track)} 
                    className="absolute top-0 right-0 p-1.5 bg-black/60 hover:bg-cyan-600 text-white transition-all z-20 rounded-bl-lg backdrop-blur-sm border-l border-b border-white/10 active:scale-90"
                    title="Add to Queue"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
        
        <div className="flex-1 overflow-hidden min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-start gap-2 mb-0.5">
              <p className={`font-bold text-base leading-tight text-white line-clamp-1 break-words tracking-tight`}>{track.name}</p>
              {track.bpm && (<span className="flex-shrink-0 text-[9px] font-mono font-bold text-cyan-400 bg-black/40 px-1.5 py-0.5 rounded border border-slate-700 self-start shadow-sm">{track.bpm}</span>)}
          </div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] text-slate-400 line-clamp-1 font-bold flex-1">{track.artist}</p>
            {track.location && (
                <div className="flex items-center gap-1 flex-shrink-0 justify-end max-w-[60%]">
                    <FolderIcon className="w-2.5 h-2.5 text-cyan-600 flex-shrink-0" />
                    <p className="text-[8px] text-cyan-500 uppercase tracking-wider font-black break-words leading-tight text-right">{track.location}</p>
                </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-white">
              <span className={`font-mono px-1.5 py-0.5 rounded-md font-bold text-[11px] ${isOnAir ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-cyan-400 border border-slate-700'}`}>{track.key || 'N/A'}</span>
              <div className="w-px h-3 bg-slate-700/50"></div>
              {track.energy ? (<EnergyBar energy={track.energy} className="scale-75 origin-left" />) : (<div className="flex items-center gap-1"><ClockIcon className="w-2.5 h-2.5 text-slate-500 opacity-70" /><span className="font-mono font-bold text-[11px] text-slate-400">{track.duration}</span></div>)}
              <div className="w-px h-3 bg-slate-700/50 ml-auto"></div>
              <div className="flex items-center">{renderRating(track.rating)}</div>
          </div>
        </div>

        {isOnAir && (<div className="absolute top-0 left-0 bg-cyan-500 text-black text-[7px] font-bold px-1.5 py-0.5 rounded-br-md flex items-center gap-1 uppercase tracking-widest shadow-lg z-20 border-r border-b border-cyan-400/50"><ZapIcon className="w-1.5 h-1.5 fill-current" /> ON</div>)}
      </div>
    </>
  );
};
