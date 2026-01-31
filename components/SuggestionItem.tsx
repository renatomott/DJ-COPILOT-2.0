
import React, { useState } from 'react';
import type { Suggestion, Track } from '../types';
import { ChevronDownIcon, ClockIcon, PlayIcon, TagIcon, XIcon, PlaylistIcon, ActivityIcon, StarIcon, PlusIcon, FolderIcon, ZapIcon } from './icons';
import { CoverArt } from './CoverArt';
import { translations } from '../utils/translations';

const renderRating = (rating: number) => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[0.8em] h-[0.8em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

// Helper for golden highlight style
const getMatchStyle = (isMatch: boolean, defaultClasses: string) => {
  if (isMatch) {
    return "border-yellow-500/80 bg-yellow-500/10 text-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.2)]";
  }
  return defaultClasses;
};

interface SuggestionItemProps {
  suggestion: Suggestion;
  currentTrack: Track;
  onSelect: (track: Track) => void;
  onDismiss: (trackId: string) => void;
  onAddToQueue?: (track: Track) => void;
  language: 'pt-BR' | 'en-US';
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, currentTrack, onSelect, onDismiss, onAddToQueue, language }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const t = translations[language];

  // Calculate BPM difference
  const currentBpm = parseFloat(currentTrack.bpm);
  const suggestedBpm = parseFloat(suggestion.bpm);
  const bpmDiff = suggestedBpm - currentBpm;
  const bpmDiffFormatted = bpmDiff > 0 ? `+${bpmDiff.toFixed(1)}` : bpmDiff.toFixed(1);
  
  // Match Logic
  const isBpmClose = Math.abs(bpmDiff) <= 1.5; // Consider "match" if within 1.5 BPM
  const isKeyMatch = suggestion.key === currentTrack.key;
  const isFolderMatch = suggestion.location === currentTrack.location;
  
  // Determine color for match score
  const scoreColor = suggestion.matchScore >= 90 ? 'text-green-400' : 
                     suggestion.matchScore >= 75 ? 'text-cyan-400' : 'text-yellow-400';

  return (
    <div 
      className={`relative group bg-slate-900/90 border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${isExpanded ? 'bg-black/95 border-cyan-500/50 shadow-lg' : 'hover:bg-black/90 border-slate-700/50 hover:border-slate-500'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex p-3 gap-3 relative z-10">
        {/* Cover Art Section */}
        <div className="relative w-16 h-16 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:border-cyan-400/30 transition-colors">
          <CoverArt 
            id={suggestion.id} 
            artist={suggestion.artist} 
            name={suggestion.name} 
            className="w-full h-full"
          />
          <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); onSelect(suggestion); }}
              className="bg-cyan-500 text-white p-2 rounded-full transform hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.6)]"
              title={t.loadDeck}
            >
              <PlayIcon className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Info Section - Always Visible */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-1">
          {/* Header: Title & Score */}
          <div>
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-black text-sm text-white truncate leading-tight group-hover:text-cyan-400 transition-colors pr-6 drop-shadow-sm">
                {suggestion.name}
              </h4>
              <span className={`absolute top-3 right-3 text-[10px] font-black font-mono ${scoreColor} bg-black/80 px-1.5 py-0.5 rounded border border-white/10`}>
                {Math.round(suggestion.matchScore)}%
              </span>
            </div>
            <p className="text-xs font-bold text-slate-200 truncate">{suggestion.artist}</p>
          </div>

          {/* Row 1: Technical Stats (BPM, Key) - Always Visible */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
             {/* BPM Box */}
             <div 
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${getMatchStyle(isBpmClose, 'bg-gray-800/50 border-white/10 text-slate-200')}`} 
                title="BPM & Diff"
             >
                <ActivityIcon className={`w-3 h-3 ${isBpmClose ? 'text-yellow-400' : 'text-slate-400'}`} />
                <span className="font-bold">{suggestion.bpm}</span>
                <span className={`ml-0.5 ${isBpmClose ? 'text-yellow-200/70' : (Math.abs(bpmDiff) > 5 ? 'text-red-400' : 'text-green-400')}`}>
                   ({bpmDiffFormatted})
                </span>
             </div>
             
             {/* Key Box */}
             <div 
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${getMatchStyle(isKeyMatch, 'bg-gray-800/50 border-white/10')}`}
                title="Key"
             >
                <span className={isKeyMatch ? 'text-yellow-300' : (suggestion.key === currentTrack.key ? 'text-cyan-400' : 'text-pink-400')}>
                   {suggestion.key}
                </span>
             </div>
             
             {/* Expanded Chevron Indicator */}
             {!isExpanded && (
               <ChevronDownIcon className="w-4 h-4 text-slate-500 animate-pulse ml-auto" />
             )}
          </div>
          
          {/* EXPANDABLE CONTENT */}
          {isExpanded && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-2 mt-2 pt-2 border-t border-white/10">
                
                {/* Row 2: Duration, Plays, Rating */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200 border border-white/10">
                        <ClockIcon className="w-3 h-3 text-slate-400" />
                        <span>{suggestion.duration}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200 border border-white/10">
                        <PlayIcon className="w-2.5 h-2.5 text-slate-400" />
                        <span>{suggestion.playCount}</span>
                    </div>
                    {renderRating(suggestion.rating)}
                </div>

                {/* Row 3: Context (Location/Color) */}
                <div 
                    className={`flex items-center gap-1.5 min-w-0 px-1.5 py-1 rounded border transition-all w-fit ${getMatchStyle(isFolderMatch, 'border-transparent bg-gray-800/30')}`} 
                >
                    <FolderIcon className={`w-3 h-3 flex-shrink-0 ${isFolderMatch ? 'text-yellow-400' : 'text-slate-500'}`} />
                    {suggestion.color && (
                        <span 
                            className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white/10" 
                            style={{ backgroundColor: suggestion.color }} 
                        />
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${isFolderMatch ? 'text-yellow-200' : 'text-slate-400'}`}>
                        {suggestion.location || 'N/A'}
                    </span>
                </div>

                {/* Row 4: Hot Cues */}
                {suggestion.cuePoints && suggestion.cuePoints.length > 0 ? (
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-1">
                             <ZapIcon className="w-3 h-3 text-cyan-500" />
                             <span className="text-[9px] font-bold text-slate-300 uppercase">Sugestão de Cues</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {suggestion.cuePoints.slice(0, 4).map((cue, idx) => (
                                <span key={idx} className="text-[9px] font-bold text-cyan-200 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                    {cue}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 mt-0.5 opacity-40">
                        <ZapIcon className="w-2.5 h-2.5 text-slate-600" />
                        <span className="text-[8px] text-slate-500 italic">Auto-Cues available</span>
                    </div>
                )}
                
                {/* Footer: AI Reason */}
                <div className="bg-gradient-to-r from-cyan-950/20 to-transparent p-2 rounded border-l-2 border-cyan-500/50 mt-1">
                    <p className="text-xs text-cyan-100/90 italic leading-snug">
                        "{suggestion.reason}"
                    </p>
                </div>
                
                {/* Action Buttons Footer */}
                <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-white/5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }}
                        className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-red-900/30 rounded border border-transparent hover:border-red-500/30 transition-all uppercase"
                    >
                        Dispensar
                    </button>
                    {onAddToQueue && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAddToQueue(suggestion); }}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded border border-cyan-400 shadow-lg active:scale-95 transition-all uppercase flex items-center gap-1"
                        >
                            <PlusIcon className="w-3 h-3" />
                            Add Queue
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
