
import React from 'react';
import type { Track } from '../types';
import { TrackItem } from './TrackItem';
import { TrashIcon, ArrowUpIcon, SaveIcon, DownloadIcon } from './icons';
import { translations } from '../utils/translations';

interface SetBuilderProps {
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  onSelectTrack: (track: Track) => void;
  currentTrackId: string | undefined;
  language: 'pt-BR' | 'en-US';
}

export const SetBuilder: React.FC<SetBuilderProps> = ({ queue, setQueue, onSelectTrack, currentTrackId, language }) => {
  const t = translations[language];
  
  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    if (window.confirm(t.resetConfirm)) {
      setQueue([]);
    }
  };

  const exportPlaylist = () => {
    if (queue.length === 0) return;
    const m3uContent = "#EXTM3U\n" + queue.map(t => `#EXTINF:${parseInt(t.duration) || 0},${t.artist} - ${t.name}\n${t.location}`).join('\n');
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dj_copilot_set.m3u';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 opacity-60">
        <div className="bg-gray-800 p-6 rounded-full mb-6 ring-8 ring-gray-900 shadow-xl">
           <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <h3 className="text-xl font-black text-white mb-2">{t.emptyBuilder}</h3>
        <p className="text-sm text-gray-400 max-w-xs">
          {t.emptyBuilderSub}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-black text-white">{t.yourSet} ({queue.length})</h2>
        <div className="flex gap-2">
            <button onClick={handleClear} className="p-2 bg-gray-800 rounded-lg text-red-400 hover:bg-gray-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center">
                <TrashIcon className="w-4 h-4" />
            </button>
            <button onClick={exportPlaylist} className="px-3 py-2 bg-blue-600 rounded-lg text-white font-black text-xs flex items-center gap-2 hover:bg-blue-500 transition-colors shadow-lg min-h-[40px]">
                <span className="hidden xs:inline">{t.exportM3u}</span>
                <span className="xs:hidden">.M3U</span>
            </button>
        </div>
      </div>

      <div className="space-y-3">
        {queue.map((track, index) => {
            // Calculate mix compatibility with previous track
            let transitionInfo = null;
            if (index > 0) {
                const prev = queue[index-1];
                const bpmDiff = (parseFloat(track.bpm) - parseFloat(prev.bpm)).toFixed(1);
                transitionInfo = (
                    <div className="flex justify-center items-center py-2 relative">
                         <div className="h-8 w-px bg-gray-800 absolute top-[-1rem]"></div>
                         <div className="bg-black border border-gray-800 rounded-full px-3 py-1 text-[10px] font-mono font-black text-gray-500 flex gap-2">
                            <span>{prev.key} → {track.key}</span>
                            <span className={parseFloat(bpmDiff) > 3 || parseFloat(bpmDiff) < -3 ? 'text-red-500' : 'text-green-500'}>
                                {parseFloat(bpmDiff) > 0 ? '+' : ''}{bpmDiff} BPM
                            </span>
                         </div>
                    </div>
                );
            }

            return (
                <div key={`${track.id}-${index}`}>
                    {transitionInfo}
                    <div className="relative group">
                         <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 text-gray-600 font-black text-xs w-6 text-center">
                            {index + 1}
                         </div>
                         <div className="pl-4">
                            <TrackItem 
                                track={track} 
                                onSelect={onSelectTrack} 
                                isSelected={currentTrackId === track.id}
                            />
                            <button 
                                onClick={(e) => handleRemove(e, index)}
                                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-900/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center"
                            >
                                <TrashIcon className="w-3 h-3" />
                            </button>
                         </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
