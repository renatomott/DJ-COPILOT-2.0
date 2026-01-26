
import React, { useState } from 'react';
import type { Suggestion, Track } from '../types';
import { ChevronDownIcon, ClockIcon, PlayIcon, TagIcon, XIcon, PlaylistIcon, ActivityIcon, StarIcon, PlusIcon } from './icons';
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
        className={`w-[0.9em] h-[0.9em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
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
  const [isHovered, setIsHovered] = useState(false);
  const t = translations[language];

  // Calculate BPM difference for display
  const currentBpm = parseFloat(currentTrack.bpm);
  const suggestedBpm = parseFloat(suggestion.bpm);
  const bpmDiff = suggestedBpm - currentBpm;
  const bpmDiffFormatted = bpmDiff > 0 ? `+${bpmDiff.toFixed(1)}` : bpmDiff.toFixed(1);
  
  // Determine color for match score
  const scoreColor = suggestion.matchScore >= 90 ? 'text-green-400' : 
                     suggestion.matchScore >= 75 ? 'text-cyan-400' : 'text-yellow-400';

  return (
    <div 
      className="relative group bg-black/40 hover:bg-black/60 border border-gray-700/50 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex p-3 gap-3 relative z-10">
        {/* Cover Art Section */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-lg border border-white/10 group-hover:border-cyan-400/30 transition-colors">
          <CoverArt 
            id={suggestion.id} 
            artist={suggestion.artist} 
            name={suggestion.name} 
            className="w-full h-full"
          />
          <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={() => onSelect(suggestion)}
              className="bg-cyan-500 text-white p-2 rounded-full transform hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.6)]"
              title={t.loadDeck}
            >
              <PlayIcon className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-black text-lg text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">
                {suggestion.name}
              </h4>
              <span className={`text-xs font-black font-mono ${scoreColor} bg-black/50 px-1.5 py-0.5 rounded border border-white/5`}>
                {Math.round(suggestion.matchScore)}%
              </span>
            </div>
            <p className="text-sm font-bold text-gray-400 truncate">{suggestion.artist}</p>
          </div>

          <div className="flex items-center gap-2 mt-1">
             <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded text-xs font-mono text-gray-300 border border-white/5">
                <ActivityIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>{suggestion.bpm}</span>
                <span className={`ml-1 ${Math.abs(bpmDiff) > 5 ? 'text-red-400' : 'text-green-400'}`}>
                   ({bpmDiffFormatted})
                </span>
             </div>
             <div className="flex items-center gap-1 bg-gray-800/50 px-1.5 py-0.5 rounded text-xs font-mono font-bold text-gray-300 border border-white/5">
                <span className={suggestion.key === currentTrack.key ? 'text-cyan-400' : 'text-pink-400'}>
                   {suggestion.key}
                </span>
             </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
             {renderRating(suggestion.rating)}
             <span className="text-[11px] text-gray-600 font-bold uppercase tracking-wider truncate">
                {suggestion.genre}
             </span>
          </div>
        </div>

        {/* Actions Column */}
        <div className="flex flex-col justify-between items-end gap-2">
          <button 
            onClick={() => onDismiss(suggestion.id)}
            className="text-gray-600 hover:text-red-500 transition-colors p-1"
            title="Dismiss"
          >
            <XIcon className="w-4 h-4" />
          </button>
          
          {onAddToQueue && (
            <button 
              onClick={() => onAddToQueue(suggestion)}
              className="bg-gray-800 hover:bg-cyan-600 text-gray-400 hover:text-white p-1.5 rounded-lg border border-gray-700 transition-all"
              title="Add to Queue"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* AI Reason Footer */}
      <div className="bg-gradient-to-r from-gray-900/80 to-transparent px-3 py-1.5 border-t border-white/5">
          <p className="text-xs text-gray-400 italic flex items-center gap-1.5 truncate">
            <span className="text-cyan-500/80 font-bold not-italic text-[10px] uppercase tracking-wider">{t.whyMatch}</span> 
            {suggestion.reason}
          </p>
      </div>
    </div>
  );
};
