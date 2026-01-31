
import React, { useState } from 'react';
import type { Track } from '../types';
import { StarIcon, PlayIcon, TagIcon, FolderIcon, ZapIcon, ActivityIcon, ClockIcon } from './icons';
import { CoverArt } from './CoverArt';
import { translations } from '../utils/translations';
import { EnergyBar } from './EnergyBar';

const renderRating = (rating: number) => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-3.5 h-3.5 ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

// Helper to convert hex to rgba for the glow effect
const hexToRgba = (hex: string | undefined, alpha: number) => {
    if (!hex) return `rgba(6, 182, 212, ${alpha})`; // Default Cyan
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface NowPlayingProps {
  track: Track;
  language: 'pt-BR' | 'en-US';
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ track, language }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSpinning, setIsSpinning] = useState(true);

  const t = translations[language];
  
  // Stronger Glow Config
  const glowColor = hexToRgba(track.color, 0.75); // Increased opacity
  const glowStyle = { boxShadow: `0 0 90px -10px ${glowColor}` }; // Increased spread

  const toggleSpin = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsSpinning(!isSpinning);
  };

  return (
    <>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-4 rounded-3xl relative transition-all duration-500 group cursor-pointer
           bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden"
        style={glowStyle}
      >
        {/* Ambient Background Image (Blurred) */}
        {track.visualUrl && (
          <div className="absolute inset-0 z-0">
              <img src={track.visualUrl} className="w-full h-full object-cover opacity-20 blur-2xl scale-125" alt="Background" />
              <div className="absolute inset-0 bg-black/60"></div>
          </div>
        )}

        <div className="relative z-10 w-full">
            
            {/* --- COLLAPSED STATE (Retraído) --- */}
            {!isExpanded && (
                <div className="flex items-center gap-4 p-3 sm:p-4">
                    {/* Small Vinyl */}
                    <div 
                        className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 cursor-pointer active:scale-95 transition-transform"
                        onClick={toggleSpin}
                    >
                        <div 
                            className="w-full h-full rounded-full overflow-hidden shadow-lg border-2 border-gray-800 bg-black"
                            style={{ 
                                animation: 'spin 2.4s linear infinite', 
                                animationPlayState: isSpinning ? 'running' : 'paused'
                            }}
                        >
                             <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full opacity-90" />
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-gray-700 z-10 pointer-events-none"></div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h2 className="text-lg sm:text-xl font-black text-white leading-tight break-words mb-0.5 tracking-tight">
                            {track.name}
                        </h2>
                        <p className="text-sm sm:text-base text-cyan-200 font-bold mb-2 break-words leading-tight">
                            {track.artist}
                        </p>
                        
                        {/* Compact Stats Row - Enhanced Visibility */}
                        <div className="flex flex-wrap items-center gap-2">
                             <span className="bg-slate-800 text-cyan-400 px-2 py-0.5 rounded text-xs font-black font-mono border border-slate-700 shadow-sm">
                                {track.bpm} BPM
                             </span>
                             <span className={`px-2 py-0.5 rounded font-black text-xs ${track.key.includes('m') ? 'bg-cyan-900/60 text-cyan-100' : 'bg-pink-900/60 text-pink-100'} border border-white/10 shadow-sm`}>
                                 {track.key}
                             </span>
                             <div className="ml-1 scale-105 origin-left">{renderRating(track.rating)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EXPANDED STATE (Expandido) --- */}
            {isExpanded && (
                <div className="p-4 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 relative">
                    
                    {/* BPM - Top Right (Visible in expanded as well) */}
                    <div className="absolute top-4 right-4 z-20">
                         {track.bpm && (
                            <div className="bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-sm sm:text-base font-black font-mono text-cyan-400 shadow-lg animate-pulse">
                                {track.bpm} <span className="text-[10px] text-gray-400 font-normal">BPM</span>
                            </div>
                         )}
                    </div>

                    {/* Large Vinyl */}
                    <div 
                        className="relative w-32 h-32 sm:w-40 sm:h-40 mb-4 mt-2 cursor-pointer active:scale-95 transition-transform"
                        onClick={toggleSpin}
                    >
                        <div 
                            className="w-full h-full rounded-full overflow-hidden shadow-2xl border-[3px] border-gray-800 bg-black"
                            style={{ 
                                animation: 'spin 4.8s linear infinite', 
                                animationPlayState: isSpinning ? 'running' : 'paused'
                            }}
                        >
                             <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full opacity-90" priority={true} />
                        </div>
                        {/* Spindle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black/80 rounded-full z-10 backdrop-blur-sm border border-white/10 flex items-center justify-center pointer-events-none">
                             <div className="w-2 h-2 bg-black rounded-full border border-gray-600"></div>
                        </div>
                    </div>

                    {/* Main Info - Prominent Typography */}
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1 w-full break-words px-1 tracking-tight">
                        {track.name}
                    </h2>
                    <p className="text-lg text-cyan-200 font-bold mb-6 w-full break-words px-1">
                        {track.artist}
                    </p>

                    {/* Stats Grid - Optimized for Width */}
                    <div className="w-full grid grid-cols-4 gap-2 mb-4">
                        <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase font-bold mb-1">Key</span>
                            <span className={`text-sm sm:text-base font-black ${track.key.includes('m') ? 'text-cyan-400' : 'text-pink-400'}`}>{track.key}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase font-bold mb-1">Time</span>
                            <span className="text-sm sm:text-base font-mono font-bold text-white">{track.duration}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase font-bold mb-1">Plays</span>
                            <span className="text-sm sm:text-base font-mono font-bold text-white">{track.playCount}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center border border-white/5">
                            <span className="text-[9px] text-gray-500 uppercase font-bold mb-1">Rating</span>
                            <div className="scale-90 origin-center">{renderRating(track.rating)}</div>
                        </div>
                    </div>

                    {/* Footer Info: Directory, Energy, Cues */}
                    <div className="w-full bg-black/20 rounded-xl p-3 border border-white/5 space-y-3">
                        
                        <div className="flex items-center justify-between text-xs">
                             <div className="flex items-center gap-2 overflow-hidden">
                                 <span 
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                                    style={{ backgroundColor: track.color || '#06b6d4', color: track.color || '#06b6d4' }}
                                 />
                                 <span className="font-bold text-gray-300 truncate uppercase tracking-wide">{track.location}</span>
                             </div>
                             {track.energy && (
                                 <div className="flex items-center gap-2">
                                     <ZapIcon className="w-3 h-3 text-yellow-500" />
                                     <EnergyBar energy={track.energy} className="h-3 w-12" />
                                 </div>
                             )}
                        </div>

                        {track.cuePoints && track.cuePoints.length > 0 && (
                            <div className="pt-2 border-t border-white/5">
                                <div className="flex flex-wrap justify-center gap-1.5">
                                    {track.cuePoints.map((cue, i) => (
                                        <span key={i} className="text-[9px] font-bold text-cyan-200 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/20">
                                            {cue}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </>
  );
};
