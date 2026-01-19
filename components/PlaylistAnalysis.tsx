
import React, { useMemo, useState } from 'react';
import type { Track } from '../types';
import { BarChartIcon, ChevronDownIcon } from './icons';

interface PlaylistAnalysisProps {
  playlist: Track[];
}

const getPlaylistStats = (playlist: Track[]) => {
  if (!playlist || playlist.length === 0) {
    return { avgBpm: '0', commonKeys: [], genreDistribution: [] };
  }

  const totalBpm = playlist.reduce((acc, track) => acc + parseFloat(track.bpm), 0);
  const avgBpm = (totalBpm / playlist.length).toFixed(2);

  const keyCounts = playlist.reduce((acc, track) => {
    acc[track.key] = (acc[track.key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const commonKeys = Object.entries(keyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);

  const genreCounts = playlist.reduce((acc, track) => {
    const genre = track.genre || 'Unknown';
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalTracks = playlist.length;
  const genreDistribution = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre, count]) => ({
      genre,
      percentage: ((count / totalTracks) * 100).toFixed(0),
    }));

  return { avgBpm, commonKeys, genreDistribution };
};

export const PlaylistAnalysis: React.FC<PlaylistAnalysisProps> = ({ playlist }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const stats = useMemo(() => getPlaylistStats(playlist), [playlist]);

    return (
        <div className="my-4 bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden transition-all duration-200 shadow-md">
            <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider">
                    <BarChartIcon className="w-4 h-4 text-blue-400" />
                    Análise da Playlist
                </h3>
                <ChevronDownIcon 
                    className={`w-5 h-5 text-white transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                />
            </div>

            {isExpanded && (
                <div className="p-4 pt-0 border-t border-gray-800/50 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div className="md:col-span-1 space-y-4">
                            <div>
                                <p className="text-[0.65rem] font-black text-white opacity-60 uppercase tracking-widest mb-1">BPM Médio</p>
                                <p className="text-2xl font-black font-mono text-white">{stats.avgBpm}</p>
                            </div>
                             <div>
                                <p className="text-[0.65rem] font-black text-white opacity-60 uppercase tracking-widest mb-1">Tons Dominantes</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {stats.commonKeys.map(key => (
                                        <span key={key} className="px-3 py-1 bg-gray-800 border border-gray-600 text-xs font-mono font-black rounded-lg text-white">{key}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                             <p className="text-[0.65rem] font-black text-white opacity-60 uppercase tracking-widest mb-3">Distribuição por Gênero</p>
                             <div className="space-y-3">
                                {stats.genreDistribution.map(({ genre, percentage }) => (
                                    <div key={genre} className="flex items-center gap-3 text-sm">
                                        <span className="w-2/5 truncate text-white font-bold" title={genre}>{genre}</span>
                                        <div className="w-3/5 bg-black rounded-full h-2.5 border border-gray-800">
                                            <div className="bg-blue-600 h-2.5 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <span className="w-10 text-right font-mono text-xs text-white font-black">{percentage}%</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
