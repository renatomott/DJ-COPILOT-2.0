
import React, { useState, useMemo } from 'react';
import type { Track } from '../types';
import { ClockIcon, PlayIcon, StarIcon, ZapIcon, TagIcon, ActivityIcon, EyeIcon, EyeOffIcon, ChevronDownIcon } from './icons';
import { CoverArt } from './CoverArt';
import { translations } from '../utils/translations';
import { getGenreTheme } from '../utils/themeUtils';

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
}

interface NowPlayingProps {
  track: Track;
  language: 'pt-BR' | 'en-US';
  folderColor?: string;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ track, language, folderColor }) => {
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSpinning, setIsSpinning] = useState(true);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  const t = translations[language];
  const bpmValue = parseFloat(track.bpm) || 0;
  
  // Revised Theme Logic: Track Color > Folder Color > Genre/Key Theme
  const theme = useMemo(() => {
    const customColor = track.color || folderColor;
    
    if (customColor) {
        return {
            primary: 'custom',
            accent: customColor,
            gradientFrom: 'from-black', // Keep generic dark to let accent pop
            gradientTo: 'to-black',
            glow: `${customColor}66` // Hex + 40% opacity
        };
    }
    
    return getGenreTheme(track);
  }, [track, folderColor]);

  const spinDuration = bpmValue > 0 ? `${(60 / bpmValue) * 8}s` : '0s';

  const handleVinylClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion when clicking vinyl
    setIsSpinning(!isSpinning);
  };

  const handleCardClick = () => {
    setIsCardExpanded(!isCardExpanded);
  };

  // ZEN MODE LAYOUT
  if (isZenMode) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
              <button onClick={() => setIsZenMode(false)} className="absolute top-8 right-8 text-white/50 hover:text-white bg-white/10 p-3 rounded-full backdrop-blur-md">
                  <EyeOffIcon className="w-8 h-8" />
              </button>
              
              <style>{`
                @keyframes spin-vinyl { 100% { transform: rotate(360deg); } }
              `}</style>

              <div className="w-full max-w-md aspect-square relative mb-8">
                  {/* Ambilight Glow */}
                  <div 
                    className="absolute inset-0 rounded-full blur-[80px] opacity-40 animate-pulse"
                    style={{ backgroundColor: theme.accent }}
                  ></div>

                  <div 
                    className="w-full h-full rounded-full overflow-hidden shadow-2xl relative ring-4 ring-white/10 cursor-pointer"
                    onClick={handleVinylClick}
                    style={{ 
                        animation: `spin-vinyl ${spinDuration} linear infinite`,
                        animationPlayState: isSpinning ? 'running' : 'paused',
                    }}
                  >
                      <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full scale-110" priority={true} />
                      {/* Vinyl Center Hole */}
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 bg-black rounded-full border border-white/20"></div>
                      </div>
                  </div>
              </div>

              <div className="text-center space-y-4 relative z-20">
                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">{track.bpm}</h1>
                  <h2 className="text-3xl md:text-5xl font-mono font-bold" style={{ color: theme.accent }}>{track.key}</h2>
                  <div className="w-20 h-1 bg-white/20 mx-auto rounded-full"></div>
                  <p className="text-xl text-gray-400 font-bold truncate max-w-lg">{track.name}</p>
              </div>
          </div>
      );
  }

  // STANDARD LAYOUT (Card Style)
  return (
    <>
      <style>{`
        @keyframes bpm-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,255,255,0); }
            50% { transform: scale(1.05); box-shadow: 0 0 10px ${theme.glow}; }
        }
        @keyframes spin-vinyl { 100% { transform: rotate(360deg); } }
        .glass-panel {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
      
      <div className={`mb-6 relative group select-none`}>
        
        {/* Main Card Container */}
        <div 
            className={`relative rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-b ${theme.gradientFrom} via-[#0f172a] to-black shadow-2xl cursor-pointer transition-all duration-300 ${isCardExpanded ? 'ring-1 ring-white/20' : 'hover:ring-1 hover:ring-white/10'}`}
            onClick={handleCardClick}
        >
            
            {/* Ambient Glow Internal */}
            <div 
                className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] rounded-full blur-[90px] opacity-40 pointer-events-none"
                style={{ backgroundColor: theme.accent }}
            ></div>

            {/* Glowing Border Overlay */}
            <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none z-20"></div>
            <div 
                className="absolute inset-0 rounded-[2rem] border-2 opacity-30 pointer-events-none z-20"
                style={{ borderColor: theme.accent, boxShadow: `inset 0 0 20px ${theme.glow}` }}
            ></div>

            <div className="relative z-10 p-5 flex flex-col items-center">
                
                {/* Header Row */}
                <div className="w-full flex justify-between items-center mb-6">
                    {/* NO AR Badge - Updated Style to match BPM box (font-mono) */}
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <span className="text-white font-mono font-bold text-xs tracking-widest uppercase">{t.onAir}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsZenMode(true); }}
                            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                        >
                            <EyeIcon className="w-5 h-5" />
                        </button>
                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2">
                            <ActivityIcon className="w-3.5 h-3.5 text-white" />
                            <span className="text-white font-mono font-bold text-sm">{track.bpm}</span>
                        </div>
                    </div>
                </div>

                {/* Vinyl Art */}
                <div 
                    className="relative w-44 h-44 mb-8 cursor-pointer group/vinyl" 
                    onClick={handleVinylClick}
                >
                    <div className="absolute inset-0 rounded-full bg-black shadow-2xl opacity-60 scale-95 translate-y-2 blur-xl"></div>
                    <div 
                        className="w-full h-full rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] relative ring-1 ring-white/10 group-hover/vinyl:scale-[1.02] transition-transform duration-700"
                        style={{ 
                            animation: `spin-vinyl ${spinDuration} linear infinite`,
                            animationPlayState: isSpinning ? 'running' : 'paused',
                            boxShadow: `0 0 40px ${theme.glow}`
                        }}
                    >
                        <CoverArt 
                            id={track.id} 
                            artist={track.artist} 
                            name={track.name} 
                            className="w-full h-full scale-110" 
                            priority={true} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-black rounded-full border border-white/20 z-10"></div>
                            <div className="absolute inset-0 rounded-full border-[10px] border-black/10"></div>
                        </div>
                    </div>
                    
                    {/* Pause Icon Overlay - Explicit Click Handler for reliability */}
                    {!isSpinning && (
                        <div 
                            className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-200 cursor-pointer"
                            onClick={handleVinylClick}
                        >
                            <div className="bg-black/60 backdrop-blur-sm p-4 rounded-full border border-white/20 shadow-xl hover:scale-110 transition-transform">
                                <PlayIcon className="w-8 h-8 text-white fill-current" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Track Info - Ultra High Contrast with Tint */}
                <div className="text-center w-full mb-8 px-2">
                    <h2 
                        className="text-3xl font-black text-white mb-2 tracking-tight leading-none line-clamp-2"
                        style={{ textShadow: `0 2px 10px rgba(0,0,0,0.5)` }}
                    >
                        {track.name}
                    </h2>
                    <p 
                        className="text-lg font-bold tracking-wide uppercase truncate text-white" 
                        style={{ 
                            textShadow: `0 0 15px ${theme.accent}`, // Colored glow tint around pure white text
                            opacity: 1
                        }}
                    >
                        {track.artist}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 w-full mb-4">
                    <div className="glass-panel rounded-xl py-2 px-1 flex flex-col items-center justify-center min-h-[55px]">
                        <span className="text-sm font-black text-white font-mono">{track.key}</span>
                    </div>
                    <div className="glass-panel rounded-xl py-2 px-1 flex flex-col items-center justify-center min-h-[55px]">
                        <div className="flex items-center gap-1 text-slate-300">
                            <ClockIcon className="w-3 h-3" />
                            <span className="text-xs font-bold font-mono text-white">{track.duration}</span>
                        </div>
                    </div>
                    <div className="glass-panel rounded-xl py-2 px-1 flex flex-col items-center justify-center min-h-[55px]">
                        {renderRating(track.rating)}
                    </div>
                    <div className="glass-panel rounded-xl py-2 px-1 flex flex-col items-center justify-center min-h-[55px]">
                        <div className="flex items-center gap-1 overflow-hidden max-w-full px-1">
                            <TagIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="text-[9px] font-bold uppercase text-slate-200 truncate">{track.genre?.split(' ')[0] || 'GENRE'}</span>
                        </div>
                    </div>
                </div>

                {/* EXPANDABLE SECTION: Cue Analysis (Completely Hidden by Default) */}
                {isCardExpanded ? (
                    <div className="w-full animate-in slide-in-from-top-2 fade-in duration-300 border-t border-white/10 pt-4 mt-2">
                        <div className="flex items-center gap-2 mb-3 px-1">
                             <ZapIcon className="w-4 h-4 text-[#f59e0b]" />
                             <span className="text-xs font-black uppercase tracking-[0.15em] text-white">
                                {t.cueAnalysis}
                             </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {(track.cuePoints && track.cuePoints.length > 0 ? track.cuePoints : ['00:30.000 (Intro)', '02:15.000 (Drop)', '04:45.000 (Break)', '05:30.000 (Outro)']).slice(0, 6).map((cue, i) => {
                                const timeMatch = cue.match(/(\d{1,2}:\d{2}(\.\d{3})?)/);
                                const displayTime = timeMatch ? timeMatch[0] : cue;
                                const label = cue.replace(displayTime, '').replace(/[:()]/g, '').trim() || `CUE ${i+1}`;

                                return (
                                    <div key={i} className="bg-black/40 border border-white/10 rounded-lg p-2.5 flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label.substring(0, 8)}</span>
                                        <span className="text-xs font-mono font-bold text-cyan-100 tracking-wide">{displayTime}</span>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Collapse Button (Visual only, whole card clicks) */}
                        <div className="w-full flex justify-center mt-4 text-white/20">
                            <ChevronDownIcon className="w-5 h-5 rotate-180" />
                        </div>
                    </div>
                ) : (
                    /* Collapsed State Indicator */
                    <div className="w-full flex justify-center mt-1 animate-pulse opacity-50">
                        <ChevronDownIcon className="w-6 h-6 text-white" />
                    </div>
                )}

            </div>
        </div>
      </div>
    </>
  );
};
