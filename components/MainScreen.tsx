
// DJ Copilot 2.0 - Main Screen Component
// Deep integration with Gemini API for playlist analysis and track discovery

import React, { useState, useCallback, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { Header } from './Header';
import { NowPlaying } from './NowPlaying';
import { SuggestionPanel } from './SuggestionPanel';
import { TrackItem } from './TrackItem';
import { TrackListItem } from './TrackListItem';
import { CameraIcon, WandSparklesIcon, ZapIcon, SearchIcon, ActivityIcon, BrainIcon, SettingsIcon, FolderIcon, HomeIcon, ListIcon, PieChartIcon, LabIcon, PlaylistIcon, UploadIcon, RefreshCwIcon, ImageIcon, XIcon, TrashIcon, MusicIcon, ListPlusIcon, ContrastIcon, LayersIcon, GlobeIcon } from './icons';
import { identifyTrackFromImage, getSemanticSearch, getMashupPairs, getGapAnalysis } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { Loader } from './Loader';
import { SkeletonLoader } from './SkeletonLoader';
import { PlaylistAnalysis } from './PlaylistAnalysis';
import { LibraryFilters, FilterState } from './LibraryFilters';
import { SetBuilder } from './SetBuilder';
import { EnergyBar } from './EnergyBar';
import { translations } from '../utils/translations';
import type { Track, Suggestion, MashupPair } from '../types';

interface MainScreenProps {
  playlist: Track[];
  onReset: () => void;
  onEnrich: () => void;
  onUpdateLibrary: (file: File) => void;
  isEnriching: boolean;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  currentTrack: Track | null;
  setCurrentTrack: React.Dispatch<React.SetStateAction<Track | null>>;
  suggestions: Suggestion[];
  setSuggestions: React.Dispatch<React.SetStateAction<Suggestion[]>>;
  autoEnrichEnabled: boolean;
  onAutoEnrichChange: (enabled: boolean) => void;
  isHighContrast: boolean;
  onHighContrastChange: (enabled: boolean) => void;
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  language: 'pt-BR' | 'en-US';
  setLanguage: (lang: 'pt-BR' | 'en-US') => void;
}

type Tab = 'deck' | 'library' | 'tools' | 'builder' | 'settings';
type ToolsSubTab = 'gaps' | 'mashups';
type ViewMode = 'card' | 'list';

const HIDDEN_PLAYLISTS_KEY = 'dj_copilot_hidden_playlists';
const LIBRARY_VIEW_MODE_KEY = 'dj_copilot_library_view_mode';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

// Haptic Helper
const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
    }
};

// Helper to check duration > 60s
const isTrackValidDuration = (durationStr: string): boolean => {
    if (!durationStr) return false;
    const parts = durationStr.split(':');
    let seconds = 0;
    if (parts.length === 2) {
        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
        seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return seconds >= 60;
};

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={() => { triggerHaptic(); onClick(); }}
    className={`flex flex-col items-center justify-center w-full h-full min-h-[50px] transition-all duration-200 relative ${
      active ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-600/10 -translate-y-1' : ''}`}>
      {icon}
    </div>
    <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${active ? 'opacity-100' : 'opacity-60'}`}>
      {label}
    </span>
  </button>
);

export const MainScreen: React.FC<MainScreenProps> = ({ 
    playlist, 
    onReset, 
    onEnrich, 
    onUpdateLibrary, 
    isEnriching, 
    fontScale, 
    onFontScaleChange,
    currentTrack,
    setCurrentTrack,
    suggestions,
    setSuggestions,
    autoEnrichEnabled,
    onAutoEnrichChange,
    isHighContrast,
    onHighContrastChange,
    queue,
    setQueue,
    language,
    setLanguage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mashupPairs, setMashupPairs] = useState<MashupPair[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<string[]>([]);
  const [isLoadingGaps, setIsLoadingGaps] = useState(false);
  const [isLoadingMashups, setIsLoadingMashups] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('deck');
  const [toolsSubTab, setToolsSubTab] = useState<ToolsSubTab>('gaps');
  const [libraryViewMode, setLibraryViewMode] = useState<ViewMode>('card');
  const [hiddenPlaylists, setHiddenPlaylists] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    minBpm: '',
    maxBpm: '',
    keys: [],
    genres: []
  });

  const t = translations[language];

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const libraryUpdateRef = useRef<HTMLInputElement>(null);

  // Carrega configurações da persistência (Playlists e Modo de Visualização)
  useEffect(() => {
    const savedHidden = localStorage.getItem(HIDDEN_PLAYLISTS_KEY);
    if (savedHidden) {
      try {
        setHiddenPlaylists(JSON.parse(savedHidden));
      } catch (e) {
        console.error("Erro ao carregar playlists ocultas", e);
      }
    }

    const savedViewMode = localStorage.getItem(LIBRARY_VIEW_MODE_KEY);
    if (savedViewMode === 'card' || savedViewMode === 'list') {
        setLibraryViewMode(savedViewMode as ViewMode);
    }
  }, []);

  // Salva configurações ao mudar
  useEffect(() => {
    localStorage.setItem(HIDDEN_PLAYLISTS_KEY, JSON.stringify(hiddenPlaylists));
  }, [hiddenPlaylists]);

  useEffect(() => {
    localStorage.setItem(LIBRARY_VIEW_MODE_KEY, libraryViewMode);
  }, [libraryViewMode]);

  const togglePlaylistVisibility = (name: string) => {
    setHiddenPlaylists(prev => 
      prev.includes(name) 
        ? prev.filter(p => p !== name) 
        : [...prev, name]
    );
  };

  // Filter out tracks shorter than 1 minute for all active logic
  const validTracks = useMemo(() => {
    return playlist.filter(t => isTrackValidDuration(t.duration));
  }, [playlist]);

  // Only show playlists that contain valid tracks (> 1 min)
  const allPlaylistNames = useMemo(() => {
    const names = new Set<string>();
    validTracks.forEach(t => names.add(t.location || 'Sem Playlist'));
    return Array.from(names).sort();
  }, [validTracks]);

  const activePlaylist = useMemo(() => {
    return validTracks.filter(t => {
        const folder = t.location || 'Sem Playlist';
        return !hiddenPlaylists.includes(folder);
    });
  }, [validTracks, hiddenPlaylists]);

  const handleSelectTrack = useCallback((track: Track) => {
    triggerHaptic();
    setCurrentTrack(track);
    if (currentTrack?.id !== track.id) {
        setSuggestions([]);
    }
    setActiveTab('deck');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTrack, setCurrentTrack, setSuggestions]);

  const handleAddToQueue = useCallback((e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    triggerHaptic();
    setQueue(prev => [...prev, track]);
  }, [setQueue]);

  const handleSemanticSearch = async () => {
    if (!searchTerm || searchTerm.length < 3) return;
    setIsSearchingSemantic(true);
    triggerHaptic();
    try {
        const results = await getSemanticSearch(searchTerm, activePlaylist);
        if (results.length > 0) {
            handleSelectTrack(results[0]);
            setError(`A IA encontrou ${results.length} faixas.`);
            setTimeout(() => setError(null), 3000);
        } else {
            setError(t.noTracksFound);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsSearchingSemantic(false);
    }
  };

  const handleIdentifyByImage = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsIdentifying(true);
      setShowPhotoOptions(false);
      setError(null);
      try {
        const base64Image = await fileToBase64(file);
        const { title, artist } = await identifyTrackFromImage(base64Image);
        if (title && artist) {
          const foundTrack = playlist.find(
            (track) =>
              track.name.toLowerCase().includes(title.toLowerCase()) ||
              track.artist.toLowerCase().includes(artist.toLowerCase())
          );
          if (foundTrack) {
            handleSelectTrack(foundTrack);
            setError(`${t.trackFound} ${foundTrack.name}`);
            setTimeout(() => setError(null), 4000);
          } else {
            setError(t.trackNotFound);
          }
        } else {
          setError(t.errorIdentify);
        }
      } catch (err) {
        setError(t.errorIdentify);
      } finally {
        setIsIdentifying(false);
      }
    }
  };

  const filteredPlaylist = useMemo(() => {
    let result = activePlaylist;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
            (track) =>
                track.name.toLowerCase().includes(term) ||
                track.artist.toLowerCase().includes(term) ||
                (track.genre && track.genre.toLowerCase().includes(term))
        );
    }

    result = result.filter(track => {
        const trackBpm = parseFloat(track.bpm);
        if (filters.minBpm && !isNaN(parseFloat(filters.minBpm))) {
            if (trackBpm < parseFloat(filters.minBpm)) return false;
        }
        if (filters.maxBpm && !isNaN(parseFloat(filters.maxBpm))) {
             if (trackBpm > parseFloat(filters.maxBpm)) return false;
        }
        if (filters.keys.length > 0 && !filters.keys.includes(track.key)) {
            return false;
        }
        if (filters.genres.length > 0 && !filters.genres.includes(track.genre)) {
            return false;
        }
        return true;
    });

    return result;
  }, [activePlaylist, searchTerm, filters]);

  const groupedPlaylist = useMemo(() => {
      const groups: Record<string, Track[]> = {};
      filteredPlaylist.forEach(track => {
          const folder = track.location || 'Sem Playlist';
          if (!groups[folder]) groups[folder] = [];
          groups[folder].push(track);
      });
      return groups;
  }, [filteredPlaylist]);

  const { availableKeys, availableGenres } = useMemo(() => {
      const keys = new Set<string>();
      const genres = new Set<string>();
      activePlaylist.forEach(t => {
          if (t.key) keys.add(t.key);
          if (t.genre) genres.add(t.genre);
      });
      return {
          availableKeys: Array.from(keys).sort(),
          availableGenres: Array.from(genres).sort()
      };
  }, [activePlaylist]);

  const handleFetchGaps = async () => {
      setIsLoadingGaps(true);
      try {
          const result = await getGapAnalysis(activePlaylist);
          setGapAnalysis(result);
      } catch (e) {
          setError(t.errorGaps);
      } finally {
          setIsLoadingGaps(false);
      }
  };

  const handleFetchMashups = async () => {
      setIsLoadingMashups(true);
      try {
          const result = await getMashupPairs(activePlaylist);
          setMashupPairs(result);
      } catch (e) {
          setError(t.errorMashups);
      } finally {
          setIsLoadingMashups(false);
      }
  };

  const highContrastClass = isHighContrast ? 'high-contrast-mode' : '';

  return (
    <div className={`min-h-screen bg-black text-white overflow-x-hidden ${highContrastClass}`}>
      <style>{`
        .high-contrast-mode {
            --tw-bg-opacity: 1;
            background-color: #000000;
        }
        .high-contrast-mode * {
            border-color: #ffffff !important;
            color: #ffffff !important;
            text-shadow: none !important;
            background-image: none !important;
        }
        .high-contrast-mode .bg-blue-600, .high-contrast-mode .text-blue-400 {
            background-color: #333333 !important;
            color: #ffffff !important;
            text-decoration: underline;
        }
        .high-contrast-mode img {
            filter: grayscale(100%) contrast(150%);
        }
      `}</style>

      <Header onReset={onReset} />
      
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleIdentifyByImage} />
      <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleIdentifyByImage} />
      <input type="file" ref={libraryUpdateRef} className="hidden" accept=".xml" onChange={(e) => e.target.files && onUpdateLibrary(e.target.files[0])} />

      <main className="pt-20 pb-40 px-4 max-w-4xl mx-auto">
        {error && (
            <div className="my-4 p-4 bg-gray-900 border-l-4 border-yellow-500 text-white rounded-r-xl text-xs flex justify-between items-center animate-in fade-in slide-in-from-top-2 shadow-lg">
                <span className="font-black">{error}</span>
                <button onClick={() => setError(null)} className="text-white hover:text-red-400 p-2 font-black min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
            </div>
        )}
        
        {(isIdentifying || isEnriching) && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] backdrop-blur-md">
            <Loader />
            <p className="mt-6 text-sm font-black text-white uppercase tracking-widest text-center px-6">
                {isIdentifying ? t.analyzing : t.analyzing}
            </p>
          </div>
        )}

        {activeTab === 'deck' && (
            <div className="space-y-6">
                <div className="flex justify-end mb-1">
                    <button 
                        onClick={() => setShowPhotoOptions(true)} 
                        className="text-[0.7rem] font-black flex items-center gap-2 text-white hover:text-blue-400 transition-all bg-blue-600/20 px-4 py-3 rounded-full border border-blue-500/30 hover:bg-blue-600/40 active:scale-95 shadow-lg shadow-blue-500/10 min-h-[44px]"
                    >
                        <CameraIcon className="w-4 h-4" />
                        {t.identifyBtn}
                    </button>
                </div>

                {currentTrack ? (
                    <>
                        <NowPlaying track={currentTrack} language={language} />
                        <SuggestionPanel 
                            currentTrack={currentTrack} 
                            playlist={activePlaylist} 
                            suggestions={suggestions} 
                            setSuggestions={setSuggestions} 
                            onSelectTrack={handleSelectTrack}
                            onAddToQueue={(track) => {
                                setQueue(prev => [...prev, track]);
                                triggerHaptic();
                            }}
                            language={language}
                        />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/10">
                        <div className="bg-gray-800 p-6 rounded-full mb-6 ring-8 ring-gray-900 shadow-2xl">
                            <MusicIcon className="w-10 h-10 text-white opacity-40" />
                        </div>
                        <h2 className="text-lg font-black text-white mb-2 uppercase tracking-widest">{t.deckEmptyTitle}</h2>
                        <p className="text-sm text-white/40 mb-8 max-w-xs">{t.deckEmptyMsg}</p>
                        <button onClick={() => setActiveTab('library')} className="bg-white text-black font-black text-sm py-4 px-10 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl hover:bg-gray-200 active:scale-95 min-h-[50px]">
                            <ListIcon className="w-4 h-4" />
                            {t.openLib}
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* ... Library and Tools tabs code remains same as before ... */}
        {activeTab === 'library' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 no-scrollbar">
                     <button onClick={onEnrich} disabled={isEnriching} className="whitespace-nowrap flex items-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-[10px] font-black hover:border-blue-500 transition-colors text-white uppercase tracking-widest shadow-md min-h-[44px]">
                        <ZapIcon className="w-3.5 h-3.5 text-yellow-400" />
                        {t.enrichBtn}
                    </button>
                    
                    <div className="flex items-center bg-gray-900/60 p-1 rounded-xl border border-gray-800 shadow-sm">
                        <button 
                            onClick={() => setLibraryViewMode('card')}
                            className={`p-3 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${libraryViewMode === 'card' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setLibraryViewMode('list')}
                            className={`p-3 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${libraryViewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-white'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative group sticky top-[4.5rem] z-20 space-y-3">
                    <div className="relative">
                         <input
                            type="text"
                            placeholder={t.searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                            className="w-full p-4 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-base font-bold text-white pl-10 shadow-xl placeholder:text-gray-500 min-h-[50px]"
                        />
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                        <button onClick={handleSemanticSearch} disabled={isSearchingSemantic || !searchTerm} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-500 transition-colors shadow-lg min-h-[40px] min-w-[40px] flex items-center justify-center">
                            {isSearchingSemantic ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <WandSparklesIcon className="w-4 h-4" />}
                        </button>
                    </div>
                    <LibraryFilters initialFilters={filters} onFilterChange={setFilters} availableKeys={availableKeys} availableGenres={availableGenres} />
                </div>
                
                <PlaylistAnalysis playlist={activePlaylist} />

                <div className="space-y-6 pb-20">
                    {isSearchingSemantic ? (
                        <div className="space-y-4 pt-4">
                            <p className="text-center text-xs font-black text-blue-400 uppercase tracking-widest animate-pulse">
                                {t.analyzingVibes}
                            </p>
                            {[...Array(6)].map((_, i) => (
                                <SkeletonLoader key={i} variant={libraryViewMode} />
                            ))}
                        </div>
                    ) : (
                        Object.entries(groupedPlaylist).map(([folder, tracks]) => (
                            <div key={folder} className="space-y-0.5">
                                <div className="sticky top-[11.5rem] bg-black/95 backdrop-blur py-3 px-1 z-10 border-b border-gray-700/50 flex items-center justify-between pr-2 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <PlaylistIcon className="w-4 h-4 text-blue-400" />
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] truncate max-w-[60vw]">{folder}</h3>
                                    </div>
                                    <span className="text-[10px] text-blue-400 font-mono font-black bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">{tracks.length}</span>
                                </div>

                                {libraryViewMode === 'list' && (
                                    <div className="hidden md:grid md:grid-cols-[1fr_90px_50px_50px_60px_75px] gap-2 px-3 py-2.5 border-b border-gray-800 text-[8px] font-black text-white/30 uppercase tracking-[0.15em] bg-white/5 sticky top-[14.5rem] z-[9]">
                                        <div>Nome / Artista</div>
                                        <div>Gênero</div>
                                        <div className="text-center">BPM</div>
                                        <div className="text-center">Tom</div>
                                        <div className="text-center">Time</div>
                                        <div className="text-right pr-1">Rating</div>
                                    </div>
                                )}

                                <div className={`grid ${libraryViewMode === 'card' ? 'grid-cols-1 gap-2 pt-2' : 'grid-cols-1 border-x border-gray-800/20'}`}>
                                    {tracks.map((track) => (
                                        libraryViewMode === 'card' ? (
                                            <TrackItem key={track.id} track={track} onSelect={handleSelectTrack} isSelected={currentTrack?.id === track.id} onAddToQueue={handleAddToQueue} />
                                        ) : (
                                            <TrackListItem key={track.id} track={track} onSelect={handleSelectTrack} isSelected={currentTrack?.id === track.id} />
                                        )
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                    
                    {!isSearchingSemantic && filteredPlaylist.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <p className="text-sm font-bold">{t.noTracksFound}</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* COMBINED TOOLS TAB */}
        {activeTab === 'tools' && (
            <div className="space-y-6 pb-20">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-gray-800 rounded-2xl border border-gray-600 shadow-inner">
                        <LayersIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">{t.advancedTools}</h2>
                        <p className="text-xs text-white opacity-60 font-mono uppercase tracking-[0.2em]">{t.aiInsights}</p>
                    </div>
                </div>

                {/* Sub Tabs */}
                <div className="flex p-1 bg-gray-900 rounded-xl border border-gray-800">
                    <button 
                        onClick={() => setToolsSubTab('gaps')} 
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all min-h-[44px] ${toolsSubTab === 'gaps' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        {t.tabGaps}
                    </button>
                    <button 
                        onClick={() => setToolsSubTab('mashups')} 
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all min-h-[44px] ${toolsSubTab === 'mashups' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        {t.tabMashups}
                    </button>
                </div>

                {toolsSubTab === 'gaps' && (
                     <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 min-h-[300px] flex flex-col items-center justify-center shadow-2xl">
                        {isLoadingGaps ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader />
                                <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">{t.calcGaps}</p>
                            </div>
                        ) : (gapAnalysis as string[]) && (gapAnalysis as string[]).length > 0 ? (
                            <div className="w-full space-y-4">
                                {(gapAnalysis as string[]).map((gap, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-black/40 rounded-2xl border border-white/5 animate-in slide-in-from-left-2 shadow-sm" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm text-white font-bold leading-relaxed">{gap}</p>
                                    </div>
                                ))}
                                <button onClick={handleFetchGaps} className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-gray-800 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-gray-700 hover:bg-gray-700 transition-all min-h-[50px]">
                                    <RefreshCwIcon className="w-4 h-4" /> {t.recalc}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <button 
                                    onClick={handleFetchGaps}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2 mx-auto scale-110 active:scale-100 min-h-[50px]"
                                >
                                    <ZapIcon className="w-5 h-5" />
                                    {t.analyzeGaps}
                                </button>
                                <p className="text-[10px] text-white/50 mt-6 font-black uppercase tracking-widest">{t.analyzeGapsSub}</p>
                            </div>
                        )}
                    </div>
                )}

                {toolsSubTab === 'mashups' && (
                    <div className="bg-gray-900/60 rounded-3xl p-6 border border-gray-800 min-h-[300px] flex flex-col items-center justify-center shadow-2xl">
                        {isLoadingMashups ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader />
                                <p className="text-sm font-black text-white uppercase tracking-widest animate-pulse">{t.calcMashups}</p>
                            </div>
                        ) : (mashupPairs as MashupPair[]) && (mashupPairs as MashupPair[]).length > 0 ? (
                            <div className="w-full space-y-4">
                                {(mashupPairs as MashupPair[]).map((pair, i) => (
                                    <div key={i} className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4 animate-in slide-in-from-bottom-2 shadow-sm" style={{ animationDelay: `${i * 100}ms` }}>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 overflow-hidden" onClick={() => handleSelectTrack(pair.track1)}>
                                                <p className="text-[0.6rem] font-black text-blue-400 uppercase tracking-widest mb-1">Track A</p>
                                                <p className="text-sm font-black text-white truncate hover:text-blue-400 transition-colors cursor-pointer">{pair.track1.name}</p>
                                            </div>
                                            <div className="text-white/20 font-black text-xl">+</div>
                                            <div className="flex-1 text-right overflow-hidden" onClick={() => handleSelectTrack(pair.track2)}>
                                                <p className="text-[0.6rem] font-black text-purple-400 uppercase tracking-widest mb-1">Track B</p>
                                                <p className="text-sm font-black text-white truncate hover:text-purple-400 transition-colors cursor-pointer">{pair.track2.name}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-white font-bold leading-relaxed italic opacity-80">
                                            "{pair.reason}"
                                        </div>
                                    </div>
                                ))}
                                <button onClick={handleFetchMashups} className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-gray-800 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-gray-700 hover:bg-gray-700 transition-all min-h-[50px]">
                                    <RefreshCwIcon className="w-4 h-4" /> {t.findMashups}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <button 
                                    onClick={handleFetchMashups}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-black px-6 py-4 rounded-2xl transition-all shadow-xl flex items-center gap-2 mx-auto scale-110 active:scale-100 min-h-[50px]"
                                >
                                    <BrainIcon className="w-5 h-5" />
                                    {t.discoverMashups}
                                </button>
                                <p className="text-[10px] text-white/50 mt-6 font-black uppercase tracking-widest">{t.discoverMashupsSub}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* SET BUILDER TAB */}
        {activeTab === 'builder' && (
            <SetBuilder 
                queue={queue} 
                setQueue={setQueue} 
                onSelectTrack={handleSelectTrack} 
                currentTrackId={currentTrack?.id}
                language={language}
            />
        )}

        {activeTab === 'settings' && (
            <div className="space-y-6 pb-20">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-gray-800 rounded-2xl border border-gray-600 shadow-inner">
                        <SettingsIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white">{t.settingsTitle}</h2>
                    </div>
                </div>

                {/* AUTOMATION SECTION */}
                <section className="bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/20">
                        <ZapIcon className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{t.automationTitle}</h3>
                    </div>
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer group min-h-[60px]"
                        onClick={() => onAutoEnrichChange(!autoEnrichEnabled)}
                    >
                         <div className="pr-4">
                            <span className="text-sm font-bold text-white block group-hover:text-blue-400 transition-colors">{t.autoEnrichTitle}</span>
                            <span className="text-[10px] text-white/50 block font-medium leading-tight mt-1">
                                {t.autoEnrichDesc}
                            </span>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex-shrink-0 ${autoEnrichEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${autoEnrichEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                </section>

                {/* LANGUAGE SECTION - OPTIMIZED BUTTONS */}
                <section className="bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/20">
                        <GlobeIcon className="w-4 h-4 text-white" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{t.langTitle}</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => setLanguage('pt-BR')}
                            className={`p-4 rounded-xl border flex flex-row items-center justify-center gap-3 transition-all min-h-[60px] ${language === 'pt-BR' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                        >
                            <span className="text-2xl">🇧🇷</span>
                            <span className="text-sm font-black uppercase">Português</span>
                        </button>
                        <button 
                            onClick={() => setLanguage('en-US')}
                            className={`p-4 rounded-xl border flex flex-row items-center justify-center gap-3 transition-all min-h-[60px] ${language === 'en-US' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                        >
                            <span className="text-2xl">🇺🇸</span>
                            <span className="text-sm font-black uppercase">English</span>
                        </button>
                    </div>
                </section>

                {/* ACCESSIBILITY SECTION */}
                <section className="bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/20">
                        <ContrastIcon className="w-4 h-4 text-white" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{t.accessTitle}</h3>
                    </div>
                    <div 
                        className="p-4 flex items-center justify-between cursor-pointer group min-h-[60px]"
                        onClick={() => onHighContrastChange(!isHighContrast)}
                    >
                         <div className="pr-4">
                            <span className="text-sm font-bold text-white block group-hover:text-blue-400 transition-colors">{t.highContrastTitle}</span>
                            <span className="text-[10px] text-white/50 block font-medium leading-tight mt-1">
                                {t.highContrastDesc}
                            </span>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex-shrink-0 ${isHighContrast ? 'bg-white' : 'bg-gray-700'}`}>
                            <div className={`w-4 h-4 rounded-full bg-black shadow-md transform transition-transform duration-300 ${isHighContrast ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>
                    
                    <div className="p-4 pt-0 border-t border-gray-800 mt-2 pt-3">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-black text-white uppercase tracking-wider">{t.fontSize}</span>
                            <span className="text-sm font-black text-blue-400 font-mono bg-blue-400/10 px-2 py-0.5 rounded">{fontScale}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="80" 
                            max="140" 
                            step="5"
                            value={fontScale}
                            onChange={(e) => onFontScaleChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-800 rounded-full appearance-none accent-blue-600 mb-2 cursor-pointer min-h-[30px]"
                        />
                        <div className="flex justify-between text-[8px] font-black text-white/30 uppercase tracking-tighter mt-1">
                            <span>{t.compact}</span>
                            <span>{t.standard} (100%)</span>
                            <span>{t.large}</span>
                        </div>
                    </div>
                </section>

                {/* VISIBILIDADE DE PLAYLISTS */}
                <section className="bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/20">
                        <PlaylistIcon className="w-4 h-4 text-blue-400" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{t.filterPlaylists}</h3>
                    </div>
                    <div className="p-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        <p className="text-[0.6rem] font-black text-white/40 uppercase tracking-widest mb-3">{t.filterPlaylistsDesc}</p>
                        {allPlaylistNames.length > 0 ? allPlaylistNames.map(name => {
                            const isVisible = !hiddenPlaylists.includes(name);
                            return (
                                <label key={name} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer min-h-[50px] ${isVisible ? 'bg-blue-600/10 border-blue-500/30' : 'bg-black/40 border-white/5 opacity-50 grayscale'}`}>
                                    <div className="flex items-center gap-3">
                                        <FolderIcon className={`w-4 h-4 ${isVisible ? 'text-blue-400' : 'text-gray-600'}`} />
                                        <span className={`text-sm font-bold ${isVisible ? 'text-white' : 'text-gray-500'}`}>{name}</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={isVisible} 
                                        onChange={() => togglePlaylistVisibility(name)}
                                        className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                    />
                                </label>
                            );
                        }) : (
                            <p className="text-xs text-white/40 italic text-center py-4">{t.noTracksFound}</p>
                        )}
                    </div>
                </section>

                <section className="bg-gray-900/60 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 bg-gray-800/20">
                        <TrashIcon className="w-4 h-4 text-red-500" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">{t.criticalMgmt}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                         <button onClick={() => libraryUpdateRef.current?.click()} className="w-full flex items-center gap-3 p-4 bg-black border border-gray-700 rounded-xl hover:border-blue-500 transition-all text-left group min-h-[60px]">
                            <UploadIcon className="w-5 h-5 text-white group-hover:text-blue-400" />
                            <div>
                                <p className="text-sm font-black text-white">{t.updateDb}</p>
                                <p className="text-[9px] text-white opacity-40 uppercase font-black tracking-wider">{t.updateDbSub}</p>
                            </div>
                        </button>
                        <button onClick={onReset} className="w-full flex items-center gap-3 p-4 bg-red-900/10 border border-red-500/30 rounded-xl hover:bg-red-900/20 transition-all text-left min-h-[60px]">
                            <TrashIcon className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="text-sm font-black text-red-500">{t.clearAll}</p>
                                <p className="text-[9px] text-red-500 opacity-60 uppercase font-black tracking-wider">{t.clearAllSub}</p>
                            </div>
                        </button>
                    </div>
                </section>
            </div>
        )}
      </main>

      {/* MINI PLAYER / QUEUE BUTTON */}
      {queue.length > 0 && activeTab !== 'builder' && (
          <div className="fixed bottom-20 left-4 right-4 z-50">
             <button 
                onClick={() => setActiveTab('builder')}
                className="w-full bg-blue-600/95 backdrop-blur-md text-white rounded-xl p-3 shadow-[0_5px_20px_rgba(37,99,235,0.4)] border border-blue-400/30 flex items-center justify-between min-h-[60px]"
             >
                <div className="flex items-center gap-3">
                    <div className="bg-black/30 p-2 rounded-lg">
                        <ListPlusIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{t.nextInQueue}</p>
                        <p className="text-sm font-bold truncate max-w-[200px]">{queue[queue.length - 1].name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 pr-2">
                     <span className="bg-black/20 px-2 py-1 rounded-md text-xs font-black font-mono">{queue.length}</span>
                </div>
             </button>
          </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-gray-800 z-[80] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex justify-around items-center h-16 max-w-4xl mx-auto px-2">
            <NavButton active={activeTab === 'deck'} onClick={() => setActiveTab('deck')} icon={<HomeIcon className="w-5 h-5" />} label={t.navDeck} />
            <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<ListIcon className="w-5 h-5" />} label={t.navLib} />
            <NavButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<LayersIcon className="w-5 h-5" />} label={t.navTools} />
            <NavButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<ListPlusIcon className="w-5 h-5" />} label={t.navBuilder} />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon className="w-5 h-5" />} label={t.navSetup} />
        </div>
      </nav>

      {/* Modal de Opções de Foto */}
      {showPhotoOptions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4" onClick={() => setShowPhotoOptions(false)}>
            <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-10 shadow-[0_0_60px_rgba(0,0,0,0.7)]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
                    <h3 className="text-base font-black text-white uppercase tracking-widest">{t.identifyPhoto}</h3>
                    <button onClick={() => setShowPhotoOptions(false)} className="text-white hover:text-red-400 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 grid grid-cols-1 gap-3 bg-gray-900">
                    <button 
                        onClick={() => cameraInputRef.current?.click()} 
                        className="w-full flex items-center gap-4 p-5 hover:bg-blue-600/20 bg-black/40 border border-white/5 rounded-2xl transition-all group min-h-[80px]"
                    >
                        <div className="p-3 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/30"><CameraIcon className="w-7 h-7 text-white" /></div>
                        <div className="text-left">
                            <span className="font-black text-white block text-sm">{t.takePhoto}</span>
                            <span className="text-[9px] text-white opacity-40 uppercase font-black tracking-widest">{t.openCamera}</span>
                        </div>
                    </button>
                    <button 
                        onClick={() => galleryInputRef.current?.click()} 
                        className="w-full flex items-center gap-4 p-5 hover:bg-purple-600/20 bg-black/40 border border-white/5 rounded-2xl transition-all group min-h-[80px]"
                    >
                        <div className="p-3 bg-purple-600 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-600/30"><ImageIcon className="w-7 h-7 text-white" /></div>
                        <div className="text-left">
                            <span className="font-black text-white block text-sm">{t.chooseGallery}</span>
                            <span className="text-[9px] text-white opacity-40 uppercase font-black tracking-widest">{t.openPhotos}</span>
                        </div>
                    </button>
                </div>
                <div className="p-5 bg-black/40 text-center border-t border-gray-800">
                    <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.15em] leading-relaxed">
                        {t.photoInstructions}
                    </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
