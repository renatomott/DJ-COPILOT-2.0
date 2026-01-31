
import React, { useRef, useEffect } from 'react';
import type { Track, ViewMode } from '../types';
import { ClockIcon, StarIcon, PlusIcon, ZapIcon, PlayIcon, FolderIcon, TagIcon, ActivityIcon, BrainIcon } from './icons';
import { CoverArt } from './CoverArt';
import { EnergyBar } from './EnergyBar';

interface TrackItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isOnAir?: boolean;
  onAddToQueue?: (e: React.MouseEvent, track: Track) => void;
  variant?: ViewMode;
  searchQuery?: string;
  referenceTrack?: Track | null; // Faixa "NO AR" para comparação
}

const renderRating = (rating: number) => {
  const stars = [];
  const normalizedRating = rating > 5 ? Math.round(rating / 20) : rating;
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-[0.85em] h-[0.85em] ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/50'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

// Helper for Smart Search Highlight
const HighlightText: React.FC<{ text: string; query?: string; className?: string }> = ({ text, query, className }) => {
    if (!query || query.length < 2) return <span className={className}>{text}</span>;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
        <span className={className}>
            {parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={i} className="text-yellow-300 bg-yellow-900/30 rounded-sm px-0.5">{part}</span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

export const TrackItem: React.FC<TrackItemProps> = ({ track, onSelect, isSelected, isExpanded = false, onToggleExpand, isOnAir, onAddToQueue, variant = 'card', searchQuery, referenceTrack }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isList = variant === 'list';
  
  // Logic to highlight matching BPM/Key with On Air track
  const isBpmMatch = referenceTrack && !isOnAir && Math.abs(parseFloat(track.bpm) - parseFloat(referenceTrack.bpm)) < 0.1;
  const isKeyMatch = referenceTrack && !isOnAir && track.key === referenceTrack.key;

  // Gold Outline Style (does not affect font color)
  const matchStyle = "ring-1 ring-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.3)]";

  // Energy Heatmap Color (Subtle gradient overlay)
  const energy = track.energy || 3;
  let energyGradient = '';
  if (energy >= 4.5) energyGradient = 'bg-gradient-to-r from-red-900/10 via-transparent to-transparent'; 
  else if (energy >= 3.5) energyGradient = 'bg-gradient-to-r from-orange-900/10 via-transparent to-transparent'; 
  else if (energy <= 2) energyGradient = 'bg-gradient-to-r from-blue-900/10 via-transparent to-transparent'; 

  // Base classes
  const baseClasses = `rounded-xl cursor-pointer transition-all duration-300 border relative group overflow-hidden ${energyGradient}`;
  const selectedClasses = "bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/30";
  const onAirClasses = "bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse-onair ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-black";
  const defaultClasses = "bg-slate-900/40 border-slate-800 hover:bg-slate-800 hover:border-slate-600";

  useEffect(() => {
    if (isExpanded && cardRef.current && !isList) {
        setTimeout(() => {
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }
  }, [isExpanded, isList]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isList) {
        onSelect(track);
        return;
    }
    if (onToggleExpand) {
        onToggleExpand();
    } else {
        onSelect(track);
    }
  };

  const handlePlayAction = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onSelect(track);
  };

  const handleAddAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onAddToQueue) onAddToQueue(e, track);
  };

  // LIST VIEW LAYOUT
  if (isList) {
      return (
        <div 
            onClick={handleCardClick} 
            className={`${baseClasses} flex items-center gap-3 px-3 py-2 ${isOnAir ? onAirClasses : isSelected ? selectedClasses : defaultClasses}`}
        >
            {/* Left: BPM & Key */}
            <div className="flex flex-col items-center justify-center gap-1.5 min-w-[3rem] border-r border-white/5 pr-3">
                 <span className={`text-[11px] font-mono font-bold text-white px-1 rounded ${isBpmMatch ? matchStyle : ''}`}>
                    {track.bpm}
                 </span>
                 <span className={`text-[9px] font-mono font-bold px-1.5 rounded-sm w-full text-center ${track.key && track.key.includes('m') ? 'bg-cyan-900/40 text-cyan-300' : 'bg-pink-900/40 text-pink-300'} ${isKeyMatch ? matchStyle : ''}`}>
                    {track.key || '--'}
                 </span>
            </div>
            
            {/* Middle: Title & Artist & Folder */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    {track.color && (
                        <span 
                            className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm ring-1 ring-white/10" 
                            style={{ backgroundColor: track.color }} 
                            title="Cor da Faixa"
                        />
                    )}
                    <HighlightText 
                        text={track.name} 
                        query={searchQuery} 
                        className={`text-[13px] font-bold truncate leading-tight ${isSelected ? 'text-cyan-100' : 'text-white'}`} 
                    />
                    {track.energy && <EnergyBar energy={track.energy} className="w-8 scale-75 hidden sm:flex" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <HighlightText 
                        text={track.artist} 
                        query={searchQuery} 
                        className="text-[10px] text-slate-400 truncate font-bold uppercase max-w-[50%]" 
                    />
                    {track.location && (
                        <>
                            <div className="w-px h-2 bg-slate-700"></div>
                            <p className="text-[9px] text-cyan-700/80 truncate font-mono uppercase">{track.location}</p>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Metadata & Action Buttons */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/5">
                 <div className="hidden sm:block opacity-80 scale-90">
                    {renderRating(track.rating)}
                 </div>
                 
                 <button 
                    onClick={(e) => handlePlayAction(e)} 
                    className="p-1.5 text-cyan-400 hover:text-white transition-colors bg-cyan-900/20 hover:bg-cyan-600 rounded-lg border border-cyan-500/20"
                    title="Carregar no Deck"
                 >
                    <PlayIcon className="w-4 h-4 fill-current" />
                 </button>

                {onAddToQueue && (
                    <button 
                        onClick={handleAddAction} 
                        className="p-1.5 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-green-600 rounded-lg border border-white/5"
                        title="Adicionar à Fila"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
      );
  }

  const bpmClass = isExpanded 
    ? "text-xs sm:text-sm font-black font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)] transition-all duration-300"
    : "text-[9px] font-mono font-bold text-cyan-400 bg-black/40 px-1.5 py-0.5 rounded border border-slate-700 shadow-sm transition-all duration-300";

  // Apply gold outline if match, merge with existing classes
  const finalBpmClass = `${bpmClass} ${isBpmMatch ? matchStyle : ''}`;
  const keyClass = `font-mono px-1.5 py-0.5 rounded-md font-bold text-[11px] ${isOnAir ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-cyan-400 border border-slate-700'} ${isKeyMatch ? matchStyle : ''}`;

  // CARD VIEW LAYOUT (Default)
  return (
    <>
      <style>{`@keyframes pulse-onair { 0%, 100% { border-color: rgba(34, 211, 238, 0.4); box-shadow: 0 0 10px rgba(34, 211, 238, 0.2); } 50% { border-color: rgba(34, 211, 238, 1); box-shadow: 0 0 25px rgba(34, 211, 238, 0.4); } } .animate-pulse-onair { animation: pulse-onair 1.5s infinite cubic-bezier(0.4, 0, 0.6, 1); }`}</style>
      
      <div
        ref={cardRef}
        onClick={handleCardClick}
        className={`${baseClasses} flex flex-col ${isOnAir ? onAirClasses : isSelected ? selectedClasses : defaultClasses}`}
      >
        {/* Main Content Row */}
        <div className="flex items-center gap-2.5 p-2 w-full relative">
            <div className="w-14 h-14 flex-shrink-0 relative group/cover rounded-lg overflow-hidden">
                <CoverArt id={track.id} artist={track.artist} name={track.name} className="w-full h-full" priority={false} />
                
                {isOnAir && (<div className="absolute inset-0 ring-1 ring-cyan-400 z-10 pointer-events-none"></div>)}
                
                {/* Play Count Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-[2px] h-4 flex items-center justify-center pointer-events-none z-10">
                    <div className="flex items-center gap-0.5">
                        <PlayIcon className="w-2 h-2 text-white/70" />
                        <span className="text-[8px] font-black text-white">{track.playCount}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-start gap-2 mb-0.5">
                    <HighlightText 
                        text={track.name} 
                        query={searchQuery}
                        className={`font-bold text-base leading-snug text-white break-words tracking-tight`}
                    />
                    
                    {track.bpm && (
                        <span className={`flex-shrink-0 ${finalBpmClass}`}>
                            {track.bpm}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-2 mb-1">
                    <HighlightText 
                        text={track.artist} 
                        query={searchQuery}
                        className="text-[11px] text-slate-400 line-clamp-1 font-bold flex-1"
                    />
                    
                    {/* Collapsed Location */}
                    {track.location && !isExpanded && (
                        <div className="flex items-center gap-1 flex-shrink-0 justify-end max-w-[60%]">
                             {track.color && (
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                             )}
                             {!track.color && <FolderIcon className="w-2.5 h-2.5 text-cyan-600 flex-shrink-0" />}
                            <p className="text-[8px] text-cyan-500 uppercase tracking-wider font-black break-words leading-tight text-right truncate max-w-[80px]">{track.location}</p>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-white">
                    <span className={keyClass}>{track.key || 'N/A'}</span>
                    <div className="w-px h-3 bg-slate-700/50 ml-auto"></div>
                    <div className="flex items-center">{renderRating(track.rating)}</div>
                </div>
            </div>
        </div>

        {/* Expanded Info Section */}
        {isExpanded && (
            <div className="px-3 pb-3 pt-1 animate-in slide-in-from-top-2 fade-in duration-200 border-t border-white/5 bg-black/20" onClick={(e) => e.stopPropagation()}>
                {/* 1. Technical Stats */}
                <div className="flex flex-wrap sm:grid sm:grid-cols-2 items-center justify-between gap-2 mb-3 bg-white/5 p-2 rounded-lg border border-white/5 mt-2">
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5" title="Duração">
                            <ClockIcon className="w-3 h-3 text-slate-500" />
                            <span className="text-xs font-mono font-bold text-gray-300">{track.duration}</span>
                         </div>
                         <div className="w-px h-3 bg-white/10"></div>
                         <div className="flex items-center gap-1.5" title="Play Count">
                            <PlayIcon className="w-2.5 h-2.5 text-slate-500" />
                            <span className="text-xs font-mono font-bold text-gray-300">{track.playCount}</span>
                         </div>
                    </div>

                    {track.location && (
                        <div className="flex items-center gap-1.5 max-w-[50%] sm:max-w-none justify-end" title={`Folder: ${track.location}`}>
                            {track.color && (
                                <span 
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/10 shadow-sm" 
                                    style={{ backgroundColor: track.color }} 
                                />
                            )}
                            <FolderIcon className={`w-3 h-3 ${track.color ? 'hidden' : 'text-slate-600'} flex-shrink-0`} />
                            <span className="text-[10px] text-cyan-500/80 font-bold uppercase tracking-wider truncate">
                                {track.location}
                            </span>
                        </div>
                    )}
                </div>

                {/* 2. Análise IA */}
                {track.subgenre && (
                    <div className="mb-3 p-2 bg-gradient-to-r from-cyan-900/20 to-transparent rounded border-l-2 border-cyan-500">
                        <p className="text-[9px] text-cyan-300 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <BrainIcon className="w-3 h-3" /> Análise IA
                        </p>
                        <p className="text-xs text-gray-200 italic font-medium">"{track.subgenre}"</p>
                    </div>
                )}

                {/* 3. Gênero e Energia */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-3">
                     <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <TagIcon className="w-3 h-3" /> Gênero
                        </span>
                        <span className="text-sm font-bold text-white">{track.genre || '-'}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <ZapIcon className="w-3 h-3" /> Energia
                        </span>
                        {track.energy ? (
                            <EnergyBar energy={track.energy} className="h-4 w-full max-w-[100px]" />
                        ) : (
                            <span className="text-xs text-slate-600 italic">Não analisado</span>
                        )}
                     </div>
                </div>

                {/* 4. Cues Sugeridos */}
                {track.cuePoints && track.cuePoints.length > 0 && (
                    <div className="mb-4">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                            <ActivityIcon className="w-3 h-3" /> Hot Cues (IA)
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {track.cuePoints.map((cue, idx) => (
                                <span key={idx} className="bg-slate-800 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded border border-slate-700 shadow-sm">
                                    {cue}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. Action Buttons (Explicit) */}
                <div className="flex gap-3 mt-2 items-center">
                    <button 
                        onClick={(e) => handlePlayAction(e)}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 active:scale-95 transition-all h-[50px]"
                    >
                        <PlayIcon className="w-5 h-5 fill-current" />
                        LOAD
                    </button>
                    
                    {onAddToQueue && (
                        <button 
                            onClick={handleAddAction}
                            className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all h-[50px] aspect-square"
                        >
                            <PlusIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        )}

        {isOnAir && (<div className="absolute top-0 left-0 bg-cyan-500 text-black text-[7px] font-bold px-1.5 py-0.5 rounded-br-md flex items-center gap-1 uppercase tracking-widest shadow-lg z-20 border-r border-b border-cyan-400/50"><ZapIcon className="w-1.5 h-1.5 fill-current" /> ON</div>)}
      </div>
    </>
  );
};
