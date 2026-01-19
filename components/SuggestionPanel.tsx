
import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Track, Suggestion } from '../types';
import { getTrackSuggestions } from '../services/geminiService';
import { Loader } from './Loader';
import { SuggestionItem } from './SuggestionItem';
import { BrainIcon, RefreshCwIcon } from './icons';

interface SuggestionPanelProps {
  currentTrack: Track;
  playlist: Track[];
  suggestions: Suggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>;
  onSelectTrack: (track: Track) => void;
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ currentTrack, playlist, suggestions, setSuggestions, onSelectTrack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Referência para evitar disparos duplicados em renders rápidos
  const isFetching = useRef(false);

  const handleDismiss = (trackId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== trackId));
  };

  const loadSuggestions = useCallback(async (force: boolean = false) => {
    if (!currentTrack) return;
    
    // Se já temos sugestões e não foi um refresh forçado, não faça nada
    if (!force && suggestions.length > 0) {
      return;
    }

    if (isFetching.current) return;

    setIsLoading(true);
    setError(null);
    isFetching.current = true;

    try {
      const { suggestions: result, cuePoints } = await getTrackSuggestions(currentTrack, playlist);
      
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
  }, [currentTrack, playlist, suggestions.length, setSuggestions]);

  useEffect(() => {
    loadSuggestions();
  }, [currentTrack.id, loadSuggestions]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    loadSuggestions(true);
  };

  return (
    <div className="my-6 p-4 bg-gray-900 rounded-2xl border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BrainIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-gray-200">Próximas Faixas Sugeridas</h3>
        </div>
        
        <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition-all text-xs font-semibold group"
          title="Pedir novas sugestões à IA"
        >
          <RefreshCwIcon className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 duration-500 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Analisando...' : 'Recalcular'}
        </button>
      </div>
      
      {isLoading && suggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 opacity-60">
          <Loader />
          <p className="mt-3 text-sm font-medium animate-pulse text-gray-300">A IA está analisando sua biblioteca...</p>
        </div>
      )}
      
      {error && (
        <div className="text-red-400 text-center py-6 bg-red-900/10 rounded-xl border border-red-900/20">
            <p className="text-sm">{error}</p>
        </div>
      )}
      
      {!isLoading && !error && suggestions.length === 0 && (
        <p className="text-gray-400 text-center py-8 italic border-2 border-dashed border-gray-800 rounded-xl text-sm">Nenhuma sugestão encontrada.</p>
      )}
      
      {/* Mostramos as sugestões antigas enquanto carrega as novas se for um refresh */}
      {(suggestions.length > 0) && (
        <div className={`space-y-3 transition-opacity duration-300 ${isLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {suggestions.map((suggestion) => (
            <SuggestionItem 
              key={suggestion.id}
              suggestion={suggestion}
              currentTrack={currentTrack}
              onSelect={onSelectTrack}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
};
