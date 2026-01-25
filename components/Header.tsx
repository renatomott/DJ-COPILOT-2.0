
import React from 'react';

interface HeaderProps {
    onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 z-[90] flex justify-between items-center border-b border-gray-800">
            <h1 className="text-xl font-black text-gray-200 tracking-tighter italic uppercase">
                DJ Copilot <span className="text-cyan-500 text-sm not-italic">2.0</span>
            </h1>
            <div className="w-10"></div> {/* Espaçador para manter o título centralizado visualmente */}
        </header>
    );
};
