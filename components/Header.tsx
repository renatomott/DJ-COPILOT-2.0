
import React from 'react';
import { MenuIcon } from './icons';
import type { Track } from '../types';
import { CoverArt } from './CoverArt';

interface HeaderProps {
    onReset: () => void;
    onToggleMenu?: () => void;
    showMenuButton?: boolean;
    currentTrack?: Track | null;
    showMiniPlayer?: boolean;
    onNavigateToDeck?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset, onToggleMenu, showMenuButton, currentTrack, showMiniPlayer, onNavigateToDeck }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm z-[90] border-b border-gray-800 transition-all duration-300">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-full">
                <div className="flex items-center gap-4">
                    {showMenuButton && (
                        <button 
                            onClick={onToggleMenu} 
                            className="hidden md:flex p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
                            aria-label="Toggle Menu"
                        >
                            <MenuIcon className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-xl font-black text-gray-200 tracking-tighter italic uppercase">
                        DJ COPILOT <span className="text-cyan-500 text-sm not-italic">2.0 by Mott</span>
                    </h1>
                </div>
                
                {/* Mini Player (Visible when not on Deck tab) */}
                {showMiniPlayer && currentTrack ? (
                    <div 
                        onClick={onNavigateToDeck}
                        className="flex items-center gap-3 bg-slate-900/90 border border-white/10 rounded-r-xl rounded-l-sm pl-2 pr-5 py-1.5 animate-in fade-in slide-in-from-right-4 shadow-xl backdrop-blur-md max-w-[280px] sm:max-w-md overflow-hidden cursor-pointer hover:bg-slate-800 transition-colors border-l-[6px]"
                        style={{ borderLeftColor: currentTrack.color || '#FFFFFF' }}
                    >
                        <div className="w-10 h-10 rounded-md overflow-hidden border border-white/10 relative flex-shrink-0 shadow-sm">
                            <CoverArt id={currentTrack.id} artist={currentTrack.artist} name={currentTrack.name} className="w-full h-full" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-white truncate leading-tight">{currentTrack.name}</span>
                            <div className="flex items-center gap-2 text-[11px] leading-tight mt-0.5">
                                <span className="font-bold text-cyan-400 truncate max-w-[100px]">{currentTrack.artist}</span>
                                <span className="text-slate-500 font-mono hidden sm:inline border-l border-slate-700 pl-2">
                                    {currentTrack.bpm} <span className="text-xs text-slate-600">BPM</span>
                                </span>
                                <span className={`font-mono font-black ${currentTrack.key.includes('m') ? 'text-cyan-200' : 'text-pink-200'}`}>
                                    {currentTrack.key}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-10"></div> 
                )}
            </div>
        </header>
    );
};
