
import React, { useState, useEffect } from 'react';
import type { Track, MashupPair } from '../types';
import { getMashupPairs } from '../services/geminiService';
import { GitMergeIcon, RefreshCwIcon, PlayIcon, PlusIcon } from './icons';
import { SkeletonLoader } from './SkeletonLoader';

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
                    {/* Visual Intersection Effect */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl translate-x-10 translate-y-10"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                             <div className="w-12 h-12 rounded-full border-2 border-cyan-500 bg-slate-800 flex items-center justify-center font-bold text-[10px] text-cyan-300 z-10 shadow-lg">
                                {pair.track1.bpm}
                             </div>
                             <div className="flex-1 h-px bg-gradient-to-r from-cyan-500 to-pink-500 mx-[-10px]"></div>
                             <div className="w-16 h-16 rounded-full border-2 border-white/20 bg-black/40 backdrop-blur flex flex-col items-center justify-center z-20 mx-[-20px] shadow-2xl">
                                <span className="text-[8px] font-bold text-white/60 uppercase">COMPAT</span>
                                <GitMergeIcon className="w-4 h-4 text-purple-400" />
                             </div>
                             <div className="flex-1 h-px bg-gradient-to-r from-purple-500 to-pink-500 mx-[-10px]"></div>
                             <div className="w-12 h-12 rounded-full border-2 border-pink-500 bg-slate-800 flex items-center justify-center font-bold text-[10px] text-pink-300 z-10 shadow-lg">
                                {pair.track2.key}
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Track A */}
                            <div className="bg-black/40 rounded-xl p-3 border border-cyan-500/10 hover:border-cyan-500/40 transition-colors">
                                <p className="text-xs font-bold text-white truncate">{pair.track1.name}</p>
                                <p className="text-[10px] text-cyan-400 truncate mb-2">{pair.track1.artist}</p>
                                <button onClick={() => onSelectTrack(pair.track1)} className="w-full py-1.5 bg-cyan-600/20 text-cyan-400 text-[9px] font-bold rounded hover:bg-cyan-600 hover:text-white transition-colors">LOAD DECK</button>
                            </div>
                             {/* Track B */}
                            <div className="bg-black/40 rounded-xl p-3 border border-pink-500/10 hover:border-pink-500/40 transition-colors">
                                <p className="text-xs font-bold text-white truncate">{pair.track2.name}</p>
                                <p className="text-[10px] text-pink-400 truncate mb-2">{pair.track2.artist}</p>
                                <button onClick={() => onAddToQueue(pair.track2)} className="w-full py-1.5 bg-pink-600/20 text-pink-400 text-[9px] font-bold rounded hover:bg-pink-600 hover:text-white transition-colors">+ QUEUE</button>
                            </div>
                        </div>
                        
                        <div className="mt-4 text-center">
                            <p className="text-[10px] text-purple-300 italic bg-purple-900/20 px-3 py-1 rounded-full inline-block border border-purple-500/20">
                                "{pair.reason}"
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
