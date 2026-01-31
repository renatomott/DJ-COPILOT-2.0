
import React, { useState } from 'react';
import type { Suggestion, Track } from '../types';
import { ClockIcon, PlayIcon, PlayIcon as PlayIconSolid, XIcon, PlusIcon, FolderIcon, ZapIcon, ActivityIcon, StarIcon } from './icons';
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
        className={`w-[0.7em] h-[0.7em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
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
  
  // Determine color for match score
  const scoreColor = suggestion.matchScore >= 90 ? 'text-green-400 border-green-500/30 bg-green-950/40' : 
                     suggestion.matchScore >= 75 ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40' : 'text-yellow-400 border-yellow-500/30 bg-yellow-950/40';

  // Dynamic Theme Color based on Folder/Genre Color
  const themeColor = suggestion.color || '#22d3ee'; // Default to cyan if no color

  // Match Style Helper: Gold Outline for matches, White text always
  const getBoxStyle = (isMatch: boolean) => {
      if (isMatch) {
          return `border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)] bg-yellow-500/5 text-white`;
      }
      return `border-white/10 bg-transparent text-slate-300`;
  };

  return (
    <div 
      className={`relative group bg-slate-900/40 border transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded ? 'rounded-2xl' : 'rounded-xl'}`}
      style={{ 
          borderColor: 'transparent',
          // Intense outer glow based on folder color
          boxShadow: `0 0 ${isExpanded ? '40px' : '20px'} ${themeColor}${isExpanded ? '66' : '33'}` 
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Top Section: Always visible summary (Row) */}
      <div className="flex p-3 gap-3 relative z-10">
        {/* Cover Art Section */}
        <div 
            className="relative w-16 h-16 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-transparent transition-colors"
        >
          <CoverArt 
            id={suggestion.id} 
            artist={suggestion.artist} 
            name={suggestion.name} 
            className="w-full h-full"
          />
          <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); onSelect(suggestion); }}
              className="text-white p-2 rounded-full transform hover:scale-110 transition-transform shadow-lg bg-blue-600 hover:bg-blue-500"
              title={t.loadDeck}
            >
              <PlayIcon className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-1">
          {/* Header: Title & Score */}
          <div className="flex justify-between items-start gap-3">
             <h4 className="font-black text-sm text-white leading-tight break-words transition-colors group-hover:text-cyan-100">
                {suggestion.name}
             </h4>
             {/* Score Badge */}
             <span className={`flex-shrink-0 text-xs font-black font-mono ${scoreColor} px-2 py-1 rounded-md border shadow-sm`}>
                {Math.round(suggestion.matchScore)}%
             </span>
          </div>
          
          <p className="text-xs font-bold text-slate-300 leading-tight break-words">{suggestion.artist}</p>

          {/* Row 3: Technical Stats (BPM, Key, Time) */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
             {/* BPM Box */}
             <div 
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${getBoxStyle(isBpmClose)}`} 
                title="BPM & Diff"
             >
                <ActivityIcon className={`w-3 h-3 ${isBpmClose ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span className="font-bold">{suggestion.bpm}</span>
                <span className={`ml-0.5 ${Math.abs(bpmDiff) > 5 ? 'text-red-400' : 'text-slate-500'} opacity-80`}>
                   ({bpmDiffFormatted})
                </span>
             </div>
             
             {/* Key Box */}
             <div 
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${getBoxStyle(isKeyMatch)}`}
                title="Key"
             >
                <span>
                   {suggestion.key}
                </span>
             </div>

             {/* Duration (White Text) */}
             <div className="flex items-center gap-1 ml-1">
                <ClockIcon className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-mono font-bold text-white">{suggestion.duration}</span>
             </div>
          </div>

           {/* Row 4: Folder & Rating (Visible in Collapsed) */}
           {!isExpanded && (
               <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5 max-w-[70%]">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: themeColor }} />
                        <FolderIcon className="w-3 h-3 flex-shrink-0 text-slate-500" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">{suggestion.location}</span>
                    </div>
                    {renderRating(suggestion.rating)}
               </div>
           )}
        </div>
      </div>
      
      {/* EXPANDABLE CONTENT - FULL WIDTH */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 fade-in duration-200 space-y-2 relative z-10">
            {/* Divider */}
            <div className="w-full h-px bg-white/5 mb-2"></div>
            
            {/* Extended Info Row: Folder, Plays, Rating */}
            <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: themeColor }} />
                    <FolderIcon className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{suggestion.location || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1" title="Plays">
                        <PlayIconSolid className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-mono font-bold text-slate-300">{suggestion.playCount}</span>
                    </div>
                    {renderRating(suggestion.rating)}
                </div>
            </div>

            {/* AI Cues */}
            {suggestion.cuePoints && suggestion.cuePoints.length > 0 ? (
                <div 
                    className="flex flex-col gap-1.5 mt-1 p-2 rounded-lg border"
                    style={{ backgroundColor: `${themeColor}08`, borderColor: `${themeColor}20` }}
                >
                    <div className="flex items-center gap-1">
                            <ZapIcon className="w-3 h-3 text-white" />
                            <span className="text-[9px] font-bold text-white uppercase tracking-widest">Sugestão de Cues</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestion.cuePoints.slice(0, 4).map((cue, idx) => (
                            <span 
                                key={idx} 
                                className="text-[10px] font-bold px-2 py-0.5 rounded border"
                                style={{ color: themeColor, borderColor: `${themeColor}40`, backgroundColor: `${themeColor}10` }}
                            >
                                {cue}
                            </span>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-1 mt-0.5 opacity-40 px-1">
                    <ZapIcon className="w-2.5 h-2.5 text-slate-600" />
                    <span className="text-[9px] text-slate-500 italic">Auto-Cues available</span>
                </div>
            )}
            
            {/* Footer: AI Reason */}
            <div className="bg-gradient-to-r from-gray-800/50 to-transparent p-2.5 rounded border-l-2 mt-1" style={{ borderLeftColor: themeColor }}>
                <p className="text-xs text-slate-200 italic leading-snug">
                    "{suggestion.reason}"
                </p>
            </div>
            
            {/* Action Buttons Footer */}
            <div className="flex gap-2 justify-end pt-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }}
                    className="flex-1 px-3 py-2 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-red-900/30 rounded-lg border border-white/5 hover:border-red-500/30 transition-all uppercase"
                >
                    DISPENSAR
                </button>
                {onAddToQueue && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddToQueue(suggestion); }}
                        className="flex-1 px-3 py-2 text-white text-[10px] font-bold rounded-lg border shadow-lg active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 bg-blue-600 border-blue-600 hover:bg-blue-500"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        ADD QUEUE
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
