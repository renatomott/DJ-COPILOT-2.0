
import React, { useState, useEffect, useMemo } from 'react';
import type { Track, MashupPair } from '../types';
import { getMashupPairs } from '../services/geminiService';
import { GitMergeIcon, RefreshCwIcon, PlayIcon, PlusIcon, TagIcon, WandSparklesIcon } from './icons';
import { SkeletonLoader } from './SkeletonLoader';
import { RadarChart } from './RadarChart';
import { translations } from '../utils/translations';

interface MashupFinderProps {
  playlist: Track[];
  onSelectTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  language: 'pt-BR' | 'en-US';
}

const STORAGE_KEY_MASHUPS = 'dj_copilot_mashups_v2';

export const MashupFinder: React.FC<MashupFinderProps> = ({ playlist, onSelectTrack, onAddToQueue, language }) => {
  const [mashups, setMashups] = useState<MashupPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [targetGenre, setTargetGenre] = useState<string>('');
  const [harmonicOnly, setHarmonicOnly] = useState<boolean>(true);

  const t = translations[language];

  // Load from Storage on Mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MASHUPS);
    if (saved) {
        try {
            setMashups(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load saved mashups");
        }
    }
  }, []);

  // Save to Storage on Update
  useEffect(() => {
    if (mashups.length > 0) {
        localStorage.setItem(STORAGE_KEY_MASHUPS, JSON.stringify(mashups));
    }
  }, [mashups]);

  const loadMashups = async () => {
    setIsLoading(true);
    try {
        // Apply filters before sending to AI to reduce noise
        let candidates = playlist;
        
        if (targetGenre) {
            candidates = candidates.filter(t => t.genre && t.genre.toLowerCase().includes(targetGenre.toLowerCase()));
        }

        // We pass the filtered list to the service
        // Ideally the service would handle more complex filtering, but this is a start
        const pairs = await getMashupPairs(candidates.length > 10 ? candidates : playlist);
        
        setMashups(pairs);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const availableGenres = useMemo(() => {
      const genres = new Set<string>();
      playlist.forEach(t => { if (t.genre) genres.add(t.genre); });
      return Array.from(genres).slice(0, 15); // Limit to top/first 15
  }, [playlist]);

  // Helper to generate fake metrics for the Radar Chart
  const getMetrics = (track: Track) => [
      { label: 'Energy', value: (track.energy || 3) * 20 },
      { label: 'BPM', value: Math.min(parseFloat(track.bpm) / 1.8, 100) }, 
      { label: 'Pop', value: track.playCount > 10 ? 90 : 40 },
      { label: 'Vibe', value: Math.random() * 60 + 40 }
  ];

  return (
    <div className="h-full md:grid md:grid-cols-12 md:gap-6 md:px-6 md:pb-6 relative flex flex-col px-4 pb-24 md:overflow-hidden animate-in fade-in duration-500">
        
        {/* --- Column 1: Sidebar (Filters & Actions) --- */}
        <div className="w-full md:col-span-5 lg:col-span-5 flex-shrink-0 md:h-full md:border-r md:border-white/5 bg-[#020617]/95 md:bg-slate-950/40 backdrop-blur-xl md:backdrop-blur-none z-40 transition-all duration-300 flex flex-col rounded-xl overflow-hidden mb-4 md:mb-0">
            <div className="p-4 border-b border-white/5 space-y-4">
                
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <GitMergeIcon className="w-6 h-6 text-purple-500" />
                        Mashup Lab
                    </h2>
                    <button 
                        onClick={loadMashups} 
                        disabled={isLoading}
                        className="p-2 bg-slate-800 rounded-lg text-purple-400 hover:text-white hover:bg-purple-600 transition-all border border-purple-500/30"
                    >
                        <RefreshCwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filters Section (Always visible in Sidebar) */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex flex-col gap-4 mb-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Gênero Alvo</label>
                            <div className="relative">
                                <select 
                                    value={targetGenre} 
                                    onChange={(e) => setTargetGenre(e.target.value)}
                                    className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-xs font-bold text-white appearance-none outline-none focus:border-purple-500"
                                >
                                    <option value="">Todos</option>
                                    {availableGenres.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <TagIcon className="absolute right-3 top-3.5 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                         <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Opções</label>
                            <button 
                                onClick={() => setHarmonicOnly(!harmonicOnly)}
                                className={`w-full py-3 px-3 rounded-lg border text-xs font-bold transition-all ${harmonicOnly ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/60 border-white/10 text-gray-500'}`}
                            >
                                Harmonia Compatível
                            </button>
                        </div>
                    </div>
                    
                    <button 
                        onClick={loadMashups}
                        disabled={isLoading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-purple-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>Processando Biblioteca...</>
                        ) : (
                            <>
                                <WandSparklesIcon className="w-4 h-4" />
                                ANALISAR COM IA
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>

        {/* --- Column 2: Results (Right Content) --- */}
        <div className="md:col-span-7 lg:col-span-7 flex-1 md:h-full md:overflow-y-auto custom-scrollbar md:pr-2 pt-4 md:pt-0 relative">
            <div className="hidden md:flex items-center justify-between mb-4 sticky top-0 bg-[#020617]/95 backdrop-blur-sm p-2 z-10 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">Resultados ({mashups.length})</h2>
            </div>

            {isLoading && (
                <div className="space-y-4">
                    <SkeletonLoader variant="card" />
                    <SkeletonLoader variant="card" />
                </div>
            )}

            {!isLoading && mashups.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl opacity-50 flex flex-col items-center justify-center h-64">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Nenhum Mashup Gerado</p>
                    <p className="text-xs text-slate-600 mt-2">Ajuste os filtros e clique em Analisar</p>
                </div>
            )}

            <div className="space-y-6">
                {mashups.map((pair, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-purple-500/20 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-all">
                        
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                            
                            {/* Track A */}
                            <div className="bg-black/40 rounded-xl p-4 border border-cyan-500/10 hover:border-cyan-500/40 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><RadarChart data={getMetrics(pair.track1)} color="#22d3ee" className="w-20 h-20" /></div>
                                <p className="text-xs font-bold text-white truncate relative z-10">{pair.track1.name}</p>
                                <p className="text-[10px] text-cyan-400 truncate mb-3 relative z-10">{pair.track1.artist}</p>
                                <div className="flex gap-2 relative z-10">
                                    <span className="text-[9px] font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded">{pair.track1.bpm}</span>
                                    <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/50 px-2 py-1 rounded">{pair.track1.key}</span>
                                </div>
                                <button onClick={() => onSelectTrack(pair.track1)} className="mt-3 w-full py-2 bg-cyan-600/20 text-cyan-400 text-[9px] font-bold rounded hover:bg-cyan-600 hover:text-white transition-colors uppercase tracking-widest relative z-10">Load Deck</button>
                            </div>

                            {/* Center Logic */}
                            <div className="flex flex-col items-center justify-center gap-2">
                                 <div className="w-12 h-12 rounded-full border-2 border-purple-500/50 bg-black flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                    <GitMergeIcon className="w-5 h-5 text-purple-400" />
                                 </div>
                                 <div className="h-10 w-px bg-gradient-to-b from-purple-500/50 to-transparent"></div>
                            </div>

                            {/* Track B */}
                            <div className="bg-black/40 rounded-xl p-4 border border-pink-500/10 hover:border-pink-500/40 transition-colors relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><RadarChart data={getMetrics(pair.track2)} color="#ec4899" className="w-20 h-20" /></div>
                                <p className="text-xs font-bold text-white truncate relative z-10">{pair.track2.name}</p>
                                <p className="text-[10px] text-pink-400 truncate mb-3 relative z-10">{pair.track2.artist}</p>
                                <div className="flex gap-2 relative z-10">
                                    <span className="text-[9px] font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded">{pair.track2.bpm}</span>
                                    <span className="text-[9px] font-mono font-bold text-pink-300 bg-pink-950/50 px-2 py-1 rounded">{pair.track2.key}</span>
                                </div>
                                <button onClick={() => onAddToQueue(pair.track2)} className="mt-3 w-full py-2 bg-pink-600/20 text-pink-400 text-[9px] font-bold rounded hover:bg-pink-600 hover:text-white transition-colors uppercase tracking-widest relative z-10">+ Queue</button>
                            </div>
                        </div>
                        
                        <div className="mt-6 text-center">
                            <p className="text-[11px] text-purple-200/80 italic bg-purple-900/10 px-4 py-2 rounded-xl inline-block border border-purple-500/20 max-w-md">
                                "{pair.reason}"
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
