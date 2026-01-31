
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Track, Suggestion, ViewMode, GroupingMode } from '../types';
import { translations } from '../utils/translations';
import { 
    ListIcon, 
    LayersIcon, 
    SettingsIcon, 
    PlayIcon, 
    ChevronDownIcon, 
    RefreshCwIcon,
    SearchIcon,
    FolderIcon,
    GlobeIcon,
    ContrastIcon,
    CameraIcon,
    ImageIcon,
    XIcon,
    StarIcon,
    AlertTriangleIcon,
    GitMergeIcon,
    PlusIcon,
    ZapIcon,
    ArrowUpIcon,
    MicIcon
} from './icons';
import { NowPlaying } from './NowPlaying';
import { SuggestionPanel } from './SuggestionPanel';
import { TrackItem } from './TrackItem';
import { SetBuilder } from './SetBuilder';
import { LibraryFilters, FilterState } from './LibraryFilters';
import { Header } from './Header';
import { identifyTrackFromImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { detectClash } from '../utils/harmonicUtils';
import { MashupFinder } from './MashupFinder';
import { getGenreTheme } from '../utils/themeUtils';
import { TransitionToast } from './TransitionToast';
import { VoiceSearch } from './VoiceSearch';
import { SwipeableItem } from './SwipeableItem';

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
  enabledDirectories: string[];
  setEnabledDirectories: (dirs: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  groupingMode: GroupingMode;
  onGroupingModeChange: (mode: GroupingMode) => void;
}

// Helper to render stars in the floating bar
const renderRatingMini = (rating: number) => {
  const stars = rating > 5 ? Math.round(rating / 20) : rating;
  return (
      <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
              <StarIcon key={s} className={`w-2 h-2 ${s <= stars ? 'text-yellow-500 fill-current' : 'text-white/20'}`} />
          ))}
      </div>
  );
};

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
  setLanguage,
  enabledDirectories,
  setEnabledDirectories,
  viewMode,
  onViewModeChange,
  groupingMode,
  onGroupingModeChange
}) => {
  const [activeTab, setActiveTab] = useState<'deck' | 'library' | 'mashup' | 'builder' | 'setup'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ minBpm: '', maxBpm: '', keys: [], genres: [] });
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [transitionToast, setTransitionToast] = useState<{ visible: boolean; data: any } | null>(null);
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // Helper to find predominant color for a folder
  const getPredominantColor = useMemo(() => (tracks: Track[]) => {
      const counts: Record<string, number> = {};
      let maxCount = 0;
      let dominant = null;
      for (const t of tracks) {
          if (t.color) {
              counts[t.color] = (counts[t.color] || 0) + 1;
              if (counts[t.color] > maxCount) {
                  maxCount = counts[t.color];
                  dominant = t.color;
              }
          }
      }
      return dominant || undefined;
  }, []);

  // Theme Logic
  const theme = useMemo(() => getGenreTheme(currentTrack), [currentTrack]);

  // Determine current track folder color
  const currentTrackFolderColor = useMemo(() => {
    if (!currentTrack || !playlist) return undefined;
    const folderTracks = playlist.filter(t => t.location === currentTrack.location);
    return getPredominantColor(folderTracks);
  }, [currentTrack, playlist, getPredominantColor]);

  // Scroll Listener for FAB
  useEffect(() => {
    const handleScroll = () => {
        const totalScroll = document.documentElement.scrollTop;
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scroll = windowHeight > 0 ? totalScroll / windowHeight : 0;
        setScrollProgress(Number(scroll));
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
  };

  const handleSelectTrack = (track: Track) => {
    setCurrentTrack(track);
    setActiveTab('deck');
    triggerHaptic();
  };

  const handleToggleExpandTrack = (trackId: string) => {
      setExpandedTrackId(prev => (prev === trackId ? null : trackId));
  };

  const handleAddToQueue = (e: React.MouseEvent | undefined, track: Track) => {
    e?.stopPropagation();
    
    // Calculate transition stats for Toast
    const referenceTrack = queue.length > 0 ? queue[queue.length - 1] : currentTrack;
    if (referenceTrack) {
        setTransitionToast({
            visible: true,
            data: {
                prevBpm: referenceTrack.bpm,
                newBpm: track.bpm,
                prevKey: referenceTrack.key,
                newKey: track.key,
                prevEnergy: referenceTrack.energy || 3,
                newEnergy: track.energy || 3
            }
        });
    }

    setQueue(prev => [...prev, track]);
    triggerHaptic();
  };

  const toggleDirectory = (dir: string) => {
    setEnabledDirectories(
        enabledDirectories.includes(dir) 
        ? enabledDirectories.filter(d => d !== dir) 
        : [...enabledDirectories, dir]
    );
  };

  const toggleFolderAccordion = (folder: string) => {
    setExpandedFolders(prev => 
      prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowImageSourceModal(false);
    setIsIdentifying(true);
    try {
        const base64 = await fileToBase64(file);
        const { title, artist } = await identifyTrackFromImage(base64);
        if (title || artist) {
            const found = playlist.find(t => {
                const trackStr = `${t.name} ${t.artist}`.toLowerCase();
                return trackStr.includes(title?.toLowerCase() || '_____') || (title && t.name.toLowerCase().includes(title.toLowerCase()));
            });
            if (found) { handleSelectTrack(found); alert(t.trackFound + ` ${found.name}`); } 
            else { alert(`${t.trackNotFound} (${title} - ${artist})`); }
        } else { alert(t.errorIdentify); }
    } catch (err) { console.error(err); alert(t.errorIdentify); } 
    finally { setIsIdentifying(false); if (cameraInputRef.current) cameraInputRef.current.value = ''; if (galleryInputRef.current) galleryInputRef.current.value = ''; }
  };

  const nextTrackInfo = useMemo(() => {
    if (queue.length === 0) return null;
    const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
        const nextTrack = queue[nextIndex];
        const clashInfo = currentTrack ? detectClash(currentTrack.key, currentTrack.bpm, nextTrack.key, nextTrack.bpm) : null;
        return { track: nextTrack, clash: clashInfo };
    }
    return null;
  }, [queue, currentTrack]);

  const availableKeys = useMemo(() => Array.from(new Set(playlist.map(t => t.key))).sort(), [playlist]);
  const availableGenres = useMemo(() => Array.from(new Set(playlist.map(t => t.genre))).sort(), [playlist]);
  const uniqueDirectories = useMemo(() => {
      const validTracks = playlist.filter(t => { const [m, s] = t.duration.split(':').map(Number); return (m * 60 + s) >= 60; });
      return Array.from(new Set(validTracks.map(t => t.location))).sort();
  }, [playlist]);

  const filteredPlaylist = useMemo(() => {
    return playlist.filter(track => {
      const [m, s] = track.duration.split(':').map(Number);
      if ((m * 60 + s) < 60) return false;
      if (!enabledDirectories.includes(track.location)) return false;
      const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) || track.artist.toLowerCase().includes(searchQuery.toLowerCase());
      const bpm = parseFloat(track.bpm);
      const matchesMinBpm = !filters.minBpm || bpm >= parseFloat(filters.minBpm);
      const matchesMaxBpm = !filters.maxBpm || bpm <= parseFloat(filters.maxBpm);
      const matchesKeys = filters.keys.length === 0 || filters.keys.includes(track.key);
      const matchesGenres = filters.genres.length === 0 || filters.genres.includes(track.genre);
      return matchesSearch && matchesMinBpm && matchesMaxBpm && matchesKeys && matchesGenres;
    });
  }, [playlist, searchQuery, filters, enabledDirectories]);

  const groupedPlaylist = useMemo(() => {
    const groups: Record<string, Track[]> = {};
    filteredPlaylist.forEach(track => { if (!groups[track.location]) groups[track.location] = []; groups[track.location].push(track); });
    return groups;
  }, [filteredPlaylist]);

  useMemo(() => { if (searchQuery || filters.keys.length > 0 || filters.genres.length > 0) { setExpandedFolders(Object.keys(groupedPlaylist)); } }, [searchQuery, filters, groupedPlaylist]);

  // SMART CHIPS / FILTER PILLS
  const filterPills = useMemo(() => {
      if (!currentTrack) return [];
      const bpm = Math.round(parseFloat(currentTrack.bpm));
      
      const targetMinBpm = (bpm - 5).toString();
      const targetMaxBpm = (bpm + 5).toString();
      const isBpmActive = filters.minBpm === targetMinBpm && filters.maxBpm === targetMaxBpm;
      
      const isKeyActive = filters.keys.includes(currentTrack.key);
      const isFolderActive = searchQuery === currentTrack.location;

      return [
          { 
              label: `± BPM`, 
              action: () => setFilters(prev => ({ 
                  ...prev, 
                  minBpm: isBpmActive ? '' : targetMinBpm, 
                  maxBpm: isBpmActive ? '' : targetMaxBpm 
              })), 
              active: isBpmActive 
          },
          { 
              label: `Key ${currentTrack.key}`, 
              action: () => setFilters(prev => ({ 
                  ...prev, 
                  keys: isKeyActive ? prev.keys.filter(k => k !== currentTrack.key) : [currentTrack.key] 
              })), 
              active: isKeyActive 
          },
          { 
              label: `Same Folder`, 
              action: () => { 
                  if (isFolderActive) {
                      setSearchQuery('');
                      onGroupingModeChange('folder'); // Reset to default grouping
                  } else {
                      setSearchQuery(currentTrack.location); 
                      onGroupingModeChange('all'); 
                  }
              }, 
              active: isFolderActive 
          }
      ];
  }, [currentTrack, filters, searchQuery, onGroupingModeChange]);

  const renderTrackItem = (track: Track) => {
      const item = (
          <TrackItem 
              key={track.id} 
              track={track} 
              onSelect={handleSelectTrack} 
              isSelected={currentTrack?.id === track.id} 
              isExpanded={expandedTrackId === track.id} 
              onToggleExpand={() => handleToggleExpandTrack(track.id)} 
              onAddToQueue={handleAddToQueue} 
              variant={viewMode} 
              searchQuery={searchQuery} 
          />
      );

      // Only enable SwipeableItem for CARD view
      if (viewMode === 'card') {
          return (
              <SwipeableItem 
                  key={track.id} 
                  onLeftAction={() => handleSelectTrack(track)} 
                  onRightAction={() => handleAddToQueue(undefined, track)}
              >
                  {item}
              </SwipeableItem>
          );
      }

      return item;
  };

  return (
    <div 
        className={`min-h-screen text-slate-200 font-sans selection:bg-cyan-500/30 transition-colors duration-1000 ease-in-out ${isHighContrast ? 'contrast-125 grayscale bg-black' : `bg-gradient-to-br ${theme.gradientFrom} via-slate-950 ${theme.gradientTo}`} ${!isHighContrast && 'aurora-bg'}`}
    >
      <Header onReset={onReset} />
      
      {/* Toast Notification */}
      {transitionToast && (
          <TransitionToast 
            {...transitionToast.data} 
            onClose={() => setTransitionToast(null)} 
          />
      )}

      {/* Voice Search Modal */}
      <VoiceSearch 
        isOpen={showVoiceSearch} 
        onClose={() => setShowVoiceSearch(false)}
        onSearch={(query) => { setSearchQuery(query); onGroupingModeChange('all'); }} 
      />

      <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />

      {/* Persistent Mini Player */}
      {currentTrack && activeTab !== 'deck' && (
          <div className="fixed bottom-[60px] left-0 right-0 z-[85] px-2 animate-in slide-in-from-bottom-2">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl p-2 flex items-center gap-3 shadow-2xl" onClick={() => setActiveTab('deck')}>
                  <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-slate-800 ${theme.primary === 'red' ? 'animate-pulse' : ''}`}>
                      <PlayIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{currentTrack.name}</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{currentTrack.bpm} BPM • {currentTrack.key}</p>
                  </div>
              </div>
          </div>
      )}

      {showImageSourceModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10 duration-300">
                <div className="flex justify-between items-start">
                    <div><h3 className="text-xl font-bold text-white uppercase italic tracking-wider">{t.identifyPhoto}</h3></div>
                    <button onClick={() => setShowImageSourceModal(false)} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                    <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-4 p-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl transition-all group active:scale-95"><div className="bg-black/20 p-3 rounded-xl group-hover:bg-black/30 transition-colors"><CameraIcon className="w-6 h-6 text-white" /></div><div className="text-left"><span className="block text-sm font-bold text-white uppercase tracking-widest">{t.takePhoto}</span><span className="block text-[10px] text-cyan-100">{t.openCamera}</span></div></button>
                    <button onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all group active:scale-95 border border-slate-700"><div className="bg-black/20 p-3 rounded-xl group-hover:bg-black/30 transition-colors"><ImageIcon className="w-6 h-6 text-cyan-400" /></div><div className="text-left"><span className="block text-sm font-bold text-white uppercase tracking-widest">{t.chooseGallery}</span><span className="block text-[10px] text-slate-400">{t.openPhotos}</span></div></button>
                </div>
            </div>
        </div>
      )}

      {/* Main Container */}
      <main className="container mx-auto px-4 pt-20 pb-24 md:pb-8 md:pt-24 max-w-xl md:max-w-5xl transition-all duration-300">
        
        {/* TAB: DECK */}
        {activeTab === 'deck' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentTrack ? (
              <>
                {nextTrackInfo?.clash?.hasClash && (
                    <div className="mb-4 bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                        <AlertTriangleIcon className="w-6 h-6 text-red-500" />
                        <div><p className="text-xs font-bold text-red-400 uppercase tracking-widest">Clash Warning</p><p className="text-[10px] text-red-300/80">{nextTrackInfo.clash.reasons.join(', ')}</p></div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-12">
                        <NowPlaying 
                            track={currentTrack} 
                            language={language} 
                            folderColor={currentTrackFolderColor}
                        />
                    </div>
                    <div className="md:col-span-12"><SuggestionPanel currentTrack={currentTrack} playlist={playlist.filter(t => enabledDirectories.includes(t.location))} suggestions={suggestions} setSuggestions={setSuggestions} onSelectTrack={handleSelectTrack} onAddToQueue={(t) => handleAddToQueue(undefined, t)} language={language} /></div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 relative"><PlayIcon className="w-10 h-10 text-slate-500" /><div className="absolute -bottom-2 -right-2 bg-cyan-600 rounded-full p-2 animate-bounce"><CameraIcon className="w-5 h-5 text-white" /></div></div>
                <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-2">{t.deckEmptyTitle}</h2>
                <p className="text-sm text-slate-400 max-w-xs">{t.deckEmptyMsg}</p>
                <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => setShowImageSourceModal(true)} disabled={isIdentifying} className="w-full py-4 bg-cyan-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">{isIdentifying ? (<RefreshCwIcon className="w-4 h-4 animate-spin" />) : (<CameraIcon className="w-4 h-4" />)} {isIdentifying ? t.analyzing : t.identifyBtn}</button>
                    <button onClick={() => setActiveTab('library')} className="w-full py-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">{t.openLib}</button>
                </div>
              </div>
            )}
            {nextTrackInfo && (<div className="fixed bottom-24 left-4 right-4 z-[80] pointer-events-none flex justify-center"><div className={`pointer-events-auto w-full max-w-lg backdrop-blur-xl text-white rounded-2xl p-3 shadow-[0_10px_40px_rgba(0,0,0,0.4)] border flex items-center min-h-[70px] animate-in slide-in-from-bottom-5 active:scale-[0.98] transition-all ${nextTrackInfo.clash?.hasClash ? 'bg-red-950/90 border-red-500/40' : 'bg-cyan-600/90 border-cyan-400/30'}`}><button onClick={(e) => { e.stopPropagation(); triggerHaptic(); handleSelectTrack(nextTrackInfo.track); }} className="bg-black/30 p-3 rounded-xl flex-shrink-0 shadow-inner hover:bg-black/50 transition-colors mr-3 active:scale-90"><PlayIcon className="w-5 h-5 text-white" /></button><div className="flex-1 overflow-hidden"><div className="flex justify-between items-center mb-0.5"><p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">{nextTrackInfo.clash?.hasClash && <AlertTriangleIcon className="w-3 h-3 text-white animate-pulse" />}{t.nextInQueue}</p><div className="flex items-center gap-1.5 opacity-80"><span className="text-[9px] font-mono text-white">{nextTrackInfo.track.duration}</span>{renderRatingMini(nextTrackInfo.track.rating)}</div></div><p className="text-sm font-bold truncate text-white tracking-tight leading-tight">{nextTrackInfo.track.name}</p><p className="text-[10px] truncate opacity-70 mt-0.5">{nextTrackInfo.track.location}</p></div></div></div>)}
          </div>
        )}

        {/* TAB: LIBRARY */}
        {activeTab === 'library' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Bar Row */}
            <div className="flex gap-2 mb-2 sticky top-[72px] z-30 bg-[#020617]/90 backdrop-blur-sm p-1 rounded-2xl">
                <button 
                    onClick={() => setShowVoiceSearch(true)}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-cyan-400 hover:text-white transition-colors"
                >
                    <MicIcon className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                    <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all pl-11 min-h-[50px]" />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
                <button onClick={() => onViewModeChange(viewMode === 'card' ? 'list' : 'card')} className={`px-4 rounded-xl border transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400'}`} title="Alternar Visualização">{viewMode === 'card' ? <LayersIcon className="w-5 h-5" /> : <ListIcon className="w-5 h-5" />}</button>
            </div>

            {/* Quick Filter Pills (Context Aware) */}
            {currentTrack && (
                <div className="flex gap-2 mb-3 overflow-x-auto custom-scrollbar pb-1 sticky top-[130px] z-20 pl-1">
                    {filterPills.map((pill, idx) => (
                        <button 
                            key={idx} 
                            onClick={pill.action} 
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all shadow-sm ${pill.active ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-cyan-500 hover:text-white'}`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            )}

            <LibraryFilters availableKeys={availableKeys} availableGenres={availableGenres} onFilterChange={setFilters} initialFilters={filters} />
            
            <div className="mt-4">
                 <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t.navLib}</span>
                    <div className="flex gap-2">
                         <button onClick={onEnrich} disabled={isEnriching} className="text-[10px] font-bold text-cyan-500 flex items-center gap-1 disabled:opacity-50"><RefreshCwIcon className={`w-3 h-3 ${isEnriching ? 'animate-spin' : ''}`} /> ENRICH</button>
                    </div>
                </div>
                {groupingMode === 'all' ? (
                    <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : 'space-y-1.5'}>
                        {filteredPlaylist.map(track => renderTrackItem(track))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(groupedPlaylist).map(([folder, tracks]: [string, Track[]]) => {
                            const folderColor = getPredominantColor(tracks) || '';
                            
                            return (
                                <div key={folder} className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
                                    <button onClick={() => toggleFolderAccordion(folder)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm"><div className="flex items-center gap-3 overflow-hidden">
                                        <div style={{ color: folderColor || '#06b6d4' }}>
                                            <FolderIcon className="w-4 h-4 flex-shrink-0" />
                                        </div>
                                        <span className="text-xs font-bold uppercase text-white break-words text-left">{folder}</span><span className="text-xs font-bold text-slate-500 bg-black/40 px-2 py-0.5 rounded-full flex-shrink-0">{tracks.length}</span></div><ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-300 flex-shrink-0 ${expandedFolders.includes(folder) ? 'rotate-180' : ''}`} /></button>
                                    {expandedFolders.includes(folder) && (
                                        <div className={`p-2 border-t border-slate-800 bg-black/20 animate-in slide-in-from-top-2 ${viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 gap-2' : 'space-y-0.5'}`}>
                                            {tracks.map(track => renderTrackItem(track))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Scroll Progress FAB */}
            {activeTab === 'library' && (
                <div className="fixed bottom-24 right-4 z-50">
                     <button 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                        className="w-12 h-12 bg-cyan-600 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-90 transition-transform relative group overflow-hidden"
                     >
                        {/* Circular Progress SVG */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" />
                            <circle 
                                cx="50" cy="50" r="46" 
                                stroke="white" 
                                strokeWidth="8" 
                                fill="none" 
                                strokeDasharray="289" 
                                strokeDashoffset={289 - (289 * scrollProgress)} 
                                className="transition-all duration-100 ease-linear"
                            />
                        </svg>
                        <ArrowUpIcon className="w-5 h-5 relative z-10" />
                     </button>
                </div>
            )}
          </div>
        )}
        
        {/* TAB: MASHUPS */}
        {activeTab === 'mashup' && (
            <MashupFinder playlist={playlist} onSelectTrack={handleSelectTrack} onAddToQueue={(t) => handleAddToQueue(undefined, t)} language={language} />
        )}

        {/* TAB: BUILDER */}
        {activeTab === 'builder' && (
          <SetBuilder queue={queue} setQueue={setQueue} onSelectTrack={handleSelectTrack} currentTrackId={currentTrack?.id} language={language} fullPlaylist={playlist} />
        )}

        {/* TAB: SETUP */}
        {activeTab === 'setup' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 max-w-2xl mx-auto">
                {/* ... existing setup content ... */}
                <h2 className="text-2xl font-bold text-white px-2 mb-2">{t.settingsTitle}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 transition-all hover:bg-slate-900/70">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><RefreshCwIcon className="w-4 h-4" /> {t.automationTitle}</h3>
                        <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-white">{t.autoEnrichTitle}</p></div><button onClick={() => onAutoEnrichChange(!autoEnrichEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${autoEnrichEnabled ? 'bg-cyan-500' : 'bg-slate-800'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoEnrichEnabled ? 'right-1' : 'left-1'}`} /></button></div>
                    </section>
                    <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 transition-all hover:bg-slate-900/70">
                        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><GlobeIcon className="w-4 h-4" /> {t.langTitle}</h3>
                        <div className="flex p-1 bg-black/60 rounded-xl border border-white/5"><button onClick={() => setLanguage('pt-BR')} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-lg transition-all ${language === 'pt-BR' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Português</button><button onClick={() => setLanguage('en-US')} className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-lg transition-all ${language === 'en-US' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>English</button></div>
                    </section>
                </div>
                <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 transition-all hover:bg-slate-900/70">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FolderIcon className="w-4 h-4" /> {t.filterPlaylists}</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {uniqueDirectories.length > 0 ? uniqueDirectories.map(dir => (<div key={dir} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 cursor-pointer active:scale-95 transition-transform" onClick={() => toggleDirectory(dir)}><div className="flex items-center gap-3 overflow-hidden"><FolderIcon className={`w-4 h-4 ${enabledDirectories.includes(dir) ? 'text-cyan-500' : 'text-slate-700'}`} /><span className={`text-[11px] font-bold truncate ${enabledDirectories.includes(dir) ? 'text-white' : 'text-slate-600'}`}>{dir}</span></div><button className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${enabledDirectories.includes(dir) ? 'bg-cyan-500' : 'bg-slate-800'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${enabledDirectories.includes(dir) ? 'right-1' : 'left-1'}`} /></button></div>)) : (<p className="text-[10px] text-slate-600 italic p-2 text-center">Nenhum diretório válido encontrado (faixas {'>'} 60s)</p>)}
                    </div>
                </section>
                <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 transition-all hover:bg-slate-900/70">
                    <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-2"><ContrastIcon className="w-4 h-4" /> {t.accessTitle}</h3>
                    <div className="flex items-center justify-between mb-6"><div><p className="text-sm font-bold text-white">{t.highContrastTitle}</p></div><button onClick={() => onHighContrastChange(!isHighContrast)} className={`w-12 h-6 rounded-full transition-colors relative ${isHighContrast ? 'bg-white' : 'bg-slate-800'}`}><div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isHighContrast ? 'bg-black right-1' : 'bg-white left-1'}`} /></button></div>
                    <div><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-white/60 uppercase">Zoom: {fontScale}%</span></div><div className="relative h-10 flex items-center px-2 bg-black/60 rounded-xl border border-white/5"><span className="text-xs font-bold text-gray-500 mr-2">A</span><input type="range" min="100" max="175" step="25" value={fontScale} onChange={(e) => onFontScaleChange(parseInt(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" /><span className="text-lg font-bold text-white ml-2">A</span></div><div className="flex justify-between px-1 mt-1"><span className="text-[8px] text-gray-300">100%</span><span className="text-[8px] text-gray-300">175%</span></div></div>
                </section>
                 <div className="p-1"><div className="p-4 rounded-3xl bg-red-950/20 border border-red-900/30"><h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">{t.criticalMgmt}</h3><button onClick={onReset} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">{t.clearAll}</button></div></div>
            </div>
        )}
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 py-2 z-[90]">
        <div className="container mx-auto flex justify-between items-center max-w-xl md:max-w-5xl px-4">
            <NavButton active={activeTab === 'deck'} onClick={() => setActiveTab('deck')} icon={<PlayIcon className="w-5 h-5" />} label={t.navDeck} />
            <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<ListIcon className="w-5 h-5" />} label={t.navLib} />
            <NavButton active={activeTab === 'mashup'} onClick={() => setActiveTab('mashup')} icon={<GitMergeIcon className="w-5 h-5" />} label="MASH" />
            <NavButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<LayersIcon className="w-5 h-5" />} label={t.navBuilder} badge={queue.length > 0 ? queue.length : undefined} />
            <NavButton active={activeTab === 'setup'} onClick={() => setActiveTab('setup')} icon={<SettingsIcon className="w-5 h-5" />} label={t.navSetup} />
        </div>
      </nav>
    </div>
  );
};

interface NavButtonProps { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number; }
const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badge }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all relative ${active ? 'text-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}>
        <div className="relative">{icon}{badge !== undefined && (<span className="absolute -top-2 -right-2 bg-cyan-600 text-white text-[8px] font-bold px-1 rounded-full border border-slate-950">{badge}</span>)}</div>
        <span className="text-[8px] font-bold mt-1 uppercase tracking-widest">{label}</span>
    </button>
);
