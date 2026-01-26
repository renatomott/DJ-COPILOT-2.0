
import React from 'react';

interface HeaderProps {
    onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm z-[90] border-b border-gray-800">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-xl md:max-w-5xl">
                <h1 className="text-xl font-black text-gray-200 tracking-tighter italic uppercase">
                    DJ COPILOT <span className="text-cyan-500 text-sm not-italic">2.0 by Mott</span>
                </h1>
                <div className="w-10"></div> {/* Espaçador para manter o título centralizado visualmente */}
            </div>
        </header>
    );
};
