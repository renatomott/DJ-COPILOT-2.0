
import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Track, Suggestion } from '../types';
import { getTrackSuggestions } from '../services/geminiService';
import { Loader } from './Loader';
import { SuggestionItem } from './SuggestionItem';
import { BrainIcon, RefreshCwIcon, PlusIcon, ZapIcon } from './icons';
import { SkeletonLoader } from './SkeletonLoader';
import { translations } from '../utils/translations';

interface SuggestionPanelProps {
  currentTrack: Track;
  playlist: Track[];
  suggestions: Suggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>;
  onSelectTrack: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  language: 'pt-BR' | 'en-US';
}

const LAST_ID_KEY = 'dj_copilot_last_suggestion_id';

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ currentTrack, playlist, suggestions, setSuggestions, onSelectTrack, onAddToQueue, language }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false); // Default OFF to save credits
  
  const t = translations[language];
  const isFetching = useRef(false);
  
  // Initialize with value from storage to persist across unmounts (tab switches)
  const lastTrackId = useRef<string | null>(
      typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_ID_KEY) : null
  );

  const handleDismiss = (trackId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== trackId));
    if (expandedId === trackId) setExpandedId(null);
  };

  const loadSuggestions = useCallback(async (force: boolean = false) => {
    if (!currentTrack) return;
    
    // Check if the current suggestions match the current track
    const trackChanged = lastTrackId.current !== currentTrack.id;
    
    // PERSISTENCE LOGIC:
    // If not forced, track hasn't changed, and we have data, keep existing suggestions.
    if (!force && !trackChanged && suggestions.length > 0) {
      return;
    }

    if (isFetching.current) return;

    setIsLoading(true);
    setError(null);
    isFetching.current = true;
    
    // Update reference immediately to prevent double fetches
    if (trackChanged || force) {
        if (trackChanged) {
            setSuggestions([]); // Clear old suggestions visually
            setExpandedId(null);
        }
        lastTrackId.current = currentTrack.id;
        localStorage.setItem(LAST_ID_KEY, currentTrack.id);
    }

    try {
      const { suggestions: result, cuePoints } = await getTrackSuggestions(currentTrack, playlist, [], language);
      
      setSuggestions(result);
      
      // Injeta pontos de cue sugeridos pela IA no objeto da faixa atual
      if (cuePoints && cuePoints.length > 0) {
          currentTrack.cuePoints = cuePoints;
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao obter sugestões inteligentes.');
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [currentTrack, playlist, suggestions.length, setSuggestions, language]);

  const handleLoadMore = async () => {
      if (isLoadingMore || isLoading) return;
      setIsLoadingMore(true);
      
      try {
          // Pass existing IDs to exclude them from new results
          const excludeIds = suggestions.map(s => s.id);
          const { suggestions: newSuggestions } = await getTrackSuggestions(currentTrack, playlist, excludeIds, language);
          
          if (newSuggestions.length === 0) {
             // Optional: Handle "no more results" state
          } else {
             setSuggestions(prev => [...prev, ...newSuggestions]);
          }
      } catch (err) {
          console.error("Error loading more suggestions", err);
      } finally {
          setIsLoadingMore(false);
      }
  };

  // Logic to handle Track Changes based on AutoMode
  useEffect(() => {
    if (!currentTrack?.id) return;

    const trackChanged = lastTrackId.current !== currentTrack.id;

    if (trackChanged) {
        // Always update the ref so we know we are on a new track
        lastTrackId.current = currentTrack.id;
        localStorage.setItem(LAST_ID_KEY, currentTrack.id);

        if (autoMode) {
            // Auto: Fetch immediately
            loadSuggestions(true);
        } else {
            // Manual: Clear previous suggestions to avoid confusion (showing suggestions for prev track)
            setSuggestions([]);
            setExpandedId(null);
        }
    }
  }, [currentTrack?.id, autoMode, loadSuggestions, setSuggestions]); 

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    loadSuggestions(true);
  };

  const toggleExpand = (id: string) => {
      setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="mt-1 mb-6 p-3 bg-gray-900 rounded-2xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BrainIcon className={`w-5 h-5 ${autoMode ? 'text-green-400' : 'text-slate-500'}`} />
          <h3 className="text-lg font-bold text-gray-200">{t.nextTracks}</h3>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Auto Toggle */}
            <div className="flex items-center gap-2 mr-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${autoMode ? 'text-green-400' : 'text-slate-500'}`}>
                    Auto
                </span>
                <button
                    onClick={() => setAutoMode(!autoMode)}
                    className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${autoMode ? 'bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm ${autoMode ? 'right-0.5' : 'left-0.5'}`} />
                </button>
            </div>

            <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-all text-xs font-semibold group min-h-[36px]"
                title="Pedir novas sugestões à IA"
            >
                <RefreshCwIcon className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? t.analyzing : t.recalculate}
            </button>
        </div>
      </div>
      
      {isLoading && suggestions.length === 0 && (
        <div className="flex flex-col gap-2">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="card" />
        </div>
      )}
      
      {error && (
        <div className="text-red-400 text-center py-6 bg-red-900/10 rounded-xl border border-red-900/20">
            <p className="text-sm">{error}</p>
        </div>
      )}
      
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="py-10 px-4 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-3">
                {autoMode ? t.noSuggestions : "Modo Manual"}
            </p>
            {!autoMode && (
                <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
                >
                    <BrainIcon className="w-4 h-4" />
                    Gerar Sugestões
                </button>
            )}
        </div>
      )}
      
      {/* Mostramos as sugestões antigas enquanto carrega as novas se for um refresh */}
      {(suggestions.length > 0) && (
        <>
            <div className={`space-y-3 transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              {suggestions.map((suggestion) => (
                <SuggestionItem 
                  key={suggestion.id}
                  suggestion={suggestion}
                  currentTrack={currentTrack}
                  onSelect={onSelectTrack}
                  onDismiss={handleDismiss}
                  onAddToQueue={onAddToQueue}
                  language={language}
                  isExpanded={expandedId === suggestion.id}
                  onToggleExpand={() => toggleExpand(suggestion.id)}
                />
              ))}
            </div>

            <button 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full mt-4 py-4 bg-gray-800/50 hover:bg-gray-800 text-blue-400 font-black text-xs uppercase tracking-widest rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 min-h-[50px]"
            >
                {isLoadingMore ? (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <PlusIcon className="w-4 h-4" />
                )}
                {t.loadMore}
            </button>
        </>
      )}
    </div>
  );
};
