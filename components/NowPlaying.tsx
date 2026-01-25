
import React, { useState } from 'react';
import type { Track } from '../types';
import { ClockIcon, PlayIcon, StarIcon, ImageIcon, ZapIcon, TagIcon, ChevronDownIcon, PlaylistIcon, ActivityIcon } from './icons';
import { generateVisuals } from '../services/geminiService';
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
        className={`w-[1em] h-[1em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

interface NowPlayingProps {
  track: Track;
  language: 'pt-BR' | 'en-US';
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ track, language }) => {
  const [visual, setVisual] = useState<string | null>(track.visualUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const t = translations[language];

  const handleGenerateVisual = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    const url = await generateVisuals(track);
    if (url) setVisual(url);
    setIsGenerating(false);
  }

  // Calculate beat duration for pulsing effect (60 seconds / BPM)
  const bpmValue = parseFloat(track.bpm) || 0;
  const animationDuration = bpmValue > 0 ? `${60 / bpmValue}s` : '0s';

  return (
    <>
      <style>{`
        @keyframes bpm-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
            50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(255,255,255,0.1); }
        }
      `}</style>
      <div className="mb-2 sm:mb-6 bg-gradient-to-b from-[#0a0a0a] to-black rounded-3xl overflow-hidden border border-cyan-500/50 shadow-[0_10px_40px_-10px_rgba(6,182,212,0.4)] relative transition-all duration-300 ring-2 ring-cyan-500/20">
        
        {visual && (
          <div className="absolute inset-0 z-0">
              <img src={visual} className="w-full h-full object-cover opacity-30 blur-xl scale-110" alt="Background" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
          </div>
        )}

        <div 
          className="relative z-10 p-4 sm:p-8 cursor-pointer active:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col gap-4 sm:gap-6">
              {/* HEADER: On Air & BPM */}
              <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] bg-cyan-950/40 px-2 sm:px-3 py-1.5 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      {t.onAir}
                  </span>
                  <div className="flex items-center gap-3">
                      <div 
                        className="bg-gray-900/80 backdrop-blur text-white text-xs sm:text-sm font-mono font-black px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg flex items-center gap-2"
                        style={{ 
                            animation: bpmValue > 0 ? `bpm-pulse ${animationDuration} ease-in-out infinite` : 'none',
                            willChange: 'transform' 
                        }}
                      >
                          <ActivityIcon className="w-3.5 h-3.5 text-green-400" />
                          <span>{track.bpm}</span>
                      </div>
                      <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
              </div>

              {/* MAIN CONTENT: Cover & Text */}
              <div className="flex flex-row items-center gap-4 sm:gap-6">
                  <div className="relative flex-shrink-0 w-20 h-20 sm:w-32 sm:h-32 group perspective-1000">
                      <CoverArt 
                          id={track.id}
                          artist={track.artist}
                          name={track.name}
                          className="w-full h-full rounded-xl sm:rounded-2xl shadow-2xl border border-gray-700/50 transform transition-transform duration-500 group-hover:rotate-y-12"
                          priority={true}
                      />
                      <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-black/90 backdrop-blur-md text-white text-[0.6rem] sm:text-[0.7rem] font-black px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg border border-gray-700 z-10 shadow-lg">
                          PLAY {track.playCount}
                      </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h2 className="text-xl sm:text-4xl font-black text-white leading-[1.1] mb-1 sm:mb-2 break-words tracking-tight">
                          {track.name}
                      </h2>
                      <p className="text-gray-300 font-bold text-base sm:text-xl break-words opacity-90">
                          {track.artist}
                      </p>
                  </div>
              </div>

              {/* INFO BADGES */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-xs">
                  <div className="flex items-center justify-center gap-1 bg-gray-900/40 backdrop-blur-md p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-white/5">
                      <span className={`font-black text-xs sm:text-sm ${track.key && track.key.includes('m') ? 'text-cyan-400' : 'text-pink-400'}`}>{track.key}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 bg-gray-900/40 backdrop-blur-md p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-white/5">
                      <ClockIcon className="w-3 h-3 text-gray-400" />
                      <span className="font-mono font-bold text-white text-xs sm:text-sm">{track.duration}</span>
                  </div>
                  <div className="flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-white/5">
                      {renderRating(track.rating)}
                  </div>
                  <div className="flex items-center justify-center gap-1 bg-gray-900/40 backdrop-blur-md p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-white/5 overflow-hidden">
                      <TagIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate text-[0.6rem] sm:text-[0.7em] font-black uppercase text-gray-300">{track.genre || 'N/A'}</span>
                  </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <PlaylistIcon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
                  {track.color && (
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/20" style={{ backgroundColor: track.color }} />
                  )}
                  <span className="truncate tracking-wide">{track.location}</span>
              </div>
          </div>

          {/* EXPANDED SECTION (Optimized for Mobile) */}
          {isExpanded && (
              <div className="mt-4 pt-3 border-t border-gray-800 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-3">
                      <p className="text-[9px] uppercase font-black text-cyan-400 tracking-[0.2em] flex items-center gap-1.5">
                          <ZapIcon className="w-3 h-3" />
                          {t.cueAnalysis}
                      </p>
                      {!visual && (
                           <button 
                              onClick={handleGenerateVisual}
                              disabled={isGenerating}
                              className="text-[9px] font-black bg-white/10 hover:bg-white/20 text-white px-2 py-2 rounded border border-white/10 flex items-center gap-1.5 transition-colors min-h-[30px]"
                          >
                              {isGenerating ? t.creating : <><ImageIcon className="w-3 h-3" /> {t.genArt}</>}
                          </button>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {(track.cuePoints || ['Intro', 'Break', 'Drop', 'Outro']).map((cp, i) => (
                          <div key={i} className="flex items-center justify-between bg-black/40 border border-white/5 rounded px-3 py-2 hover:border-cyan-500/30 transition-colors group">
                              <span className="text-[0.6em] text-gray-500 group-hover:text-cyan-400 font-black uppercase tracking-wider transition-colors">Cue {i + 1}</span>
                              <span className="text-xs font-black text-white font-mono tracking-wide">{cp}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </div>
      </div>
    </>
  );
};
