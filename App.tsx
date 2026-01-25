
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploadScreen } from './components/FileUploadScreen';
import { MainScreen } from './components/MainScreen';
import { parseRekordboxXml } from './services/xmlParser';
import { enrichPlaylistData } from './services/geminiService';
import type { Track, Suggestion } from './types';

const STORAGE_KEY = 'dj_copilot_playlist_v2';
const CURRENT_TRACK_KEY = 'dj_copilot_current_track';
const SUGGESTIONS_KEY = 'dj_copilot_suggestions';
const FONT_SCALE_KEY = 'dj_copilot_font_scale';
const AUTO_ENRICH_KEY = 'dj_copilot_auto_enrich';
const HIGH_CONTRAST_KEY = 'dj_copilot_high_contrast';
const SET_QUEUE_KEY = 'dj_copilot_set_queue';
const LANGUAGE_KEY = 'dj_copilot_language';

const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[] | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [fontScale, setFontScale] = useState<number>(100);
  const [autoEnrichEnabled, setAutoEnrichEnabled] = useState<boolean>(true); // Default True
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [setQueue, setSetQueue] = useState<Track[]>([]);
  const [language, setLanguage] = useState<'pt-BR' | 'en-US'>('pt-BR');

  // Load from localStorage on mount
  useEffect(() => {
    // Load Playlist
    const savedPlaylist = localStorage.getItem(STORAGE_KEY);
    if (savedPlaylist) {
      try {
        setPlaylist(JSON.parse(savedPlaylist));
      } catch (e) {
        console.error("Erro ao carregar playlist salva:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Load Current Track
    const savedCurrent = localStorage.getItem(CURRENT_TRACK_KEY);
    if (savedCurrent) {
      try {
        setCurrentTrack(JSON.parse(savedCurrent));
      } catch (e) {
        console.error("Erro ao carregar faixa atual:", e);
      }
    }

    // Load Suggestions
    const savedSuggestions = localStorage.getItem(SUGGESTIONS_KEY);
    if (savedSuggestions) {
      try {
        setSuggestions(JSON.parse(savedSuggestions));
      } catch (e) {
        console.error("Erro ao carregar sugestões:", e);
      }
    }

    // Load Font Scale
    const savedScale = localStorage.getItem(FONT_SCALE_KEY);
    if (savedScale) {
        const scale = parseInt(savedScale, 10);
        if (!isNaN(scale)) setFontScale(scale);
    }

    // Load Auto Enrich Setting
    const savedAutoEnrich = localStorage.getItem(AUTO_ENRICH_KEY);
    if (savedAutoEnrich) {
      setAutoEnrichEnabled(JSON.parse(savedAutoEnrich));
    } else {
      // Ensure default persistence if never set
      localStorage.setItem(AUTO_ENRICH_KEY, 'true');
    }

    // Load High Contrast
    const savedHighContrast = localStorage.getItem(HIGH_CONTRAST_KEY);
    if (savedHighContrast) {
        setIsHighContrast(JSON.parse(savedHighContrast));
    }

    // Load Set Queue
    const savedQueue = localStorage.getItem(SET_QUEUE_KEY);
    if (savedQueue) {
        try {
            setSetQueue(JSON.parse(savedQueue));
        } catch(e) { console.error(e); }
    }

    // Load Language
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage === 'en-US' || savedLanguage === 'pt-BR') {
        setLanguage(savedLanguage as 'pt-BR' | 'en-US');
    }

    setIsInitialized(true);
  }, []);

  // Persist states to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    if (playlist) localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
    else localStorage.removeItem(STORAGE_KEY);

    if (currentTrack) localStorage.setItem(CURRENT_TRACK_KEY, JSON.stringify(currentTrack));
    else localStorage.removeItem(CURRENT_TRACK_KEY);

    if (suggestions.length > 0) localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
    else localStorage.removeItem(SUGGESTIONS_KEY);

    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem(FONT_SCALE_KEY, fontScale.toString());

    localStorage.setItem(AUTO_ENRICH_KEY, JSON.stringify(autoEnrichEnabled));
    localStorage.setItem(HIGH_CONTRAST_KEY, JSON.stringify(isHighContrast));
    localStorage.setItem(SET_QUEUE_KEY, JSON.stringify(setQueue));
    localStorage.setItem(LANGUAGE_KEY, language);

  }, [playlist, currentTrack, suggestions, fontScale, autoEnrichEnabled, isHighContrast, setQueue, language, isInitialized]);

  // Handle Enrich Logic (extracted to be reusable)
  const performEnrichment = useCallback(async (tracksToEnrich: Track[]) => {
    setIsEnriching(true);
    setError(null);
    try {
        const enrichedTracks = await enrichPlaylistData(tracksToEnrich);
        const enrichedMap = new Map(enrichedTracks.map(t => [t.id, t]));
        
        const updatedPlaylist = tracksToEnrich.map(originalTrack => {
            const enriched = enrichedMap.get(originalTrack.id);
            if (enriched) {
                return { ...originalTrack, ...enriched };
            }
            return originalTrack;
        });
        setPlaylist(updatedPlaylist);
    } catch (err) {
        setError("Falha ao enriquecer a playlist com a IA.");
        console.error(err);
    } finally {
        setIsEnriching(false);
    }
  }, []);

  const handleEnrichPlaylist = useCallback(async () => {
    if (!playlist) return;
    await performEnrichment(playlist);
  }, [playlist, performEnrichment]);


  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const xmlString = e.target?.result as string;
        if (xmlString) {
          const parsedTracks = parseRekordboxXml(xmlString);
          if (parsedTracks.length === 0) {
            setError('Não foi possível encontrar nenhuma faixa no arquivo XML. Por favor, verifique o formato do arquivo.');
            setIsLoading(false);
          } else {
            setPlaylist(parsedTracks);
            setIsLoading(false); // Stop loading before potential enrichment starts
            
            // Auto-Enrich Trigger
            if (autoEnrichEnabled) {
               performEnrichment(parsedTracks);
            }
          }
        } else {
          setError('Não foi possível ler o arquivo.');
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Falha ao ler o arquivo.');
        setIsLoading(false);
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Ocorreu um erro ao analisar o arquivo XML.');
      setIsLoading(false);
    }
  }, [autoEnrichEnabled, performEnrichment]);

  const handleReset = useCallback(() => {
    if (window.confirm("Isso removerá a playlist atual e todo o histórico. Deseja continuar?")) {
      setPlaylist(null);
      setCurrentTrack(null);
      setSuggestions([]);
      setSetQueue([]);
      setError(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CURRENT_TRACK_KEY);
      localStorage.removeItem(SUGGESTIONS_KEY);
      localStorage.removeItem(SET_QUEUE_KEY);
    }
  }, []);

  if (!isInitialized) return null;

  if (!playlist) {
    return <FileUploadScreen 
              onFileUpload={handleFileUpload} 
              error={error} 
              isLoading={isLoading} 
              language={language}
              setLanguage={setLanguage}
           />;
  }

  return <MainScreen 
            playlist={playlist} 
            onReset={handleReset}
            onEnrich={handleEnrichPlaylist}
            onUpdateLibrary={handleFileUpload}
            isEnriching={isEnriching}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            currentTrack={currentTrack}
            setCurrentTrack={setCurrentTrack}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            autoEnrichEnabled={autoEnrichEnabled}
            onAutoEnrichChange={setAutoEnrichEnabled}
            isHighContrast={isHighContrast}
            onHighContrastChange={setIsHighContrast}
            queue={setQueue}
            setQueue={setSetQueue}
            language={language}
            setLanguage={setLanguage}
         />;
};

export default App;
