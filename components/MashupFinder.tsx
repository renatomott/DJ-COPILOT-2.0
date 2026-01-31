
import React, { useState, useEffect } from 'react';
import type { Track, MashupPair } from '../types';
import { getMashupPairs } from '../services/geminiService';
import { GitMergeIcon, RefreshCwIcon, PlayIcon, PlusIcon } from './icons';
import { SkeletonLoader } from './SkeletonLoader';
import { RadarChart } from './RadarChart';

interface MashupFinderProps {
  playlist: Track[];
  onSelectTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  language: 'pt-BR' | 'en-US';
}

export const MashupFinder: React.FC<MashupFinderProps> = ({ playlist, onSelectTrack, onAddToQueue, language }) => {
  const [mashups, setMashups] = useState<MashupPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMashups = async () => {
    setIsLoading(true);
    try {
        const pairs = await getMashupPairs(playlist);
        setMashups(pairs);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mashups.length === 0) loadMashups();
  }, []);

  // Helper to generate fake metrics for the Radar Chart (since we don't have real danceability/popularity yet)
  // In a real app, this would come from the API/Enrichment
  const getMetrics = (track: Track) => [
      { label: 'Energy', value: (track.energy || 3) * 20 },
      { label: 'BPM', value: Math.min(parseFloat(track.bpm) / 1.8, 100) }, // Norm approx
      { label: 'Pop', value: track.playCount > 10 ? 90 : 40 },
      { label: 'Vibe', value: Math.random() * 60 + 40 }
  ];

  return (
    <div className="pb-24 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-6 px-1">
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

        {isLoading && (
            <div className="space-y-4">
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="card" />
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
  );
};
