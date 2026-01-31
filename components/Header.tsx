
import React from 'react';
import { MenuIcon } from './icons';
import type { Track } from '../types';
import { MiniPlayer } from './MiniPlayer';

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
                    <div className="animate-in fade-in slide-in-from-right-4 max-w-[280px] sm:max-w-md w-full">
                        <MiniPlayer 
                            track={currentTrack} 
                            onClick={onNavigateToDeck} 
                            variant="default"
                        />
                    </div>
                ) : (
                    <div className="w-10"></div> 
                )}
            </div>
        </header>
    );
};
