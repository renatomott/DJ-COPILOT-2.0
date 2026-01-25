
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Track, Suggestion, MashupPair } from '../types';
import { translations } from '../utils/translations';
import { 
    ListIcon, 
    LayersIcon, 
    SettingsIcon, 
    PlayIcon, 
    ChevronDownIcon, 
    RefreshCwIcon,
    SearchIcon,
    HomeIcon,
    ZapIcon,
    SparklesIcon,
    TrashIcon,
    UploadIcon,
    GlobeIcon,
    ContrastIcon,
    ListPlusIcon,
    ActivityIcon,
    BrainIcon,
    FolderIcon,
    MusicIcon,
    WandSparklesIcon,
    CameraIcon,
    ImageIcon,
    XIcon
} from './icons';
import { NowPlaying } from './NowPlaying';
import { SuggestionPanel } from './SuggestionPanel';
import { TrackItem } from './TrackItem';
import { SetBuilder } from './SetBuilder';
import { LibraryFilters, FilterState } from './LibraryFilters';
import { Header } from './Header';
import { getGapAnalysis, getMashupPairs, getSemanticSearch, identifyTrackFromImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { Loader } from './Loader';
import { SkeletonLoader } from './SkeletonLoader';

interface MainScreenProps {
  playlist: Track[];
  onReset: () => void;
  onEnrich: () => void;
  onUpdateLibrary: (file: File) => void;
  isEnriching: boolean;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
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
  const [activeTab, setActiveTab] = useState<Tab>('deck');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ minBpm: '', maxBpm: '', keys: [], genres: [] });
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [mashupPairs, setMashupPairs] = useState<MashupPair[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<string[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolsSubTab, setToolsSubTab] = useState<'gaps' | 'mashups'>('gaps');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const libraryUpdateRef = useRef<HTMLInputElement>(null);
  
  const t = translations[language];

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleSelectTrack = (track: Track) => {
    setCurrentTrack(track);
    setActiveTab('deck');
    triggerHaptic();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToQueue = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    setQueue(prev => [...prev, track]);
    triggerHaptic();
  };

  const nextTrackInfo = useMemo(() => {
    if (queue.length === 0) return null;
    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      return {
        track: queue[nextIndex],
        currentNum: nextIndex + 1,
        totalNum: queue.length
      };
    }
    return null;
  }, [queue, currentTrack]);

  const handleSemanticSearch = async () => {
    if (!searchQuery || searchQuery.length < 3) return;
    setIsSearchingSemantic(true);
    triggerHaptic();
    try {
        const results = await getSemanticSearch(searchQuery, playlist);
        if (results.length > 0) {
            handleSelectTrack(results[0]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsSearchingSemantic(false);
    }
  };

  const handleIdentifyByImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsIdentifying(true);
      setShowPhotoOptions(false);
      try {
        const base64Image = await fileToBase64(file);
        const { title, artist } = await identifyTrackFromImage(base64Image);
        if (title || artist) {
          const found = playlist.find(t => 
            t.name.toLowerCase().includes(title.toLowerCase()) || 
            t.artist.toLowerCase().includes(artist.toLowerCase())
          );
          if (found) handleSelectTrack(found);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsIdentifying(false);
      }
    }
  };

  const handleFetchTools = async () => {
    setIsLoadingTools(true);
    try {
        if (toolsSubTab === 'gaps') {
            const result = await getGapAnalysis(playlist);
            setGapAnalysis(result);
        } else {
            const result = await getMashupPairs(playlist);
            setMashupPairs(result);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingTools(false);
    }
  };

  const availableKeys = useMemo(() => Array.from(new Set(playlist.map(t => t.key))).sort(), [playlist]);
  const availableGenres = useMemo(() => Array.from(new Set(playlist.map(t => t.genre))).sort(), [playlist]);

  const filteredPlaylist = useMemo(() => {
    return playlist.filter(track => {
      const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            track.artist.toLowerCase().includes(searchQuery.toLowerCase());
      const bpm = parseFloat(track.bpm);
      const matchesMinBpm = !filters.minBpm || bpm >= parseFloat(filters.minBpm);
      const matchesMaxBpm = !filters.maxBpm || bpm <= parseFloat(filters.maxBpm);
      const matchesKeys = filters.keys.length === 0 || filters.keys.includes(track.key);
      const matchesGenres = filters.genres.length === 0 || filters.genres.includes(track.genre);
      return matchesSearch && matchesMinBpm && matchesMaxBpm && matchesKeys && matchesGenres;
    });
  }, [playlist, searchQuery, filters]);

  return (
    <div className={`min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 ${isHighContrast ? 'contrast-125 grayscale' : ''}`}>
      <Header onReset={onReset} />
      
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleIdentifyByImage} />
      <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleIdentifyByImage} />
      <input type="file" ref={libraryUpdateRef} className="hidden" accept=".xml" onChange={(e) => e.target.files && onUpdateLibrary(e.target.files[0])} />

      <main className="container mx-auto px-4 pt-20 pb-32 max-w-lg">
        {activeTab === 'deck' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex justify-end">
                <button 
                    onClick={() => setShowPhotoOptions(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-full border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-600/30 transition-all min-h-[40px]"
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
                  playlist={playlist} 
                  suggestions={suggestions}
                  setSuggestions={setSuggestions}
                  onSelectTrack={handleSelectTrack}
                  onAddToQueue={(t) => setQueue(prev => [...prev, t])}
                  language={language}
                />
              </>
            ) : (
              <div className="text-center py-20 opacity-50">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-800">
                    <MusicIcon className="w-10 h-10 text-slate-700" />
                </div>
                <p className="text-lg font-black uppercase tracking-widest">{t.deckEmptyTitle}</p>
                <p className="text-sm mt-2">{t.deckEmptyMsg}</p>
                <button 
                    onClick={() => setActiveTab('library')}
                    className="mt-8 px-8 py-4 bg-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95"
                >
                    {t.openLib}
                </button>
              </div>
            )}

            {/* MINI PLAYER - APENAS NA ABA DECK */}
            {nextTrackInfo && (
                <div className="fixed bottom-24 left-4 right-4 z-[100] pointer-events-none">
                    <div className="pointer-events-auto w-full bg-cyan-600/90 backdrop-blur-xl text-white rounded-2xl p-2.5 shadow-[0_10px_40px_rgba(6,182,212,0.4)] border border-cyan-400/30 flex items-center min-h-[64px] animate-in slide-in-from-bottom-5 active:scale-[0.98] transition-all">
                        <button 
                            onClick={(e) => { e.stopPropagation(); triggerHaptic(); handleSelectTrack(nextTrackInfo.track); }}
                            className="bg-black/30 p-2.5 rounded-xl flex-shrink-0 shadow-inner hover:bg-black/50 transition-colors mr-3 active:scale-90"
                        >
                            <PlayIcon className="w-5 h-5 text-white" />
                        </button>
                        
                        <button 
                            onClick={() => { triggerHaptic(); setActiveTab('builder'); }}
                            className="flex-1 text-left overflow-hidden flex justify-between items-center group"
                        >
                            <div className="overflow-hidden pr-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-50 opacity-80">{t.nextInQueue}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="bg-black/30 px-1.5 py-0.5 rounded text-[9px] font-black text-white">{nextTrackInfo.currentNum}/{nextTrackInfo.totalNum}</span>
                                        <span className="text-[9px] font-black text-white/40">|</span>
                                        <span className="text-[9px] font-black text-white/90">{nextTrackInfo.track.duration}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-black truncate text-white tracking-tight leading-tight">{nextTrackInfo.track.name}</p>
                                <p className="text-[9px] font-bold text-cyan-100 opacity-60 truncate uppercase tracking-wider">{nextTrackInfo.track.location}</p>
                            </div>
                            <ChevronDownIcon className="w-4 h-4 text-white/40 -rotate-90 group-hover:text-white transition-colors" />
                        </button>
                    </div>
                </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all pl-11 min-h-[50px]"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <button 
                        onClick={handleSemanticSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 p-1"
                    >
                        {isSearchingSemantic ? <RefreshCwIcon className="w-4 h-4 animate-spin" /> : <WandSparklesIcon className="w-4 h-4" />}
                    </button>
                </div>
                <button 
                    onClick={onEnrich}
                    disabled={isEnriching}
                    className="bg-slate-900 border border-slate-800 px-4 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    <ZapIcon className={`w-5 h-5 text-yellow-400 ${isEnriching ? 'animate-pulse' : ''}`} />
                </button>
            </div>

            <LibraryFilters 
                availableKeys={availableKeys}
                availableGenres={availableGenres}
                onFilterChange={setFilters}
                initialFilters={filters}
            />

            <div className="space-y-2 mt-6">
                {filteredPlaylist.map(track => (
                    <TrackItem 
                        key={track.id} 
                        track={track} 
                        onSelect={handleSelectTrack}
                        isSelected={currentTrack?.id === track.id}
                        onAddToQueue={handleAddToQueue}
                    />
                ))}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
                    <button 
                        onClick={() => setToolsSubTab('gaps')} 
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${toolsSubTab === 'gaps' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        {t.tabGaps}
                    </button>
                    <button 
                        onClick={() => setToolsSubTab('mashups')} 
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${toolsSubTab === 'mashups' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        {t.tabMashups}
                    </button>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 min-h-[300px] flex flex-col items-center justify-center text-center">
                    {isLoadingTools ? (
                        <Loader />
                    ) : (
                        <>
                            {toolsSubTab === 'gaps' ? (
                                gapAnalysis.length > 0 ? (
                                    <div className="w-full space-y-4 text-left">
                                        {gapAnalysis.map((gap, i) => (
                                            <div key={i} className="p-4 bg-black/30 rounded-xl border border-white/5 text-sm font-bold">
                                                {gap}
                                            </div>
                                        ))}
                                        <button onClick={handleFetchTools} className="w-full mt-4 text-[10px] font-black uppercase text-cyan-400 p-2">{t.recalculate}</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto"><ActivityIcon className="w-8 h-8 text-cyan-500" /></div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase tracking-widest">{t.analyzeGaps}</h3>
                                            <p className="text-xs text-slate-500 mt-2">{t.analyzeGapsSub}</p>
                                        </div>
                                        <button onClick={handleFetchTools} className="bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95">{t.navTools}</button>
                                    </div>
                                )
                            ) : (
                                mashupPairs.length > 0 ? (
                                    <div className="w-full space-y-4">
                                        {mashupPairs.map((pair, i) => (
                                            <div key={i} className="p-4 bg-black/30 rounded-xl border border-white/5 text-left">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-cyan-400">{pair.track1.name}</span>
                                                    <span className="text-xs font-black text-slate-500">+</span>
                                                    <span className="text-[10px] font-black text-purple-400">{pair.track2.name}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 italic">"{pair.reason}"</p>
                                            </div>
                                        ))}
                                        <button onClick={handleFetchTools} className="w-full mt-4 text-[10px] font-black uppercase text-purple-400 p-2">{t.recalculate}</button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto"><BrainIcon className="w-8 h-8 text-purple-500" /></div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase tracking-widest">{t.tabMashups}</h3>
                                            <p className="text-xs text-slate-500 mt-2">{t.discoverMashupsSub}</p>
                                        </div>
                                        <button onClick={handleFetchTools} className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95">{t.navTools}</button>
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'builder' && (
          <SetBuilder 
            queue={queue}
            setQueue={setQueue}
            onSelectTrack={handleSelectTrack}
            currentTrackId={currentTrack?.id}
            language={language}
            fullPlaylist={playlist}
          />
        )}

        {activeTab === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <h2 className="text-xl font-black text-white px-1">{t.settingsTitle}</h2>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-4">{t.automationTitle}</h3>
                    <div className="flex items-center justify-between" onClick={() => onAutoEnrichChange(!autoEnrichEnabled)}>
                        <div>
                            <p className="text-sm font-bold text-white">{t.autoEnrichTitle}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{t.autoEnrichDesc}</p>
                        </div>
                        <button className={`w-12 h-6 rounded-full transition-colors relative ${autoEnrichEnabled ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoEnrichEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-4">{t.langTitle}</h3>
                    <div className="flex bg-black/40 p-1 rounded-xl">
                        <button onClick={() => setLanguage('pt-BR')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${language === 'pt-BR' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}>PORTUGUÊS</button>
                        <button onClick={() => setLanguage('en-US')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${language === 'en-US' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}>ENGLISH</button>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-4">{t.accessTitle}</h3>
                    <div className="flex items-center justify-between mb-6" onClick={() => onHighContrastChange(!isHighContrast)}>
                        <div>
                            <p className="text-sm font-bold text-white">{t.highContrastTitle}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{t.highContrastDesc}</p>
                        </div>
                        <button className={`w-12 h-6 rounded-full transition-colors relative ${isHighContrast ? 'bg-cyan-500' : 'bg-slate-800'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isHighContrast ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white mb-3">{t.fontSize}</p>
                        <div className="flex gap-2">
                            {[80, 100, 120].map(scale => (
                                <button key={scale} onClick={() => onFontScaleChange(scale)} className={`flex-1 py-3 border rounded-xl text-[10px] font-black uppercase transition-all ${fontScale === scale ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                                    {scale === 80 ? t.compact : scale === 100 ? t.standard : t.large}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-2 border-dashed border-red-900/30 rounded-3xl">
                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">{t.criticalMgmt}</h3>
                    <div className="space-y-3">
                        <button onClick={() => libraryUpdateRef.current?.click()} className="w-full flex items-center gap-3 p-4 bg-black border border-slate-800 rounded-2xl hover:border-cyan-500 transition-all text-left">
                            <UploadIcon className="w-5 h-5 text-white" />
                            <div>
                                <p className="text-sm font-black text-white">{t.updateDb}</p>
                                <p className="text-[9px] text-white opacity-40 uppercase font-black">{t.updateDbSub}</p>
                            </div>
                        </button>
                        <button onClick={onReset} className="w-full flex items-center gap-3 p-4 bg-red-950/10 border border-red-900/20 rounded-2xl hover:bg-red-900/20 transition-all text-left">
                            <TrashIcon className="w-5 h-5 text-red-500" />
                            <p className="text-sm font-black text-red-500">{t.clearAll}</p>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50 p-2 pb-8 z-[90]">
        <div className="container mx-auto flex justify-around items-center max-w-lg">
            <NavButton active={activeTab === 'deck'} onClick={() => setActiveTab('deck')} icon={<HomeIcon className="w-5 h-5" />} label={t.navDeck} />
            <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<ListIcon className="w-5 h-5" />} label={t.navLib} />
            <NavButton active={activeTab === 'tools'} onClick={() => setActiveTab('tools')} icon={<LayersIcon className="w-5 h-5" />} label={t.navTools} />
            <NavButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<ListPlusIcon className="w-5 h-5" />} label={t.navBuilder} badge={queue.length > 0 ? queue.length : undefined} />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon className="w-5 h-5" />} label={t.navSetup} />
        </div>
      </nav>

      {showPhotoOptions && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end justify-center p-4" onClick={() => setShowPhotoOptions(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-base font-black text-white uppercase tracking-widest">{t.identifyPhoto}</h3>
                    <button onClick={() => setShowPhotoOptions(false)} className="text-white p-2"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-4 space-y-3">
                    <button onClick={() => cameraInputRef.current?.click()} className="w-full flex items-center gap-4 p-5 hover:bg-cyan-600/20 bg-black/40 border border-white/5 rounded-2xl transition-all text-left">
                        <CameraIcon className="w-7 h-7 text-cyan-400" />
                        <div><span className="font-black text-white block text-sm">{t.takePhoto}</span><span className="text-[9px] text-white opacity-40 uppercase font-black">{t.openCamera}</span></div>
                    </button>
                    <button onClick={() => galleryInputRef.current?.click()} className="w-full flex items-center gap-4 p-5 hover:bg-purple-600/20 bg-black/40 border border-white/5 rounded-2xl transition-all text-left">
                        <ImageIcon className="w-7 h-7 text-purple-400" />
                        <div><span className="font-black text-white block text-sm">{t.chooseGallery}</span><span className="text-[9px] text-white opacity-40 uppercase font-black">{t.openPhotos}</span></div>
                    </button>
                </div>
            </div>
        </div>
      )}

      {isIdentifying && (
          <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[300] backdrop-blur-md">
            <Loader />
            <p className="mt-6 text-sm font-black text-white uppercase tracking-widest">{t.analyzing}</p>
          </div>
      )}
    </div>
  );
};

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badge }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center flex-1 py-2 rounded-2xl transition-all relative ${active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
        <div className="relative">
            {icon}
            {badge !== undefined && (
                <span className="absolute -top-2 -right-2 bg-cyan-600 text-white text-[8px] font-black px-1 rounded-full border border-slate-950">
                    {badge}
                </span>
            )}
        </div>
        <span className="text-[8px] font-black mt-1 uppercase tracking-widest">{label}</span>
    </button>
);
