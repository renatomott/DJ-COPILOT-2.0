
import React, { useRef, useEffect } from 'react';
import type { Track, ViewMode } from '../types';
import { ClockIcon, StarIcon, PlusIcon, ZapIcon, PlayIcon, FolderIcon, TagIcon, ActivityIcon, BrainIcon } from './icons';
import { CoverArt } from './CoverArt';
import { EnergyBar } from './EnergyBar';

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isOnAir?: boolean;
  onAddToQueue?: (e: React.MouseEvent, track: Track) => void;
  variant?: ViewMode;
  searchQuery?: string;
  referenceTrack?: Track | null; // Faixa "NO AR" para comparação
}

const renderRating = (rating: number, sizeClass = "w-3 h-3") => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`${sizeClass} ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/30'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

// Helper for Smart Search Highlight
const HighlightText: React.FC<{ text: string; query?: string; className?: string }> = ({ text, query, className }) => {
    if (!query || query.length < 2) return <span className={className}>{text}</span>;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <span className={className}>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className="text-yellow-300 bg-yellow-900/30 rounded-sm px-0.5">{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

// Helper for Hex to RGBA
const hexToRgba = (hex: string | undefined, alpha: number) => {
    if (!hex) return `rgba(6, 182, 212, ${alpha})`; 
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected, isExpanded = false, onToggleExpand, isOnAir, onAddToQueue, variant = 'card', searchQuery, referenceTrack }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isList = variant === 'list';
  
  // Logic to highlight matching BPM/Key with On Air track
  const isBpmMatch = referenceTrack && !isOnAir && Math.abs(parseFloat(track.bpm) - parseFloat(referenceTrack.bpm)) < 0.1;
  const isKeyMatch = referenceTrack && !isOnAir && track.key === referenceTrack.key;

  const matchStyle = "ring-1 ring-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.3)] text-yellow-400";
  
  // Dynamic Border/Glow based on track color
  // Default to WHITE if no color is assigned, as requested.
  const trackColor = track.color || '#FFFFFF';
  const glowColor = hexToRgba(trackColor, 0.4);

  // Common Container Styles (Matching SuggestionItem)
  // FIXED: Removed borderLeft properties to avoid conflicts. Used absolute div instead.
  const containerStyle = isExpanded 
    ? { 
        boxShadow: `0 0 30px -5px ${glowColor}`, 
        borderColor: 'rgba(255,255,255,0.2)',
      }
    : { 
        borderColor: 'rgba(255,255,255,0.1)',
      };

  const baseClasses = `relative overflow-hidden transition-all duration-300 border cursor-pointer scroll-mt-24 pl-[6px]`; // Added padding-left to compensate for the visual bar if needed, or rely on absolute positioning not affecting flow
  const bgClasses = isExpanded ? 'bg-slate-900/90 rounded-xl' : 'bg-black/40 backdrop-blur-md hover:bg-black/50 rounded-lg';
  const onAirClasses = isOnAir ? "ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse-onair" : "";

  useEffect(() => {
    if (isExpanded && cardRef.current && !isList) {
        setTimeout(() => {
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }
  }, [isExpanded, isList]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isList) {
        onSelect(track);
        return;
    }
    if (onToggleExpand) {
        onToggleExpand();
    } else {
        onSelect(track);
    }
  };

  const handlePlayAction = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onSelect(track);
  };

  const handleAddAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onAddToQueue) onAddToQueue(e, track);
  };

  // --- LIST VIEW ---
  if (isList) {
      return (
        <div 
            onClick={handleCardClick} 
            className={`rounded-xl cursor-pointer transition-all duration-300 border border-white/5 hover:border-white/10 flex items-center gap-3 px-3 py-2 ${isOnAir ? 'bg-cyan-900/20 border-cyan-500/50' : isSelected ? 'bg-cyan-950/40 border-cyan-500' : 'bg-slate-900/40 hover:bg-slate-800'}`}
        >
            {/* Left: BPM & Key */}
            <div className="flex flex-col items-center justify-center gap-1.5 min-w-[3rem] border-r border-white/5 pr-3">
                 <span className={`text-[11px] font-mono font-bold text-white px-1 rounded ${isBpmMatch ? 'text-yellow-400' : ''}`}>
                    {track.bpm}
                 </span>
                 <span className={`text-[9px] font-mono font-bold px-1.5 rounded-sm w-full text-center ${track.key && track.key.includes('m') ? 'bg-cyan-900/40 text-cyan-300' : 'bg-pink-900/40 text-pink-300'} ${isKeyMatch ? 'ring-1 ring-yellow-500 text-yellow-400' : ''}`}>
                    {track.key || '--'}
                 </span>
            </div>
            
            {/* Middle: Title & Artist */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    {track.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />}
                    <HighlightText text={track.name} query={searchQuery} className={`text-[13px] font-semibold truncate leading-tight ${isSelected ? 'text-cyan-100' : 'text-slate-100'}`} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <HighlightText text={track.artist} query={searchQuery} className="text-[10px] text-slate-400 truncate font-medium uppercase max-w-[50%]" />
                    {track.location && <><div className="w-px h-2 bg-slate-700"></div><p className="text-[9px] text-cyan-700/80 truncate font-mono uppercase">{track.location}</p></>}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/5">
                 <div className="hidden sm:block opacity-80 scale-90">{renderRating(track.rating)}</div>
                 <button onClick={handlePlayAction} className="p-1.5 text-cyan-400 hover:text-white bg-cyan-900/20 hover:bg-cyan-600 rounded-lg"><PlayIcon className="w-4 h-4 fill-current" /></button>
                 {onAddToQueue && <button onClick={handleAddAction} className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-green-600 rounded-lg"><PlusIcon className="w-4 h-4" /></button>}
            </div>
        </div>
      );
  }

  // --- CARD VIEW (Standardized with SuggestionItem) ---
  return (
    <>
      <style>{`@keyframes pulse-onair { 0%, 100% { border-color: rgba(34, 211, 238, 0.4); box-shadow: 0 0 10px rgba(34, 211, 238, 0.2); } 50% { border-color: rgba(34, 211, 238, 1); box-shadow: 0 0 25px rgba(34, 211, 238, 0.4); } } .animate-pulse-onair { animation: pulse-onair 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1); }`}</style>
      
      <div
        ref={cardRef}
        onClick={handleCardClick}
        className={`${baseClasses} ${bgClasses} ${onAirClasses}`}
        style={containerStyle}
      >
          {/* Robust Color Bar (Absolute positioning prevents loss on style updates) */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-[6px] z-10 transition-colors duration-300" 
            style={{ backgroundColor: trackColor }} 
          />

          {/* Main Layout: Row (Image Left, Content Right) */}
          <div className={`flex flex-row gap-3 ${isExpanded ? 'p-3 items-start' : 'items-center p-2.5'}`}>
            
            {/* 1. COVER ART */}
            <div className={`relative flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-20 h-20' : 'w-16 h-16'}`}>
              <div className="w-full h-full rounded-md overflow-hidden shadow-lg border border-white/10 bg-black relative group/cover">
                <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full" priority={isExpanded} />
                {isOnAir && <div className="absolute inset-0 ring-1 ring-cyan-400 z-10 pointer-events-none"></div>}
                {/* Play Count Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-[1px] h-3.5 flex items-center justify-center pointer-events-none z-10">
                    <div className="flex items-center gap-0.5">
                        <PlayIcon className="w-2 h-2 text-white/70" />
                        <span className="text-[7px] font-bold text-white">{track.playCount}</span>
                    </div>
                </div>
              </div>
            </div>

            {/* 2. INFO & METADATA */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Header */}
                <div className="flex flex-col mb-1">
                     <HighlightText 
                        text={track.name} 
                        query={searchQuery}
                        className={`font-semibold text-slate-50 leading-tight break-words tracking-tight ${isExpanded ? 'text-xl mb-1 line-clamp-2' : 'text-base md:text-lg line-clamp-1'}`}
                     />
                     <HighlightText 
                        text={track.artist} 
                        query={searchQuery}
                        className={`font-medium text-cyan-200 break-words leading-tight truncate ${isExpanded ? 'text-base mb-2' : 'text-sm md:text-base'}`}
                     />
                </div>

                {/* Retracted State: Stats Row + Meta Row */}
                {!isExpanded && (
                    <div className="flex flex-col gap-1.5 w-full">
                        {/* Row A: BPM | Key | Energy */}
                        <div className="flex items-center gap-2">
                            {/* BPM */}
                            <span className={`text-[11px] md:text-sm font-mono font-bold px-1.5 py-0.5 rounded ${isBpmMatch ? matchStyle : 'text-slate-300 bg-white/5'}`}>
                                {track.bpm}
                            </span>
                            {/* Key */}
                            <span className={`text-[11px] md:text-sm font-mono font-bold px-1.5 py-0.5 rounded ${isKeyMatch ? matchStyle : track.key.includes('m') ? 'text-cyan-300 bg-cyan-950/30' : 'text-pink-300 bg-pink-950/30'}`}>
                                {track.key}
                            </span>
                            
                            {/* Duration (Tablet Only) */}
                            <span className="hidden md:block text-[11px] md:text-sm font-mono font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                                {track.duration}
                            </span>

                             {/* Energy Mini */}
                             {track.energy && (
                                <div className="bg-black/40 px-1.5 py-1 rounded border border-white/5 flex items-center gap-1">
                                    <ZapIcon className="w-2.5 h-2.5 text-yellow-500" />
                                    <EnergyBar energy={track.energy} className="h-2 w-8" />
                                </div>
                             )}
                        </div>

                        {/* Row B: Folder | Duration | Rating */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-1 mt-0.5">
                             {/* Folder */}
                             <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                {track.color ? (
                                    <span className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] flex-shrink-0" style={{ backgroundColor: track.color, color: track.color }} />
                                ) : (
                                    <FolderIcon className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                                )}
                                <span className="text-[9px] md:text-[10px] text-slate-300 font-medium uppercase truncate tracking-wide">{track.location || 'N/A'}</span>
                            </div>
                            
                            {/* Time & Rating */}
                            <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                                {/* Duration (Mobile Only - Hidden on Tablet because it's on top row) */}
                                <span className="text-xs font-mono text-slate-400 font-bold md:hidden">{track.duration}</span>
                                {renderRating(track.rating, "w-3 h-3")}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Expanded: Inline Rating */}
                {isExpanded && (
                    <div className="flex items-center gap-3">
                        {renderRating(track.rating, "w-2.5 h-2.5")}
                        {isOnAir && <span className="bg-cyan-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1"><ZapIcon className="w-2 h-2" /> ON AIR</span>}
                    </div>
                )}
            </div>
          </div>

          {/* 3. EXPANDED DETAILS (Grid + Actions) */}
          {isExpanded && (
             <div className="px-3 pb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                
                {/* A. Data Grid */}
                <div className="grid grid-cols-4 gap-2">
                    {/* BPM */}
                    <div className={`rounded p-1.5 flex flex-col items-center justify-center bg-black/40 border border-white/10 ${isBpmMatch ? 'ring-1 ring-yellow-500/50' : ''}`}>
                        <span className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">BPM</span>
                        <span className={`text-xs font-mono font-bold ${isBpmMatch ? 'text-yellow-400' : 'text-slate-200'}`}>{track.bpm}</span>
                    </div>
                    {/* Key */}
                    <div className={`rounded p-1.5 flex flex-col items-center justify-center bg-black/40 border border-white/10 ${isKeyMatch ? 'ring-1 ring-yellow-500/50' : ''}`}>
                         <span className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Key</span>
                         <span className={`text-xs font-mono font-bold ${isKeyMatch ? 'text-yellow-400' : track.key.includes('m') ? 'text-cyan-400' : 'text-pink-400'}`}>{track.key}</span>
                    </div>
                    {/* Plays */}
                    <div className="bg-black/40 rounded border border-white/10 p-1.5 flex flex-col items-center justify-center">
                        <span className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Plays</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{track.playCount}</span>
                    </div>
                    {/* Time */}
                    <div className="bg-black/40 rounded border border-white/10 p-1.5 flex flex-col items-center justify-center">
                        <span className="text-[8px] text-slate-400 uppercase font-bold mb-0.5">Time</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{track.duration}</span>
                    </div>
                </div>

                {/* B. Genre/Subgenre */}
                <div className="flex gap-2">
                     <div className="flex-1 bg-white/5 rounded-lg p-2 border border-white/5">
                        <span className="text-[8px] text-slate-400 font-bold uppercase block mb-0.5">Gênero</span>
                        <span className="text-xs text-slate-200 font-semibold truncate block">{track.genre || '-'}</span>
                     </div>
                     {track.subgenre && (
                        <div className="flex-1 bg-cyan-950/20 rounded-lg p-2 border border-cyan-500/20">
                            <span className="text-[8px] text-cyan-500 font-bold uppercase block mb-0.5 flex items-center gap-1"><BrainIcon className="w-2 h-2" /> Vibe</span>
                            <span className="text-xs text-cyan-200 font-semibold truncate block">{track.subgenre}</span>
                        </div>
                     )}
                </div>

                {/* C. Cues */}
                {track.cuePoints && track.cuePoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center bg-black/20 p-2 rounded-lg">
                        {track.cuePoints.slice(0, 4).map((cue, idx) => (
                             <span key={idx} className="bg-slate-800 text-cyan-200 text-[9px] font-bold px-2 py-1 rounded border border-slate-700">{cue}</span>
                        ))}
                    </div>
                )}

                {/* D. Actions */}
                <div className="flex gap-2 pt-1">
                     <button 
                        onClick={handlePlayAction}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white h-10 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95"
                     >
                        <PlayIcon className="w-4 h-4" /> Load
                     </button>
                     {onAddToQueue && (
                         <button 
                            onClick={handleAddAction}
                            className="bg-green-600 hover:bg-green-500 text-white w-14 h-10 rounded-lg flex items-center justify-center shadow-lg active:scale-95"
                         >
                            <PlusIcon className="w-5 h-5" />
                         </button>
                     )}
                </div>
             </div>
          )}
      </div>
    </>
  );
};
