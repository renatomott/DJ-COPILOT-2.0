
import React, { useState, useCallback, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { Header } from './Header';
import { NowPlaying } from './NowPlaying';
import { SuggestionPanel } from './SuggestionPanel';
import { PlaylistGeneratorModal } from './PlaylistGeneratorModal';
import { TrackItem } from './TrackItem';
import { CameraIcon, WandSparklesIcon, ZapIcon, SearchIcon, ActivityIcon, BrainIcon, HistoryIcon, SettingsIcon, CloseIcon, ChevronDownIcon, FolderIcon, HomeIcon, ListIcon, PieChartIcon, LabIcon, GlobeIcon, PlaylistIcon, UploadIcon, RefreshCwIcon, AlertCircleIcon } from './icons';
import { identifyTrackFromImage, getSemanticSearch, getMashupPairs, getGapAnalysis, getSetReport } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { Loader } from './Loader';
import { PlaylistAnalysis } from './PlaylistAnalysis';
import type { Track, Suggestion, MashupPair, SetReport } from '../types';

interface MainScreenProps {
  playlist: Track[];
  onReset: () => void;
  onEnrich: () => void;
  onUpdateLibrary: (file: File) => void;
  isEnriching: boolean;
}

type Tab = 'deck' | 'library' | 'insights' | 'mashups' | 'settings';
type Language = 'pt-BR' | 'en';

const HIDDEN_PLAYLISTS_KEY = 'dj_copilot_hidden_playlists';

export const MainScreen: React.FC<MainScreenProps> = ({ playlist, onReset, onEnrich, onUpdateLibrary, isEnriching }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Track[]>([]);
  const [mashups, setMashups] = useState<MashupPair[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [report, setReport] = useState<SetReport | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('deck');
  
  // Settings State
  const [analyzeSamples, setAnalyzeSamples] = useState(false);
  const [language, setLanguage] = useState<Language>('pt-BR');
  const [hiddenPlaylists, setHiddenPlaylists] = useState<string[]>([]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const libraryUpdateRef = useRef<HTMLInputElement>(null);

  // Load hidden playlists from local storage on mount
  useEffect(() => {
    const savedHidden = localStorage.getItem(HIDDEN_PLAYLISTS_KEY);
    if (savedHidden) {
      try {
        setHiddenPlaylists(JSON.parse(savedHidden));
      } catch (e) {
        console.error("Error loading hidden playlists", e);
      }
    }
  }, []);

  // Save hidden playlists when changed
  useEffect(() => {
    localStorage.setItem(HIDDEN_PLAYLISTS_KEY, JSON.stringify(hiddenPlaylists));
  }, [hiddenPlaylists]);

  // Derived playlist based on settings (Samples & Hidden Playlists)
  const activePlaylist = useMemo(() => {
    return playlist.filter(t => {
        const isSampleFiltered = analyzeSamples ? true : !t.isSample;
        const folder = t.location || 'Sem Playlist';
        const isHidden = hiddenPlaylists.includes(folder);
        return isSampleFiltered && !isHidden;
    });
  }, [playlist, analyzeSamples, hiddenPlaylists]);

  // Extract all unique playlist names from the original full playlist for the settings screen
  const allPlaylistNames = useMemo(() => {
      const names = new Set<string>();
      playlist.forEach(t => names.add(t.location || 'Sem Playlist'));
      return Array.from(names).sort();
  }, [playlist]);

  const handleSelectTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setSuggestions([]);
    setSessionHistory(prev => {
        if (prev.find(t => t.id === track.id)) return prev;
        return [...prev, track];
    });
    setActiveTab('deck'); // Switch to deck when a track is selected
  }, []);

  const handleSemanticSearch = async () => {
    if (!searchTerm || searchTerm.length < 3) return;
    setIsSearchingSemantic(true);
    try {
        const results = await getSemanticSearch(searchTerm, activePlaylist);
        if (results.length > 0) {
            handleSelectTrack(results[0]);
            setError(`A IA encontrou ${results.length} faixas com a vibe "${searchTerm}".`);
            setTimeout(() => setError(null), 3000);
        } else {
            setError("Nenhuma faixa encontrada com essa vibe específica.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsSearchingSemantic(false);
    }
  };

  const handleFetchInsights = async () => {
    if (gaps.length === 0) {
        try {
            const result = await getGapAnalysis(activePlaylist);
            setGaps(result);
        } catch (e) { console.error(e); }
    }
  };

  const handleFetchMashups = async () => {
    if (mashups.length === 0) {
        try {
            const result = await getMashupPairs(activePlaylist);
            setMashups(result);
        } catch (e) { console.error(e); }
    }
  };

  const handleGenerateReport = async () => {
      if (sessionHistory.length < 2) {
          setError(language === 'pt-BR' ? "Toque pelo menos 2 músicas para gerar um relatório." : "Play at least 2 tracks to generate a report.");
          return;
      }
      setIsIdentifying(true); 
      try {
          const res = await getSetReport(sessionHistory);
          setReport(res);
      } catch (e) { console.error(e); }
      finally { setIsIdentifying(false); }
  }

  const handleIdentifyByImage = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsIdentifying(true);
      setError(null);
      try {
        const base64Image = await fileToBase64(file);
        const { title, artist } = await identifyTrackFromImage(base64Image);
        if (title && artist) {
          const foundTrack = activePlaylist.find(
            (track) =>
              track.name.toLowerCase().includes(title.toLowerCase()) ||
              track.artist.toLowerCase().includes(artist.toLowerCase())
          );
          if (foundTrack) {
            handleSelectTrack(foundTrack);
          } else {
            setError(`Faixa "${title}" não encontrada nas playlists ativas.`);
          }
        }
      } catch (err) {
        setError('Erro na identificação por imagem.');
      } finally {
        setIsIdentifying(false);
      }
    }
  };

  const handleUpdateLibraryFile = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          onUpdateLibrary(e.target.files[0]);
      }
  };

  const togglePlaylistVisibility = (playlistName: string) => {
      setHiddenPlaylists(prev => {
          if (prev.includes(playlistName)) {
              return prev.filter(p => p !== playlistName);
          } else {
              return [...prev, playlistName];
          }
      });
  };

  const filteredPlaylist = useMemo(() => {
    if (!searchTerm) return activePlaylist;
    return activePlaylist.filter(
      (track) =>
        track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (track.genre && track.genre.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [activePlaylist, searchTerm]);

  // Group by Playlist (Location folder) for Library View
  const groupedPlaylist = useMemo(() => {
      const groups: Record<string, Track[]> = {};
      filteredPlaylist.forEach(track => {
          const folder = track.location || 'Sem Playlist';
          if (!groups[folder]) groups[folder] = [];
          groups[folder].push(track);
      });
      return groups;
  }, [filteredPlaylist]);

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <Header onReset={onReset} />
      
      {/* Hidden inputs */}
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleIdentifyByImage} />
      <input type="file" ref={libraryUpdateRef} className="hidden" accept=".xml" onChange={handleUpdateLibraryFile} />

      <main className="pt-20 pb-28 px-4 max-w-4xl mx-auto">
        {error && (
            <div className="my-4 p-3 bg-gray-900 border-l-4 border-yellow-500 text-gray-200 rounded-r-lg text-sm flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
        )}
        
        {(isIdentifying || isEnriching) && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-md">
            <Loader />
            <p className="mt-4 text-lg font-medium text-gray-200">
                {isIdentifying 
                    ? (language === 'pt-BR' ? 'IA Analisando CDJ...' : 'AI Analyzing Deck...') 
                    : (language === 'pt-BR' ? 'Enriquecendo Biblioteca...' : 'Enriching Library...')}
            </p>
          </div>
        )}

        {/* --- TAB 1: ON DECK + SUGGESTIONS --- */}
        {activeTab === 'deck' && (
            <div className="space-y-6">
                {currentTrack ? (
                    <>
                         <div className="flex justify-end mb-2">
                             <button 
                                onClick={() => imageInputRef.current?.click()}
                                className="text-xs flex items-center gap-1.5 text-gray-500 hover:text-blue-400 transition-colors bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800"
                             >
                                <CameraIcon className="w-3.5 h-3.5" />
                                {language === 'pt-BR' ? 'Identificar Visualmente' : 'Identify Visually'}
                             </button>
                         </div>
                        <NowPlaying track={currentTrack} />
                        <SuggestionPanel 
                            currentTrack={currentTrack} 
                            playlist={activePlaylist}
                            suggestions={suggestions}
                            setSuggestions={setSuggestions}
                            onSelectTrack={handleSelectTrack}
                        />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/20">
                        <div className="bg-gray-800 p-6 rounded-full mb-6 ring-4 ring-gray-900 shadow-xl">
                            <HomeIcon className="w-12 h-12 text-gray-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">
                            {language === 'pt-BR' ? 'O deck está vazio' : 'Deck is empty'}
                        </h2>
                        <p className="text-gray-400 mb-8 max-w-xs leading-relaxed">
                            {language === 'pt-BR' 
                                ? 'Use a câmera para identificar o que está tocando ou escolha da biblioteca.' 
                                : 'Use camera to identify what\'s playing or select from library.'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                            <button 
                                onClick={() => imageInputRef.current?.click()}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
                            >
                                <CameraIcon className="w-5 h-5" />
                                {language === 'pt-BR' ? 'Usar Câmera' : 'Use Camera'}
                            </button>
                            <button 
                                onClick={() => setActiveTab('library')}
                                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 border border-gray-700"
                            >
                                <ListIcon className="w-5 h-5" />
                                {language === 'pt-BR' ? 'Biblioteca' : 'Library'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- TAB 2: LIBRARY --- */}
        {activeTab === 'library' && (
            <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                     <button onClick={onEnrich} disabled={isEnriching} className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-semibold hover:border-blue-500 hover:text-white transition-colors text-gray-400">
                        <ZapIcon className="w-3.5 h-3.5 text-yellow-500" />
                        {language === 'pt-BR' ? 'Enriquecer c/ IA' : 'Enrich w/ AI'}
                    </button>
                </div>

                <PlaylistAnalysis playlist={activePlaylist} />

                <div className="relative group sticky top-20 z-20">
                    <input
                        type="text"
                        placeholder={language === 'pt-BR' ? "Buscar ou descrever vibe (ex: sunset)..." : "Search or describe vibe..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                        className="w-full p-4 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white pl-12 shadow-lg"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <button 
                        onClick={handleSemanticSearch}
                        disabled={isSearchingSemantic || !searchTerm}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-500 transition-colors shadow-lg"
                    >
                        {isSearchingSemantic ? <Loader /> : <WandSparklesIcon className="w-4 h-4" />}
                    </button>
                </div>

                <div className="space-y-6 pb-20">
                    {Object.entries(groupedPlaylist).map(([folder, tracks]) => {
                        const trackList = tracks as Track[];
                        return (
                            <div key={folder} className="space-y-2">
                                <div className="sticky top-[140px] bg-black/95 backdrop-blur py-2 z-10 border-b border-gray-900 flex items-center gap-2">
                                    <PlaylistIcon className="w-4 h-4 text-gray-500" />
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest truncate">{folder}</h3>
                                    <span className="text-xs text-gray-600 font-mono">({trackList.length})</span>
                                </div>
                                {trackList.map((track) => (
                                    <TrackItem key={track.id} track={track} onSelect={handleSelectTrack} isSelected={currentTrack?.id === track.id} />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- TAB 3: INSIGHTS (GAPS) --- */}
        {activeTab === 'insights' && (
            <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5 text-green-400" />
                        {language === 'pt-BR' ? 'Lacunas na Coleção' : 'Collection Gaps'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                        {language === 'pt-BR' 
                            ? 'A IA analisa sua biblioteca para encontrar oportunidades musicais e buracos no seu repertório.'
                            : 'AI analyzes your library to find musical opportunities you might be missing.'}
                    </p>
                    
                    {gaps.length === 0 ? (
                        <div className="text-center py-4">
                            <button 
                                onClick={handleFetchInsights}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors border border-gray-700"
                            >
                                {language === 'pt-BR' ? 'Analisar Biblioteca' : 'Analyze Gaps'}
                            </button>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {gaps.map((gap, i) => (
                                <li key={i} className="flex items-start gap-3 text-gray-300 bg-black/40 p-4 rounded-lg border border-gray-800/50">
                                    <span className="text-green-500 font-bold mt-0.5">•</span>
                                    <span className="text-sm">{gap}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <HistoryIcon className="w-5 h-5 text-blue-400" />
                            {language === 'pt-BR' ? 'Relatório da Sessão' : 'Session Report'}
                        </h3>
                        <button 
                            onClick={handleGenerateReport} 
                            disabled={sessionHistory.length < 2}
                            className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
                        >
                            {language === 'pt-BR' ? 'Gerar Relatório' : 'Generate'}
                        </button>
                    </div>
                    {report ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                                <p className="text-blue-200 text-sm italic leading-relaxed">"{report.summary}"</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
                                    {language === 'pt-BR' ? 'Destaques' : 'Highlights'}
                                </h4>
                                <ul className="space-y-2">
                                    {report.highlights.map((h, i) => (
                                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                            <span className="text-blue-500 mt-1">✓</span>
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
                                    {language === 'pt-BR' ? 'Evolução de Energia' : 'Vibe Progression'}
                                </h4>
                                <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-gray-800">{report.vibeProgression}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-800 rounded-lg">
                            <p className="text-sm text-gray-500 italic">
                                {language === 'pt-BR' 
                                    ? `Toque mais músicas para gerar um relatório (Atual: ${sessionHistory.length}).` 
                                    : `Play more tracks to generate report (Current: ${sessionHistory.length}).`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- TAB 4: MASHUP LAB --- */}
        {activeTab === 'mashups' && (
            <div className="space-y-4 pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ZapIcon className="w-5 h-5 text-yellow-400" />
                        Mashup Lab
                    </h3>
                    {mashups.length === 0 && (
                        <button 
                            onClick={handleFetchMashups}
                            className="text-xs bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-4 py-2 rounded-lg border border-yellow-600/50 transition-colors font-bold uppercase tracking-wide"
                        >
                            {language === 'pt-BR' ? 'Buscar Combinacões' : 'Find Pairs'}
                        </button>
                    )}
                </div>
                
                {mashups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/20">
                        <LabIcon className="w-16 h-16 text-gray-700 mb-6" />
                        <h4 className="text-gray-300 font-bold mb-2">IA Matchmaker</h4>
                        <p className="text-gray-500 max-w-xs text-sm">
                            {language === 'pt-BR' 
                                ? 'Encontre pares harmônicos perfeitos em sua biblioteca para mixagens criativas.' 
                                : 'Find perfect harmonic pairs in your library for creative mixing.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {mashups.map((m, i) => (
                            <MashupCard key={i} pair={m} />
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* --- TAB 5: SETTINGS (REDESIGNED) --- */}
        {activeTab === 'settings' && (
            <div className="space-y-6 pb-20">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-gray-800 rounded-xl">
                        <SettingsIcon className="w-6 h-6 text-gray-200" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{language === 'pt-BR' ? 'Configurações' : 'Settings'}</h2>
                        <p className="text-sm text-gray-500">DJ Copilot v2.0</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Preferences Card */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
                         <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                             <h3 className="font-bold text-gray-200 flex items-center gap-2">
                                <GlobeIcon className="w-4 h-4 text-blue-500" />
                                {language === 'pt-BR' ? 'Preferências' : 'Preferences'}
                             </h3>
                         </div>
                         <div className="p-5 space-y-6">
                             {/* Language */}
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                                    {language === 'pt-BR' ? 'Idioma' : 'Language'}
                                </label>
                                <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-lg border border-gray-800">
                                    <button 
                                        onClick={() => setLanguage('pt-BR')}
                                        className={`py-2 px-3 rounded text-sm font-medium transition-all ${language === 'pt-BR' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Português
                                    </button>
                                    <button 
                                        onClick={() => setLanguage('en')}
                                        className={`py-2 px-3 rounded text-sm font-medium transition-all ${language === 'en' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        English
                                    </button>
                                </div>
                             </div>

                             {/* Samples Toggle */}
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-200 font-medium text-sm">
                                        {language === 'pt-BR' ? 'Analisar Samples' : 'Analyze Samples'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {language === 'pt-BR' ? 'Incluir loops/fx (< 1min)' : 'Include loops/fx (< 1min)'}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setAnalyzeSamples(!analyzeSamples)}
                                    className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${analyzeSamples ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${analyzeSamples ? 'translate-x-5' : ''}`} />
                                </button>
                            </div>
                         </div>
                    </div>

                    {/* Data Management Card */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm flex flex-col">
                        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                             <h3 className="font-bold text-gray-200 flex items-center gap-2">
                                <RefreshCwIcon className="w-4 h-4 text-green-500" />
                                {language === 'pt-BR' ? 'Dados' : 'Data'}
                             </h3>
                         </div>
                         <div className="p-5 space-y-4 flex-1 flex flex-col justify-center">
                            <button 
                                onClick={() => libraryUpdateRef.current?.click()}
                                className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-700 p-2 rounded group-hover:bg-gray-600 transition-colors">
                                        <UploadIcon className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-200">{language === 'pt-BR' ? 'Atualizar Playlist' : 'Update Playlist'}</p>
                                        <p className="text-xs text-gray-500">{language === 'pt-BR' ? 'Carregar novo XML' : 'Upload new XML'}</p>
                                    </div>
                                </div>
                            </button>

                            <button 
                                onClick={onReset}
                                className="w-full flex items-center justify-between p-4 bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 rounded-lg group transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-900/30 p-2 rounded group-hover:bg-red-900/50 transition-colors">
                                        <AlertCircleIcon className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-red-200">{language === 'pt-BR' ? 'Resetar Tudo' : 'Factory Reset'}</p>
                                        <p className="text-xs text-red-400/70">{language === 'pt-BR' ? 'Apagar dados salvos' : 'Clear all saved data'}</p>
                                    </div>
                                </div>
                            </button>
                         </div>
                    </div>

                    {/* Playlist Visibility Card (Full Width) */}
                    <div className="md:col-span-2 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                             <h3 className="font-bold text-gray-200 flex items-center gap-2">
                                <FolderIcon className="w-4 h-4 text-yellow-500" />
                                {language === 'pt-BR' ? 'Gerenciar Biblioteca' : 'Library Management'}
                             </h3>
                         </div>
                         <div className="p-4 bg-gray-900">
                             <p className="text-xs text-gray-500 mb-4 px-1">
                                {language === 'pt-BR' 
                                    ? 'Pastas desmarcadas serão ocultadas das sugestões e da visualização.' 
                                    : 'Unchecked folders will be hidden from suggestions and view.'}
                             </p>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {allPlaylistNames.map(playlistName => {
                                    const isHidden = hiddenPlaylists.includes(playlistName);
                                    return (
                                        <label key={playlistName} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isHidden ? 'bg-gray-900 border-gray-800 opacity-60' : 'bg-gray-800 border-gray-700'}`}>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FolderIcon className={`w-4 h-4 flex-shrink-0 ${isHidden ? 'text-gray-600' : 'text-gray-400'}`} />
                                                <span className={`text-xs font-medium truncate ${isHidden ? 'text-gray-500' : 'text-gray-200'}`}>{playlistName}</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={!isHidden}
                                                    onChange={() => togglePlaylistVisibility(playlistName)}
                                                />
                                                <div className={`w-8 h-4 rounded-full shadow-inner transition-colors ${!isHidden ? 'bg-blue-600' : 'bg-gray-700'}`}></div>
                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${!isHidden ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </label>
                                    );
                                })}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* Floating Action Menu (Only on Library tab) */}
      {activeTab === 'library' && (
        <div className="fixed bottom-24 right-6 z-20">
            <button
            onClick={() => setIsGeneratorOpen(true)}
            className="bg-white text-black font-bold p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all shadow-white/10"
            aria-label="Gerar Playlist"
            >
            <WandSparklesIcon className="w-6 h-6" />
            </button>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-800 z-30 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-4xl mx-auto">
            <NavButton 
                active={activeTab === 'deck'} 
                onClick={() => setActiveTab('deck')} 
                icon={<HomeIcon className="w-5 h-5" />} 
                label={language === 'pt-BR' ? 'Deck' : 'Home'} 
            />
            <NavButton 
                active={activeTab === 'library'} 
                onClick={() => setActiveTab('library')} 
                icon={<ListIcon className="w-5 h-5" />} 
                label={language === 'pt-BR' ? 'Biblio' : 'Lib'} 
            />
            <NavButton 
                active={activeTab === 'insights'} 
                onClick={() => setActiveTab('insights')} 
                icon={<PieChartIcon className="w-5 h-5" />} 
                label="Insights" 
            />
            <NavButton 
                active={activeTab === 'mashups'} 
                onClick={() => setActiveTab('mashups')} 
                icon={<LabIcon className="w-5 h-5" />} 
                label="Mashups" 
            />
            <NavButton 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
                icon={<SettingsIcon className="w-5 h-5" />} 
                label={language === 'pt-BR' ? 'Config' : 'Settings'} 
            />
        </div>
      </nav>

      <PlaylistGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        playlist={activePlaylist}
      />
    </div>
  );
};

// --- Helper Components ---

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <div className={`mb-1 transition-transform ${active ? '-translate-y-0.5' : ''}`}>{icon}</div>
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

const MashupCard: React.FC<{ pair: MashupPair }> = ({ pair }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-md transition-all duration-300">
            {/* Header (Always Visible) */}
            <div 
                className="p-4 cursor-pointer hover:bg-gray-800/30 active:bg-gray-800/50 flex items-center justify-between"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                    {/* Track 1 */}
                    <div className="text-right">
                        <p className="text-sm font-bold text-white whitespace-normal leading-tight">{pair.track1.name}</p>
                        <p className="text-xs text-gray-500 truncate">{pair.track1.artist}</p>
                    </div>
                    
                    {/* Divider */}
                    <div className="flex flex-col items-center px-1">
                        <div className="bg-yellow-500/10 p-1 rounded-full border border-yellow-500/30">
                            <ZapIcon className="w-3.5 h-3.5 text-yellow-500" />
                        </div>
                    </div>

                    {/* Track 2 */}
                    <div className="text-left">
                        <p className="text-sm font-bold text-white whitespace-normal leading-tight">{pair.track2.name}</p>
                        <p className="text-xs text-gray-500 truncate">{pair.track2.artist}</p>
                    </div>
                </div>
                
                <ChevronDownIcon className={`w-5 h-5 text-gray-600 ml-3 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 bg-black/20 border-t border-gray-800/50 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {/* Track 1 Details */}
                        <div className="bg-gray-800/30 p-3 rounded-lg text-center border border-gray-700/30">
                            <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Faixa A</p>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-xs font-mono font-bold text-white bg-gray-700 px-1.5 py-0.5 rounded">{pair.track1.bpm}</span>
                                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">{pair.track1.key}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-gray-400">
                                <FolderIcon className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[80px]">{pair.track1.location}</span>
                            </div>
                        </div>

                        {/* Track 2 Details */}
                        <div className="bg-gray-800/30 p-3 rounded-lg text-center border border-gray-700/30">
                            <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Faixa B</p>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <span className="text-xs font-mono font-bold text-white bg-gray-700 px-1.5 py-0.5 rounded">{pair.track2.bpm}</span>
                                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">{pair.track2.key}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-gray-400">
                                <FolderIcon className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[80px]">{pair.track2.location}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <p className="text-xs text-gray-300 leading-relaxed">
                            <span className="font-bold text-yellow-500 block mb-1 uppercase text-[9px] tracking-widest">Análise Técnica:</span>
                            {pair.reason}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
