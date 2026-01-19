
import React, { useMemo } from 'react';
import type { Track } from '../types';
import { BarChartIcon } from './icons';

interface PlaylistAnalysisProps {
  playlist: Track[];
}

const getPlaylistStats = (playlist: Track[]) => {
  if (!playlist || playlist.length === 0) {
    return { avgBpm: '0', commonKeys: [], genreDistribution: [] };
  }

  // Average BPM
  const totalBpm = playlist.reduce((acc, track) => acc + parseFloat(track.bpm), 0);
  const avgBpm = (totalBpm / playlist.length).toFixed(2);

  // Common Keys
  const keyCounts = playlist.reduce((acc, track) => {
    acc[track.key] = (acc[track.key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const commonKeys = Object.entries(keyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => key);

  // Genre Distribution
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
    const stats = useMemo(() => getPlaylistStats(playlist), [playlist]);

    return (
        <div className="my-6 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <BarChartIcon className="w-5 h-5" />
                Análise da Playlist
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stats */}
                <div className="md:col-span-1 space-y-3">
                    <div>
                        <p className="text-xs text-gray-400">BPM Médio</p>
                        <p className="text-xl font-bold font-mono text-white">{stats.avgBpm}</p>
                    </div>
                     <div>
                        <p className="text-xs text-gray-400">Tons Comuns</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {stats.commonKeys.map(key => (
                                <span key={key} className="px-2 py-0.5 bg-gray-700 text-sm font-mono rounded">{key}</span>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Genre Distribution */}
                <div className="md:col-span-2">
                     <p className="text-xs text-gray-400 mb-2">Distribuição de Gêneros</p>
                     <div className="space-y-2">
                        {stats.genreDistribution.map(({ genre, percentage }) => (
                            <div key={genre} className="flex items-center gap-2 text-sm">
                                <span className="w-2/5 truncate" title={genre}>{genre}</span>
                                <div className="w-3/5 bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                                <span className="w-8 text-right font-mono text-xs text-gray-400">{percentage}%</span>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};