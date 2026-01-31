
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
}

export const Header: React.FC<HeaderProps> = ({ onReset, onToggleMenu, showMenuButton, currentTrack, showMiniPlayer }) => {
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
                    <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 rounded-full pl-1 pr-4 py-1 animate-in fade-in slide-in-from-right-4 shadow-lg backdrop-blur-md max-w-[200px] sm:max-w-xs overflow-hidden">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative flex-shrink-0">
                            <CoverArt id={currentTrack.id} artist={currentTrack.artist} name={currentTrack.name} className="w-full h-full" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-white truncate leading-tight">{currentTrack.name}</span>
                            <div className="flex items-center gap-2 text-[9px] leading-tight">
                                <span className="font-bold text-cyan-400 truncate">{currentTrack.artist}</span>
                                <span className="text-slate-500 font-mono hidden sm:inline">{currentTrack.bpm}</span>
                            </div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse ml-auto flex-shrink-0 shadow-[0_0_5px_currentColor]"></div>
                    </div>
                ) : (
                    <div className="w-10"></div> 
                )}
            </div>
        </header>
    );
};
