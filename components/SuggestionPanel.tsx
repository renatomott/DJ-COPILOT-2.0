
import React, { useEffect, useState } from 'react';
import type { Track, Suggestion } from '../types';
import { getTrackSuggestions } from '../services/geminiService';
import { Loader } from './Loader';
import { SuggestionItem } from './SuggestionItem';
import { BrainIcon } from './icons';

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

  const handleDismiss = (trackId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== trackId));
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!currentTrack) return;
      setIsLoading(true);
      setError(null);
      try {
        const { suggestions: result, cuePoints } = await getTrackSuggestions(currentTrack, playlist);
        setSuggestions(result);
        // Inject cue points into the current track object for the NowPlaying component to see
        if (cuePoints && cuePoints.length > 0) {
            currentTrack.cuePoints = cuePoints;
        }
      } catch (err) {
        console.error(err);
        setError('Falha ao obter sugestões inteligentes.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [currentTrack, playlist, setSuggestions]);

  return (
    <div className="my-6 p-4 bg-gray-900 rounded-2xl border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <BrainIcon className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-bold text-gray-200">Próximas Faixas Sugeridas</h3>
      </div>
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-10 opacity-60">
          <Loader />
          <p className="mt-3 text-sm font-medium animate-pulse">A IA está analisando sua biblioteca...</p>
        </div>
      )}
      
      {error && (
        <div className="text-red-400 text-center py-6 bg-red-900/10 rounded-xl border border-red-900/20">
            <p className="text-sm">{error}</p>
        </div>
      )}
      
      {!isLoading && !error && suggestions.length === 0 && (
        <p className="text-gray-500 text-center py-8 italic border-2 border-dashed border-gray-800 rounded-xl">Nenhuma sugestão encontrada.</p>
      )}
      
      {!isLoading && !error && suggestions.length > 0 && (
        <div className="space-y-3">
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
