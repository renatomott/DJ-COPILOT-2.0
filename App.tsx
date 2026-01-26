
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploadScreen } from './components/FileUploadScreen';
import { MainScreen } from './components/MainScreen';
import { parseRekordboxXml } from './services/xmlParser';
import { enrichPlaylistData } from './services/geminiService';
import type { Track, Suggestion, ViewMode, GroupingMode } from './types';

const STORAGE_KEY = 'dj_copilot_playlist_v2';
const CURRENT_TRACK_KEY = 'dj_copilot_current_track';
const SUGGESTIONS_KEY = 'dj_copilot_suggestions';
const FONT_SCALE_KEY = 'dj_copilot_font_scale';
const AUTO_ENRICH_KEY = 'dj_copilot_auto_enrich';
const HIGH_CONTRAST_KEY = 'dj_copilot_high_contrast';
const SET_QUEUE_KEY = 'dj_copilot_set_queue';
const LANGUAGE_KEY = 'dj_copilot_language';
const ENABLED_DIRS_KEY = 'dj_copilot_enabled_dirs';
const VIEW_MODE_KEY = 'dj_copilot_view_mode';
const GROUPING_MODE_KEY = 'dj_copilot_grouping_mode';

const App: React.FC = () => {
  const [playlist, setPlaylist] = useState<Track[] | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [fontScale, setFontScale] = useState<number>(100);
  const [autoEnrichEnabled, setAutoEnrichEnabled] = useState<boolean>(true);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [setQueue, setSetQueue] = useState<Track[]>([]);
  const [language, setLanguage] = useState<'pt-BR' | 'en-US'>('pt-BR');
  const [enabledDirectories, setEnabledDirectories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('folder');

  useEffect(() => {
    // Load Playlist safely
    const savedPlaylist = localStorage.getItem(STORAGE_KEY);
    if (savedPlaylist) {
      try {
        const parsed = JSON.parse(savedPlaylist);
        if (Array.isArray(parsed)) {
            setPlaylist(parsed);
        } else {
            console.error("Saved playlist is not an array");
            localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Erro ao carregar playlist salva:", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const savedCurrent = localStorage.getItem(CURRENT_TRACK_KEY);
    if (savedCurrent) { try { setCurrentTrack(JSON.parse(savedCurrent)); } catch (e) {} }

    const savedSuggestions = localStorage.getItem(SUGGESTIONS_KEY);
    if (savedSuggestions) { try { setSuggestions(JSON.parse(savedSuggestions)); } catch (e) {} }

    const savedScale = localStorage.getItem(FONT_SCALE_KEY);
    if (savedScale) setFontScale(parseInt(savedScale, 10) || 100);

    const savedAutoEnrich = localStorage.getItem(AUTO_ENRICH_KEY);
    if (savedAutoEnrich) setAutoEnrichEnabled(JSON.parse(savedAutoEnrich));

    const savedHighContrast = localStorage.getItem(HIGH_CONTRAST_KEY);
    if (savedHighContrast) setIsHighContrast(JSON.parse(savedHighContrast));

    const savedQueue = localStorage.getItem(SET_QUEUE_KEY);
    if (savedQueue) { try { setSetQueue(JSON.parse(savedQueue)); } catch(e) {} }

    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage === 'en-US' || savedLanguage === 'pt-BR') {
        setLanguage(savedLanguage as 'pt-BR' | 'en-US');
    }

    const savedDirs = localStorage.getItem(ENABLED_DIRS_KEY);
    if (savedDirs) setEnabledDirectories(JSON.parse(savedDirs));

    const savedView = localStorage.getItem(VIEW_MODE_KEY);
    if (savedView === 'card' || savedView === 'list') setViewMode(savedView);

    const savedGroup = localStorage.getItem(GROUPING_MODE_KEY);
    if (savedGroup === 'all' || savedGroup === 'folder') setGroupingMode(savedGroup);

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    if (playlist) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
        // Initialize dirs if empty and playlist exists
        if (enabledDirectories.length === 0 && playlist.length > 0) {
            const uniqueDirs = Array.from(new Set(playlist.map(t => t.location)));
            setEnabledDirectories(uniqueDirs);
        }
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }

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
    localStorage.setItem(ENABLED_DIRS_KEY, JSON.stringify(enabledDirectories));
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
    localStorage.setItem(GROUPING_MODE_KEY, groupingMode);

  }, [playlist, currentTrack, suggestions, fontScale, autoEnrichEnabled, isHighContrast, setQueue, language, enabledDirectories, viewMode, groupingMode, isInitialized]);

  const performEnrichment = useCallback(async (tracksToEnrich: Track[]) => {
    setIsEnriching(true);
    setError(null);
    try {
        const enrichedTracks = await enrichPlaylistData(tracksToEnrich);
        if (!enrichedTracks) throw new Error("API returned no data");
        
        const enrichedMap = new Map(enrichedTracks.map(t => [t.id, t]));
        const updatedPlaylist = tracksToEnrich.map(originalTrack => {
            const enriched = enrichedMap.get(originalTrack.id);
            if (enriched) return { ...originalTrack, ...enriched };
            return originalTrack;
        });
        setPlaylist(updatedPlaylist);
    } catch (err) {
        setError("Falha ao enriquecer a playlist com a IA.");
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
            setError('Não foi possível encontrar nenhuma faixa no arquivo XML.');
            setIsLoading(false);
          } else {
            setPlaylist(parsedTracks);
            const uniqueDirs = Array.from(new Set(parsedTracks.map(t => t.location)));
            setEnabledDirectories(uniqueDirs);
            setIsLoading(false);
            if (autoEnrichEnabled) performEnrichment(parsedTracks);
          }
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Erro ao analisar XML.');
      setIsLoading(false);
    }
  }, [autoEnrichEnabled, performEnrichment]);

  const handleReset = useCallback(() => {
    if (window.confirm("Isso removerá a playlist atual. Deseja continuar?")) {
      setPlaylist(null);
      setCurrentTrack(null);
      setSuggestions([]);
      setSetQueue([]);
      setEnabledDirectories([]);
      localStorage.clear();
      window.location.reload();
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
            enabledDirectories={enabledDirectories}
            setEnabledDirectories={setEnabledDirectories}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            groupingMode={groupingMode}
            onGroupingModeChange={setGroupingMode}
         />;
};

export default App;
