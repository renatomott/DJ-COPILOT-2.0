
import React, { useState } from 'react';
import type { Track } from '../types';
import { ClockIcon, PlayIcon, StarIcon, ImageIcon, ZapIcon, TagIcon, ChevronDownIcon, PlaylistIcon } from './icons';
import { generateVisuals } from '../services/geminiService';
import { CoverArt } from './CoverArt';

const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= rating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[1em] h-[1em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white opacity-20'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

interface NowPlayingProps {
  track: Track;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ track }) => {
  const [visual, setVisual] = useState<string | null>(track.visualUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerateVisual = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    const url = await generateVisuals(track);
    if (url) setVisual(url);
    setIsGenerating(false);
  }

  return (
    <div className="mb-6 bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden border border-gray-700 shadow-2xl relative">
      
      {visual && (
        <div className="absolute inset-0 z-0">
            <img src={visual} className="w-full h-full object-cover opacity-30 blur-xl" alt="Background" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>
      )}

      <div 
        className="relative z-10 p-4 sm:p-6 cursor-pointer active:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center w-full">
                <span className="text-xs font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                    On Deck
                </span>
                <div className="flex items-center gap-2">
                    <div className="bg-gray-800 text-white text-xs sm:text-sm font-mono font-black px-2 py-1 rounded-lg border border-gray-600 shadow-md">
                        {track.bpm} <span className="text-white opacity-70 text-[0.8em]">BPM</span>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>

            <div className="flex flex-row items-start gap-4">
                <div className="relative flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28">
                    <CoverArt 
                        id={track.id}
                        artist={track.artist}
                        name={track.name}
                        className="w-full h-full rounded-2xl shadow-xl border border-gray-600"
                        priority={true}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-black/90 backdrop-blur-md text-white text-[0.7rem] font-black px-1.5 py-0.5 rounded-md border border-gray-600 z-10">
                        {track.playCount}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1 break-words">
                        {track.name}
                    </h2>
                    <p className="text-white font-black text-sm sm:text-lg break-words">
                        {track.artist}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center justify-center gap-1.5 bg-gray-800/60 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    <span className="font-black text-blue-400">{track.key}</span>
                    <span className="text-[0.8em] text-white opacity-70 font-bold uppercase tracking-tighter">Tom</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 bg-gray-800/60 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    <ClockIcon className="w-3 h-3 text-white" />
                    <span className="font-mono font-bold text-white">{track.duration}</span>
                </div>
                <div className="flex items-center justify-center bg-gray-800/60 backdrop-blur-md p-2 rounded-xl border border-white/10">
                    {renderRating(track.rating)}
                </div>
                <div className="flex items-center justify-center gap-1.5 bg-gray-800/60 backdrop-blur-md p-2 rounded-xl border border-white/10 overflow-hidden">
                    <TagIcon className="w-3 h-3 text-white flex-shrink-0" />
                    <span className="truncate text-[0.8em] font-black uppercase text-white">{track.genre || 'N/A'}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/10 p-2 rounded-xl border border-white/10">
                <PlaylistIcon className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                {track.color && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                )}
                <span className="truncate">{track.location}</span>
            </div>
        </div>

        {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-700 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                    <p className="text-xs uppercase font-black text-blue-400 tracking-widest flex items-center gap-1.5">
                        <ZapIcon className="w-4 h-4" />
                        Hot Cues Estratégicos (Análise IA)
                    </p>
                    {!visual && (
                         <button 
                            onClick={handleGenerateVisual}
                            disabled={isGenerating}
                            className="text-xs font-black bg-white text-black px-2 py-1 rounded-md flex items-center gap-1"
                        >
                            {isGenerating ? '...' : <><ImageIcon className="w-3 h-3" /> Visual</>}
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(track.cuePoints || ['Intro', 'Break', 'Drop', 'Outro']).map((cp, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-2 py-2">
                            <span className="text-[0.7em] text-white opacity-60 font-black uppercase">Cue {i + 1}</span>
                            <span className="text-sm font-black text-white font-mono">{cp}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
