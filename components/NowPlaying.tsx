
import React, { useState, useMemo } from 'react';
import type { Track } from '../types';
import { ClockIcon, PlayIcon, StarIcon, ZapIcon, ActivityIcon, FolderIcon } from './icons';
import { CoverArt } from './CoverArt';
import { EnergyBar } from './EnergyBar';
import { translations } from '../utils/translations';
import { getGenreTheme } from '../utils/themeUtils';

const renderRating = (rating: number, sizeClass = "w-[0.7em] h-[0.7em]") => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`${sizeClass} ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
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
  const [isSpinning, setIsSpinning] = useState(true);
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  const t = translations[language];
  const bpmValue = parseFloat(track.bpm) || 0;
  
  const theme = useMemo(() => {
    const customColor = track.color || folderColor;
    if (customColor) {
        return {
            primary: 'custom',
            accent: customColor,
            gradientFrom: 'from-black',
            gradientTo: 'to-black',
            glow: `${customColor}` // Full hex for stronger glow opacity calc
        };
    }
    return getGenreTheme(track);
  }, [track, folderColor]);

  const spinDuration = bpmValue > 0 ? `${(60 / bpmValue) * 8}s` : '0s';

  const handleVinylClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsSpinning(!isSpinning);
  };

  const handleCardClick = () => {
    setIsCardExpanded(!isCardExpanded);
  };

  // COMPACT & EXPANDED CARD
  return (
    <>
      <style>{`
        @keyframes spin-vinyl { 100% { transform: rotate(360deg); } }
        .glass-panel { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <div className={`mb-4 relative group select-none transition-all duration-300 ease-in-out`}>
        <div 
            className={`relative overflow-hidden bg-gradient-to-r ${theme.gradientFrom} via-[#0f172a] to-black cursor-pointer transition-all duration-300 border`}
            style={{ 
                borderColor: 'transparent', // Requested: Transparent outline
                // Requested: Increased glow
                boxShadow: `0 0 60px ${theme.accent}66`, 
                borderRadius: isCardExpanded ? '1.5rem' : '1rem'
            }}
            onClick={handleCardClick}
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[60%] h-full blur-[80px] opacity-30 pointer-events-none" style={{ backgroundColor: theme.accent }}></div>

            {/* EXPANDED STATE */}
            {isCardExpanded ? (
                <div className="p-4 relative z-10 flex flex-col gap-2 items-center">
                    
                    {/* 1. TOP SECTION: Vinyl + BPM/Key Badges */}
                    <div className="flex w-full items-center justify-between gap-4">
                        {/* BPM Badge (Left) */}
                        <div className="flex flex-col items-center justify-center gap-0.5 min-w-[50px]">
                            <span className="text-xl font-black font-mono text-white tracking-tighter leading-none shadow-black drop-shadow-md">{track.bpm}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BPM</span>
                        </div>

                         {/* Vinyl (Center) */}
                         <div 
                            className="w-28 h-28 relative rounded-full ring-2 shadow-2xl flex-shrink-0"
                            style={{ ringColor: theme.accent, boxShadow: `0 0 25px ${theme.accent}40` }}
                            onClick={handleVinylClick}
                        >
                             <div 
                                className="w-full h-full rounded-full overflow-hidden"
                                style={{ 
                                    animation: `spin-vinyl ${spinDuration} linear infinite`,
                                    animationPlayState: isSpinning ? 'running' : 'paused',
                                }}
                            >
                                <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full scale-110" priority={true} />
                                <div className="absolute inset-0 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-black rounded-full border border-white/20 z-10"></div></div>
                            </div>
                            {!isSpinning && <div className="absolute inset-0 flex items-center justify-center z-20"><PlayIcon className="w-10 h-10 text-white drop-shadow-md" /></div>}
                        </div>

                        {/* Key Badge (Right) */}
                        <div className="flex flex-col items-center justify-center gap-0.5 min-w-[50px]">
                            <span className="text-xl font-black font-mono leading-none drop-shadow-md" style={{ color: theme.accent }}>{track.key}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KEY</span>
                        </div>
                    </div>

                    {/* 2. TITLE & ARTIST */}
                    <div className="text-center w-full px-2">
                        <h2 className="text-lg font-black text-white leading-tight mb-0.5 break-words line-clamp-2 drop-shadow-lg">{track.name}</h2>
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wide truncate">{track.artist}</p>
                    </div>
                         
                    {/* 3. INFO DASHBOARD (Compact Grid) */}
                    <div className="w-full bg-black/30 rounded-xl p-2.5 space-y-2 mt-1 border border-white/5 shadow-inner">
                        
                        {/* Row 1: Time | Plays | Rating */}
                        <div className="grid grid-cols-3 gap-2 items-center divide-x divide-white/10 text-xs">
                             <div className="flex flex-col items-center justify-center gap-0.5">
                                 <ClockIcon className="w-3 h-3 text-slate-500" />
                                 <span className="font-mono font-bold text-white">{track.duration}</span>
                             </div>
                             <div className="flex flex-col items-center justify-center gap-0.5">
                                 <PlayIcon className="w-3 h-3 text-slate-500" />
                                 <span className="font-mono font-bold text-white">{track.playCount}</span>
                             </div>
                             <div className="flex flex-col items-center justify-center gap-0.5">
                                <span className="text-[8px] font-bold text-slate-500 uppercase">RATING</span>
                                {renderRating(track.rating, "w-2.5 h-2.5")}
                             </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-white/5"></div>

                        {/* Row 2: Folder & Energy (Hybrid Row) */}
                        <div className="flex items-center justify-between gap-3">
                             {/* Folder (Left - Flexible) */}
                             <div className="flex items-center gap-2 min-w-0 flex-1">
                                 <FolderIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.accent }} />
                                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate">{track.location}</span>
                             </div>

                             {/* Energy (Right - Fixed) */}
                             <div className="flex items-center gap-2 pl-3 border-l border-white/5">
                                 <ZapIcon className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                                 <div className="w-12">
                                    <EnergyBar energy={track.energy || 0} className="h-2" />
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* 4. CUES (Horizontal Scroll) */}
                    {track.cuePoints && track.cuePoints.length > 0 && (
                    <div className="w-full flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1 mask-linear-fade">
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-70 px-1">
                            <ActivityIcon className="w-3 h-3 text-cyan-500" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cues</span>
                        </div>
                        {track.cuePoints.map((cue, i) => {
                            const label = cue.replace(/(\d{1,2}:\d{2}(\.\d{3})?)/, '').replace(/[:()]/g, '').trim() || cue;
                            return (
                                <span key={i} className="text-[9px] font-bold text-cyan-100 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/20 whitespace-nowrap shadow-sm">
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                    )}
                </div>
            ) : (
                /* COLLAPSED STATE */
                <div className="min-h-[5.5rem] flex items-center px-3 py-2 gap-3">
                    {/* Vinyl (Smaller) */}
                    <div 
                        className="h-14 w-14 flex-shrink-0 rounded-full overflow-hidden relative shadow-md self-center"
                        style={{ boxShadow: `0 0 10px ${theme.accent}40` }}
                    >
                         <div className="w-full h-full animate-[spin-vinyl_4s_linear_infinite]">
                             <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full scale-125" priority={true} />
                         </div>
                         <div className="absolute inset-0 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-black rounded-full border border-white/30"></div></div>
                    </div>

                    {/* Center Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 py-1">
                        <h3 className="text-sm font-black text-white leading-tight drop-shadow-sm break-words">{track.name}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase leading-tight break-words">{track.artist}</p>
                    </div>

                    {/* Right Info Stack */}
                    <div className="flex flex-col items-end justify-center gap-1.5 min-w-[80px] flex-shrink-0 border-l border-white/5 pl-3 my-1">
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-mono font-bold text-slate-200">{track.bpm}</span>
                             <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white/10" style={{ color: theme.accent }}>{track.key}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <ClockIcon className="w-3.5 h-3.5 text-slate-500" />
                             <span className="text-xs font-mono font-bold text-slate-200">{track.duration}</span>
                        </div>
                        <div className="opacity-80 scale-90 origin-right">
                             {renderRating(track.rating)}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </>
  );
};
