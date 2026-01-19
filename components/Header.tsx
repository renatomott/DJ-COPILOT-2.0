
import React from 'react';
import { RefreshCwIcon } from './icons';

interface HeaderProps {
    onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 z-20 flex justify-between items-center border-b border-gray-800">
            <h1 className="text-xl font-semibold text-gray-200 tracking-wider">
                DJ Copilot 2.0
            </h1>
            <button
                onClick={onReset}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Carregar nova playlist"
            >
                <RefreshCwIcon className="w-5 h-5" />
            </button>
        </header>
    );
};
