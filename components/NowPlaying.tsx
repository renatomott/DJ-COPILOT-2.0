
import React, { useState } from 'react';
import type { Track } from '../types';
import { ClockIcon, PlayIcon, StarIcon, ImageIcon, ZapIcon, FolderIcon, TagIcon, ChevronDownIcon, PlaylistIcon } from './icons';
import { generateVisuals } from '../services/geminiService';
import { CoverArt } from './CoverArt';

const renderRating = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<StarIcon key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400' : 'text-gray-700'}`} filled={i <= rating} />);
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

interface NowPlayingProps {
  track: Track;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ track }) => {
  const [visual, setVisual] = useState<string | null>(track.visualUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerateVisual = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGenerating(true);
    const url = await generateVisuals(track);
    if (url) setVisual(url);
    setIsGenerating(false);
  }

  return (
    <div className="mb-6 bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative transition-all duration-300">
      
      {/* Background Visual Layer */}
      {visual && (
        <div className="absolute inset-0 z-0">
            <img src={visual} className="w-full h-full object-cover opacity-30 blur-sm" alt="Background" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40"></div>
        </div>
      )}

      {/* Main Container - Toggle click here */}
      <div 
        className="relative z-10 p-5 cursor-pointer active:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col sm:flex-row gap-5">
            {/* Cover Art Section */}
            <div className="relative group flex-shrink-0 mx-auto sm:mx-0 w-32 h-32 sm:w-40 sm:h-40">
                <CoverArt 
                    id={track.id}
                    artist={track.artist}
                    name={track.name}
                    className="w-full h-full rounded-xl shadow-lg border border-gray-700"
                    priority={true}
                />
                
                {/* Play Count Badge Overlay */}
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-gray-600 z-10">
                    <PlayIcon className="w-3 h-3" />
                    {track.playCount}
                </div>

                {isExpanded && !visual && (
                    <button 
                        onClick={handleGenerateVisual}
                        disabled={isGenerating}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl z-20"
                    >
                        {isGenerating ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <ImageIcon className="w-8 h-8 text-white" />}
                    </button>
                )}
            </div>

            {/* Track Details Section */}
            <div className="flex-1 flex flex-col justify-center text-center sm:text-left">
                <div className="flex justify-between items-start w-full mb-1">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">On Deck</span>
                    <div className="flex items-center gap-2">
                        {/* BPM Badge */}
                        <div className="bg-gray-800 text-white text-sm font-mono font-bold px-2 py-1 rounded border border-gray-700">
                            {track.bpm} BPM
                        </div>
                        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white leading-tight mb-1">{track.name}</h2>
                <p className="text-gray-400 font-medium text-sm mb-3">{track.artist}</p>

                {/* Meta Grid - Visible when collapsed or expanded */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-300 mb-3">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 bg-gray-800/40 px-2 py-1 rounded">
                        <span className="font-bold text-white">{track.key}</span>
                        <span className="text-gray-500">Tom</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 bg-gray-800/40 px-2 py-1 rounded">
                        <ClockIcon className="w-3 h-3 text-gray-500" />
                        <span>{track.duration}</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 bg-gray-800/40 px-2 py-1 rounded col-span-2 sm:col-span-1">
                        {renderRating(track.rating)}
                    </div>
                     <div className="flex items-center justify-center sm:justify-start gap-1.5 bg-gray-800/40 px-2 py-1 rounded col-span-2 sm:col-span-1 truncate" title={track.genre}>
                        <TagIcon className="w-3 h-3 text-gray-500" />
                        <span className="truncate">{track.genre || 'N/A'}</span>
                    </div>
                </div>

                {/* Playlist / Location */}
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500 bg-black/20 p-1.5 rounded border border-white/5">
                    <PlaylistIcon className="w-3 h-3 flex-shrink-0" />
                    {track.color && (
                        <span 
                            className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: track.color }}
                        />
                    )}
                    <span className="truncate max-w-[200px] sm:max-w-xs">{track.location}</span>
                </div>
            </div>
        </div>

        {/* Hot Cues Section - ONLY VISIBLE WHEN EXPANDED */}
        {isExpanded && track.cuePoints && track.cuePoints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800 animate-in slide-in-from-top-2">
                <p className="text-[10px] uppercase font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                    <ZapIcon className="w-3.5 h-3.5 text-yellow-500" />
                    Sugestões de Hot Cues (IA)
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {track.cuePoints.map((cp, i) => (
                        <div key={i} className="flex flex-col bg-gray-800/60 border border-gray-700/50 rounded-md px-3 py-1.5 min-w-[80px] text-center">
                            <span className="text-[10px] text-gray-500 font-mono uppercase">Cue {i + 1}</span>
                            <span className="text-xs font-bold text-gray-200">{cp}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
