
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploadScreen } from './components/FileUploadScreen';
import { MainScreen } from './components/MainScreen';
import { parseRekordboxXml } from './services/xmlParser';
import { enrichPlaylistData } from './services/geminiService';
import type { Track } from './types';

const STORAGE_KEY = 'dj_copilot_playlist_v2';

const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedPlaylist = localStorage.getItem(STORAGE_KEY);
    if (savedPlaylist) {
      try {
        setPlaylist(JSON.parse(savedPlaylist));
      } catch (e) {
        console.error("Erro ao carregar playlist salva:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever playlist changes
  useEffect(() => {
    if (isInitialized) {
      if (playlist) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [playlist, isInitialized]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlString = e.target?.result as string;
        if (xmlString) {
          const parsedTracks = parseRekordboxXml(xmlString);
          if (parsedTracks.length === 0) {
            setError('Não foi possível encontrar nenhuma faixa no arquivo XML. Por favor, verifique o formato do arquivo.');
          } else {
            setPlaylist(parsedTracks);
          }
        } else {
          setError('Não foi possível ler o arquivo.');
        }
        setIsLoading(false);
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
  }, []);

  const handleEnrichPlaylist = useCallback(async () => {
    if (!playlist) return;
    setIsEnriching(true);
    setError(null);
    try {
        const enrichedTracks = await enrichPlaylistData(playlist);
        const enrichedMap = new Map(enrichedTracks.map(t => [t.id, t]));
        const updatedPlaylist = playlist.map(originalTrack => {
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
  }, [playlist]);

  const handleReset = useCallback(() => {
    if (window.confirm("Isso removerá a playlist atual e todo o histórico. Deseja continuar?")) {
      setPlaylist(null);
      setError(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Don't render anything until we check localStorage
  if (!isInitialized) return null;

  if (!playlist) {
    return <FileUploadScreen onFileUpload={handleFileUpload} error={error} isLoading={isLoading} />;
  }

  return <MainScreen 
            playlist={playlist} 
            onReset={handleReset}
            onEnrich={handleEnrichPlaylist}
            isEnriching={isEnriching}
         />;
};

export default App;
