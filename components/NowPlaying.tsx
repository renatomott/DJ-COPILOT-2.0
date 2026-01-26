
import React, { useState } from 'react';
import type { Track } from '../types';
import { ClockIcon, PlayIcon, StarIcon, ImageIcon, ZapIcon, TagIcon, ChevronDownIcon, PlaylistIcon, ActivityIcon, EyeIcon, EyeOffIcon } from './icons';
import { generateVisuals } from '../services/geminiService';
import { CoverArt } from './CoverArt';
import { translations } from '../utils/translations';
import { AudioVisualizer } from './AudioVisualizer';

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
  const [isZenMode, setIsZenMode] = useState(false);

  const t = translations[language];
  const bpmValue = parseFloat(track.bpm) || 0;

  const handleGenerateVisual = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    const url = await generateVisuals(track);
    if (url) setVisual(url);
    setIsGenerating(false);
  }

  // ZEN MODE LAYOUT
  if (isZenMode) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
              <button onClick={() => setIsZenMode(false)} className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md">
                  <EyeOffIcon className="w-8 h-8" />
              </button>
              
              <div className="w-full max-w-md aspect-square rounded-3xl overflow-hidden shadow-2xl relative mb-8 ring-4 ring-cyan-500/20">
                  <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full" priority={true} />
                  <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-24">
                       <AudioVisualizer bpm={bpmValue} isZen={true} />
                  </div>
              </div>

              <div className="text-center space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">{track.bpm}</h1>
                  <h2 className="text-3xl md:text-5xl font-mono font-bold text-cyan-400">{track.key}</h2>
                  <div className="w-20 h-1 bg-white/20 mx-auto rounded-full"></div>
                  <p className="text-xl text-gray-400 font-bold truncate max-w-lg">{track.name}</p>
              </div>
          </div>
      );
  }

  // STANDARD LAYOUT
  return (
    <>
      <style>{`
        @keyframes bpm-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
            50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(255,255,255,0.1); }
        }
      `}</style>
      <div className="mb-2 sm:mb-6 bg-gradient-to-b from-[#0a0a0a] to-black rounded-3xl overflow-hidden border border-cyan-500/50 shadow-[0_10px_40px_-10px_rgba(6,182,212,0.4)] relative transition-all duration-300 ring-2 ring-cyan-500/20 group">
        
        {visual && (
          <div className="absolute inset-0 z-0">
              <img src={visual} className="w-full h-full object-cover opacity-30 blur-xl scale-110" alt="Background" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
          </div>
        )}
        
        {/* Visualizer Background */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20 pointer-events-none z-0">
            <AudioVisualizer bpm={bpmValue} />
        </div>

        <div 
          className="relative z-10 p-4 sm:p-8 cursor-pointer active:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col gap-4 sm:gap-6">
              {/* HEADER: On Air & Zen Toggle */}
              <div className="flex justify-between items-center w-full">
                  <span className="text-[9px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] bg-cyan-950/40 px-2 sm:px-3 py-1.5 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      {t.onAir}
                  </span>
                  <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsZenMode(true); }}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                        title="Zen Mode"
                      >
                          <EyeIcon className="w-5 h-5" />
                      </button>
                      <div 
                        className="bg-gray-900/80 backdrop-blur text-white text-xs sm:text-sm font-mono font-bold px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg flex items-center gap-2"
                        style={{ 
                            animation: bpmValue > 0 ? `bpm-pulse ${60/bpmValue}s ease-in-out infinite` : 'none',
                            willChange: 'transform' 
                        }}
                      >
                          <ActivityIcon className="w-3.5 h-3.5 text-green-400" />
                          <span>{track.bpm}</span>
                      </div>
                  </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 sm:gap-6 items-center">
                  <div className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 group perspective-1000 mx-auto sm:mx-0 view-transition-cover">
                      <CoverArt 
                          id={track.id}
                          artist={track.artist}
                          name={track.name}
                          className="w-full h-full rounded-xl sm:rounded-2xl shadow-2xl border border-gray-700/50 transform transition-transform duration-500 group-hover:rotate-y-12"
                          priority={true}
                      />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center text-center sm:text-left">
                      <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-white leading-[1.1] mb-1 sm:mb-2 break-words tracking-tight">
                          {track.name}
                      </h2>
                      <p className="text-gray-300 font-bold text-base sm:text-lg md:text-xl break-words opacity-90">
                          {track.artist}
                      </p>
                  </div>
              </div>

              {/* INFO BADGES */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs">
                  <div className="flex items-center justify-center gap-1 bg-gray-900/40 backdrop-blur-md p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-white/5">
                      <span className={`font-bold text-xs sm:text-sm ${track.key && track.key.includes('m') ? 'text-cyan-400' : 'text-pink-400'}`}>{track.key}</span>
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
                      <span className="truncate text-[0.6rem] sm:text-[0.7em] font-bold uppercase text-gray-300">{track.genre || 'N/A'}</span>
                  </div>
              </div>
          </div>

          {/* EXPANDED SECTION */}
          {isExpanded && (
              <div className="mt-4 pt-3 border-t border-gray-800 animate-in slide-in-from-top-2 relative z-20">
                  <div className="flex justify-between items-center mb-3">
                      <p className="text-[9px] uppercase font-bold text-cyan-400 tracking-[0.2em] flex items-center gap-1.5">
                          <ZapIcon className="w-3 h-3" />
                          {t.cueAnalysis}
                      </p>
                      {!visual && (
                           <button 
                              onClick={handleGenerateVisual}
                              disabled={isGenerating}
                              className="text-[9px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-2 rounded border border-white/10 flex items-center gap-1.5 transition-colors min-h-[30px]"
                          >
                              {isGenerating ? t.creating : <><ImageIcon className="w-3 h-3" /> {t.genArt}</>}
                          </button>
                      )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(track.cuePoints || ['Intro', 'Break', 'Drop', 'Outro']).map((cp, i) => (
                          <div key={i} className="flex items-center justify-between bg-black/40 border border-white/5 rounded px-3 py-2 hover:border-cyan-500/30 transition-colors group">
                              <span className="text-[0.6em] text-gray-500 group-hover:text-cyan-400 font-bold uppercase tracking-wider transition-colors">Cue {i + 1}</span>
                              <span className="text-xs font-bold text-white font-mono tracking-wide">{cp}</span>
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
