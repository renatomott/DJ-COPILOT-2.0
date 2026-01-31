
import React, { useRef, useEffect } from 'react';
import type { Suggestion, Track } from '../types';
import { ClockIcon, PlayIcon, XIcon, ActivityIcon, StarIcon, FolderIcon, ZapIcon, BrainIcon, PlusIcon } from './icons';
import { CoverArt } from './CoverArt';
import { translations } from '../utils/translations';
import { SwipeableItem } from './SwipeableItem';

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

const hexToRgba = (hex: string | undefined, alpha: number) => {
    if (!hex) return `rgba(6, 182, 212, ${alpha})`; 
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface SuggestionItemProps {
  suggestion: Suggestion;
  currentTrack: Track;
  onSelect: (track: Track) => void;
  onDismiss: (trackId: string) => void;
  onAddToQueue?: (track: Track) => void;
  language: 'pt-BR' | 'en-US';
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ 
    suggestion, 
    currentTrack, 
    onSelect, 
    onDismiss, 
    onAddToQueue,
    language, 
    isExpanded, 
    onToggleExpand 
}) => {
  const t = translations[language];
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && itemRef.current) {
        setTimeout(() => {
            // Increased to ensure visibility
            const headerOffset = 110; 
            const elementPosition = itemRef.current?.getBoundingClientRect().top || 0;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }, 150);
    }
  }, [isExpanded]);

  const matchScoreDisplay = suggestion.matchScore <= 1 
    ? Math.round(suggestion.matchScore * 100) 
    : Math.round(suggestion.matchScore);

  const scoreColor = matchScoreDisplay >= 90 ? 'text-green-400' : 
                     matchScoreDisplay >= 75 ? 'text-cyan-400' : 'text-yellow-400';

  const isBpmMatch = Math.abs(parseFloat(currentTrack.bpm) - parseFloat(suggestion.bpm)) < 1.0;
  const isKeyMatch = currentTrack.key === suggestion.key;
  
  // Gold Outline Logic
  const goldBorderClass = "ring-1 ring-yellow-500/80 bg-yellow-900/20";
  const defaultBorderClass = "border border-white/10 bg-black/40";

  const glowColor = hexToRgba(suggestion.color, 0.4);
  const containerStyle = isExpanded 
    ? { boxShadow: `0 0 30px -5px ${glowColor}`, borderColor: 'rgba(255,255,255,0.2)' }
    : { borderColor: 'rgba(255,255,255,0.1)' };

  return (
    <SwipeableItem
        onLeftAction={() => onAddToQueue && onAddToQueue(suggestion)}
        leftColor="bg-green-600"
        leftIcon={<PlusIcon className="w-8 h-8 text-white" />}
        onRightAction={() => onSelect(suggestion)}
        rightColor="bg-cyan-600"
        rightIcon={<PlayIcon className="w-8 h-8 text-white" />}
    >
        <div 
          ref={itemRef}
          onClick={onToggleExpand}
          className={`relative overflow-hidden transition-all duration-300 border cursor-pointer ${isExpanded ? 'bg-slate-900/90 rounded-xl' : 'bg-black/40 backdrop-blur-md hover:bg-black/50 rounded-lg'}`}
          style={containerStyle}
        >
          {/* --- CONTENT CONTAINER --- */}
          <div className={`flex ${isExpanded ? 'flex-col gap-3 p-3' : 'flex-row items-center gap-3 p-2.5'}`}>
            
            {/* 1. COVER ART (Left Aligned in both states) */}
            <div className={`relative flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-20 h-20' : 'w-14 h-14'}`}>
              <div className="w-full h-full rounded-md overflow-hidden shadow-lg border border-white/10 bg-black relative">
                <CoverArt 
                  id={suggestion.id} 
                  artist={suggestion.artist} 
                  name={suggestion.name} 
                  className="w-full h-full"
                  priority={isExpanded}
                />
                {/* Play Overlay */}
                <div className={`absolute inset-0 bg-black/30 flex items-center justify-center ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                    {isExpanded && <PlayIcon className="w-8 h-8 text-white/80" />}
                </div>
              </div>
            </div>

            {/* 2. HEADER INFO (Right of Art) */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Title - Larger */}
                <h4 className={`font-black text-white leading-tight break-words ${isExpanded ? 'text-lg mb-0.5' : 'text-base'}`}>
                    {suggestion.name}
                </h4>
                
                {/* Artist - Bold & Colored */}
                <p className={`font-bold text-cyan-100 break-words leading-tight ${isExpanded ? 'text-sm mb-2' : 'text-xs mb-1.5'}`}>
                    {suggestion.artist}
                </p>

                {/* RETRACTED: Compact Stats Row */}
                {!isExpanded && (
                    <div className="flex items-center flex-wrap gap-2">
                         {/* Match % */}
                         <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded text-[10px]">
                            <BrainIcon className={`w-3 h-3 ${scoreColor}`} />
                            <span className={`font-black ${scoreColor}`}>{matchScoreDisplay}%</span>
                         </div>
                         
                         {/* BPM */}
                         <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isBpmMatch ? 'text-yellow-400 ring-1 ring-yellow-500/50' : 'text-gray-400 bg-white/5'}`}>
                            {suggestion.bpm}
                         </span>

                         {/* Key */}
                         <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isKeyMatch ? 'text-yellow-400 ring-1 ring-yellow-500/50' : suggestion.key.includes('m') ? 'text-cyan-300 bg-cyan-950/30' : 'text-pink-300 bg-pink-950/30'}`}>
                            {suggestion.key}
                         </span>
                        
                        {/* Dot Location */}
                        {suggestion.location && (
                             <div className="flex items-center gap-1 ml-auto opacity-70">
                                {suggestion.color ? (
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: suggestion.color }} />
                                ) : (
                                    <FolderIcon className="w-3 h-3 text-gray-500" />
                                )}
                             </div>
                        )}
                    </div>
                )}

                {/* EXPANDED: Location & Rating */}
                {isExpanded && (
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-md border border-white/5 max-w-fit">
                            {suggestion.color && <span className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: suggestion.color, color: suggestion.color }} />}
                            <span className="text-[10px] text-gray-300 font-bold uppercase break-all line-clamp-1">{suggestion.location}</span>
                         </div>
                         {renderRating(suggestion.rating, "w-2.5 h-2.5")}
                    </div>
                )}
            </div>
            
            {/* Close Button (Retracted) */}
            {!isExpanded && (
                <button onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }} className="p-2 text-gray-600 hover:text-white">
                    <XIcon className="w-4 h-4" />
                </button>
            )}
          </div>

          {/* 3. EXPANDED DETAILS (Below Header) */}
          {isExpanded && (
            <div className="px-3 pb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                
                {/* A. Data Grid (Match, BPM, Key, Time) */}
                <div className="grid grid-cols-4 gap-2">
                    {/* Match */}
                    <div className="bg-black/40 rounded border border-white/10 p-1.5 flex flex-col items-center">
                        <BrainIcon className={`w-3.5 h-3.5 mb-0.5 ${scoreColor}`} />
                        <span className={`text-sm font-black ${scoreColor}`}>{matchScoreDisplay}%</span>
                    </div>
                    {/* BPM */}
                    <div className={`rounded p-1.5 flex flex-col items-center ${isBpmMatch ? goldBorderClass : defaultBorderClass}`}>
                        <span className="text-[9px] text-gray-500 uppercase font-bold">BPM</span>
                        <span className={`text-sm font-mono font-black ${isBpmMatch ? 'text-yellow-400' : 'text-white'}`}>{suggestion.bpm}</span>
                    </div>
                    {/* Key */}
                    <div className={`rounded p-1.5 flex flex-col items-center ${isKeyMatch ? goldBorderClass : defaultBorderClass}`}>
                        <span className="text-[9px] text-gray-500 uppercase font-bold">Key</span>
                        <span className={`text-sm font-mono font-black ${isKeyMatch ? 'text-yellow-400' : suggestion.key.includes('m') ? 'text-cyan-400' : 'text-pink-400'}`}>{suggestion.key}</span>
                    </div>
                    {/* Time */}
                    <div className="bg-black/40 rounded border border-white/10 p-1.5 flex flex-col items-center">
                        <ClockIcon className="w-3.5 h-3.5 mb-0.5 text-gray-500" />
                        <span className="text-sm font-mono font-black text-gray-300">{suggestion.duration}</span>
                    </div>
                </div>

                {/* B. Reason */}
                <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <p className="text-[11px] text-gray-300 italic leading-relaxed text-center">
                        "{suggestion.reason}"
                    </p>
                </div>

                {/* C. Cues */}
                {suggestion.cuePoints && suggestion.cuePoints.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {suggestion.cuePoints.map((cue, idx) => (
                            <span key={idx} className="bg-slate-800 text-cyan-200 text-[9px] font-bold px-2 py-1 rounded border border-slate-700">
                                {cue}
                            </span>
                        ))}
                    </div>
                )}

                {/* D. Actions */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 pt-1">
                     <button 
                        onClick={(e) => { e.stopPropagation(); onSelect(suggestion); }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white h-10 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-95"
                     >
                        <PlayIcon className="w-4 h-4" /> Load
                     </button>
                     {onAddToQueue && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); onAddToQueue(suggestion); }}
                            className="bg-green-600 hover:bg-green-500 text-white w-12 h-10 rounded-lg flex items-center justify-center shadow-lg active:scale-95"
                         >
                            <PlusIcon className="w-5 h-5" />
                         </button>
                     )}
                     <button 
                        onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }}
                        className="bg-slate-800 text-gray-400 hover:text-red-400 w-10 h-10 rounded-lg border border-slate-700 flex items-center justify-center active:scale-95"
                     >
                        <XIcon className="w-4 h-4" />
                     </button>
                </div>
            </div>
          )}
        </div>
    </SwipeableItem>
  );
};
