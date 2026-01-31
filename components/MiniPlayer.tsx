
import React, { useState, useEffect } from 'react';
import type { Track } from '../types';
import { CoverArt } from './CoverArt';
import { PlayIcon, FolderIcon } from './icons';

interface MiniPlayerProps {
    track: Track;
    onClick?: () => void;
    variant?: 'default' | 'next'; // default = On Air (Header), next = Next Track (Deck)
    label?: string;
    className?: string;
}

// Helper for dynamic background opacity
const hexToRgba = (hex: string | undefined, alpha: number) => {
    if (!hex) return undefined;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ track, onClick, variant = 'default', label, className = '' }) => {
    const [showPlayAction, setShowPlayAction] = useState(false);
    const isNext = variant === 'next';
    
    // Reset play action state when track changes
    useEffect(() => {
        setShowPlayAction(false);
    }, [track.id]);

    // Handle container click
    const handleContainerClick = () => {
        if (isNext) {
            // First click: Show Play Button
            setShowPlayAction(true);
        } else {
            // Default behavior (On Air): Navigate/Action immediately
            onClick?.();
        }
    };

    // Handle Play Button click (specific to NEXT)
    const handlePlayClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Stop bubbling to container
        onClick?.(); // Trigger the actual load action
        setShowPlayAction(false);
    };
    
    // Dynamic Styles based on variant and track color
    const containerStyle: React.CSSProperties = isNext && track.color ? {
        backgroundColor: hexToRgba(track.color, 0.2),
        borderColor: hexToRgba(track.color, 0.3),
        borderLeftColor: track.color,
    } : {
        borderLeftColor: track.color || (isNext ? '#818cf8' : '#FFFFFF')
    };

    const bgClass = isNext 
        ? 'backdrop-blur-md hover:brightness-110' // Color handled by inline style
        : 'bg-slate-900/90 border-white/10 hover:bg-slate-800 backdrop-blur-md';
    
    const artistColor = isNext ? 'text-indigo-200' : 'text-cyan-200';
    const labelColor = isNext ? 'text-indigo-300 bg-indigo-950/60 border-indigo-500/50' : 'text-cyan-300 bg-cyan-950/40 border-cyan-500/30';
    
    // Styles for Directory line
    const dirIconColor = isNext ? 'text-indigo-300/70' : 'text-slate-500';
    const dirTextColor = isNext ? 'text-indigo-100/80' : 'text-slate-400';

    return (
        <div 
            onClick={handleContainerClick}
            className={`flex items-center gap-3 border rounded-r-xl rounded-l-sm pl-2 pr-4 py-2 shadow-xl overflow-hidden cursor-pointer transition-all duration-300 border-l-[6px] group relative ${bgClass} ${className}`}
            style={containerStyle}
        >
            {/* Optional Top Label (e.g., "NEXT") */}
            {label && (
                <div className={`absolute top-0.5 right-1 px-1.5 rounded-[4px] text-[8px] font-bold uppercase tracking-widest border ${labelColor}`}>
                    {label}
                </div>
            )}

            {/* Cover Art */}
            <div className="w-11 h-11 rounded-md overflow-hidden border border-white/10 relative flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full" />
                
                {/* NEXT Logic: Overlay appears on click or hover if already active */}
                {isNext && showPlayAction && (
                    <div 
                        onClick={handlePlayClick}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] animate-in fade-in duration-200 z-10 hover:bg-black/40"
                    >
                        <PlayIcon className="w-6 h-6 text-white drop-shadow-md scale-110 active:scale-95 transition-transform" />
                    </div>
                )}
            </div>

            {/* Info Container */}
            <div className="flex flex-col min-w-0 flex-1 justify-center gap-[2px]">
                
                {/* 1. Track Name */}
                <span className="text-xs font-semibold text-white truncate leading-tight pr-6 tracking-wide">
                    {track.name}
                </span>
                
                {/* 2. Metadata: Artist | BPM | Key | Duration */}
                <div className="flex items-center gap-2 text-xs leading-tight">
                    {/* Artist */}
                    <span className={`font-medium truncate max-w-[80px] sm:max-w-[120px] ${artistColor}`}>
                        {track.artist}
                    </span>
                    
                    <div className="w-px h-2.5 bg-white/10"></div>

                    {/* BPM */}
                    <span className="text-slate-200 font-mono font-bold">
                        {track.bpm} <span className="text-[8px] opacity-60">BPM</span>
                    </span>

                    {/* Key */}
                    <span className={`font-mono font-bold ${track.key.includes('m') ? 'text-cyan-200' : 'text-pink-200'}`}>
                        {track.key}
                    </span>

                    {/* Duration */}
                    <div className="flex items-center gap-0.5 ml-auto text-slate-200 font-mono font-medium bg-black/20 px-1.5 rounded">
                        <span>{track.duration}</span>
                    </div>
                </div>

                {/* 3. Directory Name */}
                {track.location && (
                    <div className="flex items-center gap-1 min-w-0">
                        <FolderIcon className={`w-2.5 h-2.5 flex-shrink-0 ${dirIconColor}`} />
                        <span className={`text-[10px] font-medium truncate leading-tight ${dirTextColor}`}>
                            {track.location}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
