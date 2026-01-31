
import React from 'react';
import type { Track } from '../types';
import { CoverArt } from './CoverArt';
import { PlayIcon, ClockIcon } from './icons';

interface MiniPlayerProps {
    track: Track;
    onClick?: () => void;
    variant?: 'default' | 'next'; // default = On Air (Header), next = Next Track (Deck)
    label?: string;
    className?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ track, onClick, variant = 'default', label, className = '' }) => {
    const isNext = variant === 'next';
    
    // Color Schemes
    const bgClass = isNext 
        ? 'bg-indigo-950/90 border-indigo-500/30 hover:bg-indigo-900/90' 
        : 'bg-slate-900/90 border-white/10 hover:bg-slate-800';
    
    const artistColor = isNext ? 'text-indigo-300' : 'text-cyan-400';
    const labelColor = isNext ? 'text-indigo-400 bg-indigo-950/50 border-indigo-500/50' : 'text-cyan-500 bg-cyan-950/30 border-cyan-500/30';

    return (
        <div 
            onClick={onClick}
            className={`flex items-center gap-3 border rounded-r-xl rounded-l-sm pl-2 pr-4 py-2 shadow-xl backdrop-blur-md overflow-hidden cursor-pointer transition-all duration-300 border-l-[6px] group relative ${bgClass} ${className}`}
            style={{ borderLeftColor: track.color || (isNext ? '#818cf8' : '#FFFFFF') }}
        >
            {/* Optional Top Label (e.g., "NEXT") */}
            {label && (
                <div className={`absolute top-0.5 right-1 px-1.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest border ${labelColor}`}>
                    {label}
                </div>
            )}

            {/* Cover Art */}
            <div className="w-11 h-11 rounded-md overflow-hidden border border-white/10 relative flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full" />
                {isNext && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayIcon className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-xs font-black text-white truncate leading-tight pr-6">{track.name}</span>
                
                <div className="flex items-center gap-2 text-[10px] leading-tight mt-1">
                    {/* Artist */}
                    <span className={`font-bold truncate max-w-[80px] sm:max-w-[120px] ${artistColor}`}>
                        {track.artist}
                    </span>
                    
                    <div className="w-px h-2.5 bg-white/10"></div>

                    {/* BPM */}
                    <span className="text-slate-400 font-mono font-bold">
                        {track.bpm} <span className="text-[8px] opacity-60">BPM</span>
                    </span>

                    {/* Key */}
                    <span className={`font-mono font-black ${track.key.includes('m') ? 'text-cyan-200' : 'text-pink-200'}`}>
                        {track.key}
                    </span>

                    {/* Duration */}
                    <div className="flex items-center gap-0.5 ml-auto text-slate-500 font-mono font-bold bg-black/20 px-1.5 rounded">
                        <span>{track.duration}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
