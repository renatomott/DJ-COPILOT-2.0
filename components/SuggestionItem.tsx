
import React, { useState } from 'react';
import type { Suggestion, Track } from '../types';
import { ChevronDownIcon, ClockIcon, PlayIcon, StarIcon, TagIcon, PlusIcon, XIcon, BarChartIcon, PlaylistIcon, ZapIcon } from './icons';
import { CoverArt } from './CoverArt';

// --- Helper Functions for Compatibility ---

const CAMELOT_MAP: { [key: string]: { compatible: string[] } } = {
  '1A': { compatible: ['1A', '2A', '12A', '1B'] }, '1B': { compatible: ['1B', '2B', '12B', '1A'] },
  '2A': { compatible: ['2A', '3A', '1A', '2B'] }, '2B': { compatible: ['2B', '3B', '1B', '2A'] },
  '3A': { compatible: ['3A', '4A', '2A', '3B'] }, '3B': { compatible: ['3B', '4B', '2B', '3A'] },
  '4A': { compatible: ['4A', '5A', '3A', '4B'] }, '4B': { compatible: ['4B', '5B', '3B', '4A'] },
  '5A': { compatible: ['5A', '6A', '4A', '5B'] }, '5B': { compatible: ['5B', '6B', '4B', '5A'] },
  '6A': { compatible: ['6A', '7A', '5A', '6B'] }, '6B': { compatible: ['6B', '7B', '5B', '6A'] },
  '7A': { compatible: ['7A', '8A', '6A', '7B'] }, '7B': { compatible: ['7B', '8B', '6B', '7A'] },
  '8A': { compatible: ['8A', '9A', '7A', '8B'] }, '8B': { compatible: ['8B', '9B', '7B', '8A'] },
  '9A': { compatible: ['9A', '10A', '8A', '9B'] }, '9B': { compatible: ['9B', '10B', '8B', '9A'] },
  '10A': { compatible: ['10A', '11A', '9A', '10B'] }, '10B': { compatible: ['10B', '11B', '9B', '10A'] },
  '11A': { compatible: ['11A', '12A', '10A', '11B'] }, '11B': { compatible: ['11B', '12B', '10B', '11A'] },
  '12A': { compatible: ['12A', '1A', '11A', '12B'] }, '12B': { compatible: ['12B', '1B', '11B', '12A'] },
};

const getKeyCompatibility = (key1: string, key2: string): 'high' | 'medium' => {
  if (key1 === key2) return 'high';
  if (CAMELOT_MAP[key1] && CAMELOT_MAP[key1].compatible.includes(key2)) return 'high';
  return 'medium';
};

const getBpmCompatibility = (bpm1Str: string, bpm2Str: string): 'high' | 'medium' => {
  const bpm1 = parseFloat(bpm1Str);
  const bpm2 = parseFloat(bpm2Str);
  if (isNaN(bpm1) || isNaN(bpm2)) return 'medium';
  const diff = Math.abs(bpm1 - bpm2);
  const avgBpm = (bpm1 + bpm2) / 2;
  if ((diff / avgBpm) <= 0.04) return 'high'; 
  return 'medium';
};

const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<StarIcon key={i} className={`w-3 h-3 ${i <= rating ? 'text-yellow-400' : 'text-gray-700'}`} filled={i <= rating} />);
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

interface SuggestionItemProps {
  suggestion: Suggestion;
  currentTrack: Track;
  onSelect: (track: Track) => void;
  onDismiss: (trackId: string) => void;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, currentTrack, onSelect, onDismiss }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const keyCompat = getKeyCompatibility(currentTrack.key, suggestion.key);
    const bpmCompat = getBpmCompatibility(currentTrack.bpm, suggestion.bpm);

    const keyColor = keyCompat === 'high' ? 'text-green-400 border-green-900/50 bg-green-900/20' : 'text-yellow-400 border-yellow-900/50 bg-yellow-900/20';
    const bpmColor = bpmCompat === 'high' ? 'text-green-400 border-green-900/50 bg-green-900/20' : 'text-yellow-400 border-yellow-900/50 bg-yellow-900/20';
    
    const bpmDiff = (parseFloat(suggestion.bpm) - parseFloat(currentTrack.bpm)).toFixed(2);
    
    // Normalize match score to 0-100 integer
    const matchScore = suggestion.matchScore <= 1 
        ? Math.round(suggestion.matchScore * 100) 
        : Math.round(suggestion.matchScore);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-4">
            {/* Collapsed View (Always Visible) */}
            <div 
                className="p-3 relative cursor-pointer active:bg-gray-800/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex gap-4">
                    {/* Album Art Container */}
                    <div className="relative flex-shrink-0 w-20 h-20">
                        <CoverArt 
                            id={suggestion.id}
                            artist={suggestion.artist}
                            name={suggestion.name}
                            className="w-full h-full rounded-lg shadow-md"
                            priority={true}
                        />
                        {/* Match Score Badge */}
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900 shadow-sm z-10">
                            {matchScore}%
                        </div>
                        {/* Play Count Badge */}
                        <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-tl-lg flex items-center gap-1 border-t border-l border-gray-700 z-10">
                            <PlayIcon className="w-2.5 h-2.5" />
                            {suggestion.playCount}
                        </div>
                    </div>

                    {/* Basic Info Column */}
                    <div className="flex-1 flex flex-col justify-between overflow-hidden py-0.5">
                        <div>
                            <h4 className="text-white font-bold text-sm leading-tight line-clamp-2 mb-0.5">{suggestion.name}</h4>
                            <p className="text-gray-400 text-xs font-medium truncate">{suggestion.artist}</p>
                        </div>

                        {/* Metadata Grid */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${bpmColor}`}>
                                <span className="text-xs font-mono font-bold">{suggestion.bpm}</span>
                            </div>
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${keyColor}`}>
                                <span className="text-xs font-mono font-bold">{suggestion.key}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">
                                <ClockIcon className="w-2.5 h-2.5" />
                                <span className="text-[10px] font-mono">{suggestion.duration}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Expand Icon */}
                    <div className="flex flex-col justify-between items-end">
                         <button 
                             onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }} 
                             className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                         >
                             <XIcon className="w-4 h-4" />
                         </button>
                         <ChevronDownIcon className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Playlist Location Row */}
                <div className="mt-2.5 flex items-center gap-2 text-gray-500 overflow-hidden bg-black/20 p-1 rounded-md">
                    <PlaylistIcon className="w-3 h-3 flex-shrink-0 ml-1" />
                    {suggestion.color && (
                        <span 
                            className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: suggestion.color }}
                        />
                    )}
                    <span className="text-[10px] truncate">{suggestion.location}</span>
                </div>
            </div>

            {/* Expanded View */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-800/50 bg-black/20 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-gray-800/40 p-2 rounded border border-gray-700/30 flex flex-col items-center justify-center">
                            <span className={`text-lg font-bold ${parseFloat(bpmDiff) > 5 ? 'text-red-400' : 'text-blue-400'}`}>
                                {parseFloat(bpmDiff) > 0 ? '+' : ''}{bpmDiff}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-500">Diff BPM</span>
                        </div>
                        <div className="bg-gray-800/40 p-2 rounded border border-gray-700/30 flex flex-col items-center justify-center text-center">
                            <span className="text-white text-xs font-bold line-clamp-1">{suggestion.subgenre || suggestion.genre || 'N/A'}</span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-500">Gênero</span>
                        </div>
                        <div className="bg-gray-800/40 p-2 rounded border border-gray-700/30 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1">
                                <ZapIcon className="w-3 h-3 text-yellow-500" />
                                <span className="text-white font-bold">{suggestion.energy || '?'}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-gray-500">Energia (1-5)</span>
                        </div>
                         <div className="bg-gray-800/40 p-2 rounded border border-gray-700/30 flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1">
                                <PlayIcon className="w-3 h-3 text-green-500" />
                                <span className="text-white font-bold">{suggestion.playCount}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-gray-500">Total Plays</span>
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                        <p className="text-xs text-blue-200 leading-relaxed">
                            <span className="font-bold text-blue-400 block mb-1 uppercase text-[9px] tracking-widest">Por que combina:</span>
                            {suggestion.reason}
                        </p>
                    </div>

                    <button 
                        onClick={() => onSelect(suggestion)}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                    >
                        <PlayIcon className="w-4 h-4 fill-current" />
                        Carregar no Deck
                    </button>
                </div>
            )}
        </div>
    );
};
