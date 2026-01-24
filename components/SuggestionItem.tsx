
import React, { useState, useRef, useEffect } from 'react';
import type { Suggestion, Track } from '../types';
import { ChevronDownIcon, ClockIcon, PlayIcon, TagIcon, XIcon, PlaylistIcon, ActivityIcon, StarIcon, PlusIcon } from './icons';
import { CoverArt } from './CoverArt';
import { translations } from '../utils/translations';

const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= rating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[0.9em] h-[0.9em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white opacity-20'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

interface SuggestionItemProps {
  suggestion: Suggestion;
  currentTrack: Track;
  onSelect: (track: Track) => void;
  onDismiss: (trackId: string) => void;
  onAddToQueue?: (track: Track) => void;
  language: 'pt-BR' | 'en-US';
}

export const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, currentTrack, onSelect, onDismiss, onAddToQueue, language }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const t = translations[language];
    
    // Rola para o topo do card quando expandido
    useEffect(() => {
        if (isExpanded && cardRef.current) {
            // Pequeno timeout para garantir que a renderização do conteúdo expandido iniciou
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [isExpanded]);
    
    // Cálculos de BPM
    const bpmDiffVal = parseFloat(suggestion.bpm) - parseFloat(currentTrack.bpm);
    const bpmDiff = bpmDiffVal > 0 ? `+${bpmDiffVal.toFixed(1)}` : bpmDiffVal.toFixed(1);
    const isPositiveDiff = bpmDiffVal >= 0;
    
    const matchScore = suggestion.matchScore <= 1 ? Math.round(suggestion.matchScore * 100) : Math.round(suggestion.matchScore);

    return (
        <div 
            ref={cardRef}
            className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-lg mb-3 transition-colors duration-200 scroll-mt-24"
        >
            {/* Cabeçalho - Sempre mantém o layout original */}
            <div 
                className="p-3 relative cursor-pointer active:bg-white/5"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex gap-3">
                    {/* Artwork */}
                    <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                        <CoverArt id={suggestion.id} artist={suggestion.artist} name={suggestion.name} className="w-full h-full rounded-xl" priority={false} />
                        <div className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[0.7rem] font-black px-1.5 py-0.5 rounded-md border border-gray-950 z-10 shadow-sm">
                            {matchScore}%
                        </div>
                    </div>

                    {/* Metadata - Estrutura fixa, não muda ao expandir */}
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="pr-8">
                            <h4 className="text-white font-bold text-sm leading-tight mb-0.5 break-words line-clamp-2">
                                {suggestion.name}
                            </h4>
                            <p className="text-white opacity-90 text-xs truncate mb-1.5 font-bold">
                                {suggestion.artist}
                            </p>
                            
                            {/* Informações Secundárias (Sempre visíveis) */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-[0.65rem] text-white font-black truncate bg-blue-600/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                                        <PlaylistIcon className="w-3 h-3 text-blue-400" />
                                        <span>{suggestion.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-white font-mono font-black">
                                        <ClockIcon className="w-3 h-3 opacity-70" />
                                        <span>{suggestion.duration}</span>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    {renderRating(suggestion.rating)}
                                </div>
                            </div>
                        </div>

                        {/* Badges Técnicos (Sempre visíveis) */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <div className="bg-black text-green-400 text-xs font-mono font-black px-1.5 py-0.5 rounded border border-green-900/50">
                                {suggestion.bpm}
                            </div>
                            <div className="bg-black text-blue-400 text-xs font-mono font-black px-1.5 py-0.5 rounded border border-blue-900/50">
                                {suggestion.key}
                            </div>
                        </div>
                    </div>
                    
                    {/* Botões de Ação no Canto */}
                    <div className="flex flex-col justify-between items-end absolute right-2.5 top-2.5 bottom-2.5">
                         <button onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }} className="p-1.5 text-white hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                             <XIcon className="w-4 h-4" />
                         </button>
                         <ChevronDownIcon className={`w-5 h-5 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </div>

            {/* Conteúdo Expandido */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-800 bg-black/10 animate-in slide-in-from-top-1">
                    
                    {/* Análise da IA */}
                    <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                        <p className="text-xs text-white font-bold leading-relaxed">
                            <span className="font-black text-blue-400 block mb-1 uppercase text-[0.7rem] tracking-wider">{t.whyMatch}</span>
                            {suggestion.reason}
                        </p>
                    </div>

                    {/* Grid de Informações Adicionais (Diff BPM, Gênero, Plays) */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                        {/* Diferença de BPM */}
                        <div className="bg-gray-800/60 border border-gray-700 p-2 rounded-lg flex flex-col justify-center items-center text-center">
                             <span className="text-[0.6rem] text-white opacity-50 font-black uppercase tracking-widest mb-1">{t.diffBpm}</span>
                             <span className={`text-xs font-black font-mono ${isPositiveDiff ? 'text-red-400' : 'text-green-400'}`}>
                                {bpmDiff}
                             </span>
                        </div>
                         {/* Gênero */}
                         <div className="bg-gray-800/60 border border-gray-700 p-2 rounded-lg flex flex-col justify-center items-center text-center">
                             <span className="text-[0.6rem] text-white opacity-50 font-black uppercase tracking-widest mb-1">{t.genre}</span>
                             <span className="text-[0.65rem] font-bold text-white truncate w-full" title={suggestion.genre}>
                                {suggestion.genre || 'N/A'}
                             </span>
                        </div>
                        {/* Play Count */}
                        <div className="bg-gray-800/60 border border-gray-700 p-2 rounded-lg flex flex-col justify-center items-center text-center">
                             <span className="text-[0.6rem] text-white opacity-50 font-black uppercase tracking-widest mb-1">{t.plays}</span>
                             <span className="text-xs font-black font-mono text-white">
                                {suggestion.playCount}
                             </span>
                        </div>
                    </div>

                    {/* Ações Principais */}
                    <div className="mt-3 flex gap-2">
                        <button 
                            onClick={() => onSelect(suggestion)}
                            className="flex-1 bg-white text-black text-xs font-black py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-lg min-h-[50px]"
                        >
                            <PlayIcon className="w-4 h-4" />
                            {t.loadDeck}
                        </button>
                        {onAddToQueue && (
                            <button 
                                onClick={() => onAddToQueue(suggestion)}
                                className="px-4 bg-gray-800 border border-gray-700 text-white rounded-xl hover:bg-gray-700 hover:border-blue-500 transition-colors flex items-center justify-center shadow-lg min-h-[50px] min-w-[50px]"
                                title="Adicionar ao Set Builder"
                            >
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
