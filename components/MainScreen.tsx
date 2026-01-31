
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
    FilterIcon
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
import { SwipeableItem } from './SwipeableItem';
// MiniPlayer import removed from here as it's now only used in Header, but kept if needed for other persistent UI
import { MiniPlayer } from './MiniPlayer'; 

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

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: number;
    collapsed?: boolean;
}

// Sidebar Nav Button (Desktop)
const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badge, collapsed }) => (
    <button
        onClick={onClick}
        className={`flex items-center transition-all relative group
            ${collapsed ? 'justify-center w-full py-4' : 'justify-start px-6 py-3 w-full gap-4'}
            ${active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}
        `}
        title={collapsed ? label : undefined}
    >
        <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-cyan-500/10' : 'group-hover:bg-white/5'}`}>
            {icon}
        </div>
        
        {!collapsed && (
            <span className="text-xs font-bold uppercase tracking-widest mt-0.5 animate-in fade-in duration-200">
                {label}
            </span>
        )}

        {badge !== undefined && badge > 0 && (
            <span className={`absolute bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full px-1 border border-black shadow-sm animate-in zoom-in
                ${collapsed ? 'top-2 right-4 min-w-[16px] h-4' : 'top-1/2 -translate-y-1/2 right-6 min-w-[18px] h-4.5'}
            `}>
                {badge}
            </span>
        )}
        
        {/* Active Indicator */}
        {active && (
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 bg-cyan-400 rounded-r-full shadow-[0_0_10px_rgba(34,211,238,0.5)] ${collapsed ? 'w-1 h-6' : 'w-1 h-8'}`}></div>
        )}
    </button>
);

// Mobile Bottom Nav Button
const MobileNavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, badge }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative group active:scale-95 transition-transform ${active ? 'text-cyan-400' : 'text-slate-500'}`}
    >
        <div className={`p-1.5 rounded-xl mb-0.5 transition-colors ${active ? 'bg-cyan-500/10' : ''}`}>
            {icon}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        
        {badge !== undefined && badge > 0 && (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] font-bold flex items-center justify-center rounded-full min-w-[14px] h-3.5 px-0.5 border border-black">
                {badge}
            </span>
        )}
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [transitionToast, setTransitionToast] = useState<{ visible: boolean; data: any } | null>(null);
  
  // Drawer/Sidebar State
  // Default to collapsed (false) on desktop for more space
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // Theme Logic
  const theme = useMemo(() => getGenreTheme(currentTrack), [currentTrack]);

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
  
  // Exclusive selection for split view
  const selectDirectoryExclusive = (dir: string) => {
      setEnabledDirectories([dir]);
      onGroupingModeChange('all'); // Show cards directly
  };

  const selectAllDirectories = () => {
      const allDirs = Array.from(new Set(playlist.map(t => t.location)));
      setEnabledDirectories(allDirs);
      onGroupingModeChange('folder'); // Restore accordion for mobile feeling or just standard view
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
    // If current track is not in queue (or queue is fresh), suggest first. If it is, suggest next.
    const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
    
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
      // Swipeable Wrapper for BOTH Card and List views
      // Swipe Right (->) : onLeftAction : Add Queue
      // Swipe Left (<-) : onRightAction : Load On Air
      return (
          <SwipeableItem 
              key={track.id} 
              onLeftAction={() => handleAddToQueue(undefined, track)}
              leftColor="bg-green-600"
              leftIcon={<PlusIcon className="w-8 h-8 text-white" />}
              onRightAction={() => handleSelectTrack(track)}
              rightColor="bg-cyan-600"
              rightIcon={<PlayIcon className="w-8 h-8 text-white" />}
          >
              <TrackItem 
                  track={track} 
                  onSelect={handleSelectTrack} 
                  isSelected={currentTrack?.id === track.id} 
                  isExpanded={expandedTrackId === track.id} 
                  onToggleExpand={() => handleToggleExpandTrack(track.id)} 
                  onAddToQueue={handleAddToQueue} 
                  variant={viewMode} 
                  searchQuery={searchQuery}
                  referenceTrack={currentTrack}
              />
          </SwipeableItem>
      );
  };

  // Helper to find predominant color for a folder
  const getPredominantColor = (tracks: Track[]) => {
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
      return dominant;
  };

  // Helper for folder icon color in sidebar
  const getFolderColor = (folderName: string) => {
      // We look at the full playlist to find tracks in this location
      const tracks = playlist.filter(t => t.location === folderName);
      return getPredominantColor(tracks);
  };

  // Calculate Header Logic: Which player to show?
  const headerPlayerProps = useMemo(() => {
      if (activeTab === 'deck') {
          // Show Next Track (if available) on Deck Tab
          return {
              playerTrack: nextTrackInfo?.track || null, // Might be null if queue empty
              playerVariant: 'next' as const,
              playerLabel: 'NEXT',
              onPlayerClick: nextTrackInfo?.track ? () => handleSelectTrack(nextTrackInfo.track!) : undefined
          };
      } else {
          // Show Current Track (On Air) on other tabs
          return {
              playerTrack: currentTrack,
              playerVariant: 'default' as const,
              playerLabel: undefined, // No label for On Air usually
              onPlayerClick: () => setActiveTab('deck')
          };
      }
  }, [activeTab, nextTrackInfo, currentTrack]);

  return (
    <div 
        className={`min-h-screen text-slate-200 font-sans selection:bg-cyan-500/30 transition-colors duration-1000 ease-in-out ${isHighContrast ? 'contrast-125 grayscale bg-black' : `bg-gradient-to-br ${theme.gradientFrom} via-slate-950 ${theme.gradientTo}`} ${!isHighContrast && 'aurora-bg'}`}
    >
      <Header 
        onReset={onReset} 
        showMenuButton={true} 
        onToggleMenu={() => setSidebarExpanded(!sidebarExpanded)} 
        {...headerPlayerProps}
      />
      
      {/* Toast Notification */}
      {transitionToast && (
          <TransitionToast 
            {...transitionToast.data} 
            onClose={() => setTransitionToast(null)} 
          />
      )}

      <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />

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

      {/* --- DESKTOP SIDEBAR (Collapsible) --- */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800 z-[80] pt-20 pb-4 transition-all duration-300 hidden md:flex flex-col
            ${sidebarExpanded ? 'w-64 px-2' : 'w-20 px-1 items-center'}
        `}
      >
          <div className="flex-1 space-y-2 w-full">
            <NavButton active={activeTab === 'deck'} onClick={() => setActiveTab('deck')} icon={<PlayIcon className="w-6 h-6" />} label={t.navDeck} collapsed={!sidebarExpanded} />
            <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<ListIcon className="w-6 h-6" />} label={t.navLib} collapsed={!sidebarExpanded} />
            <NavButton active={activeTab === 'mashup'} onClick={() => setActiveTab('mashup')} icon={<GitMergeIcon className="w-6 h-6" />} label="Mashup" collapsed={!sidebarExpanded} />
            <NavButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<LayersIcon className="w-6 h-6" />} label={t.navBuilder} badge={queue.length > 0 ? queue.length : undefined} collapsed={!sidebarExpanded} />
          </div>
          <div className="mt-auto w-full">
             <NavButton active={activeTab === 'setup'} onClick={() => setActiveTab('setup')} icon={<SettingsIcon className="w-6 h-6" />} label={t.navSetup} collapsed={!sidebarExpanded} />
          </div>
      </aside>

      {/* --- MAIN CONTENT CONTAINER --- */}
      <main 
        className={`pt-28 transition-all duration-300 flex flex-col
            ${sidebarExpanded ? 'md:ml-64' : 'md:ml-20'} 
            md:h-screen md:overflow-hidden min-h-screen
        `}
      >
        
        {/* TAB: DECK */}
        {activeTab === 'deck' && (
          <div className="flex-1 flex flex-col md:overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentTrack ? (
              <div className="md:grid md:grid-cols-12 md:gap-6 md:h-full md:px-6 md:pb-6 relative flex flex-col h-full px-4 pb-24">
                
                {/* 1. Left Column: On Air Card (FIXED HEIGHT ON DESKTOP) */}
                <div className="md:col-span-5 lg:col-span-5 md:h-full md:overflow-hidden flex-shrink-0 mb-4 md:mb-0">
                    <NowPlaying track={currentTrack} language={language} className="h-full" />
                </div>

                {/* 2. Right Column: Suggestions (SCROLLABLE ON DESKTOP) */}
                <div className="md:col-span-7 lg:col-span-7 md:h-full md:overflow-y-auto custom-scrollbar md:pr-2">
                    <SuggestionPanel currentTrack={currentTrack} playlist={playlist.filter(t => enabledDirectories.includes(t.location))} suggestions={suggestions} setSuggestions={setSuggestions} onSelectTrack={handleSelectTrack} onAddToQueue={(t) => handleAddToQueue(undefined, t)} language={language} />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 flex flex-col items-center justify-center h-full">
                <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 relative"><PlayIcon className="w-10 h-10 text-slate-500" /><div className="absolute -bottom-2 -right-2 bg-cyan-600 rounded-full p-2 animate-bounce"><CameraIcon className="w-5 h-5 text-white" /></div></div>
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white mb-2">{t.deckEmptyTitle}</h2>
                <p className="text-base text-slate-400 max-w-md">{t.deckEmptyMsg}</p>
                <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
                    <button onClick={() => setShowImageSourceModal(true)} disabled={isIdentifying} className="w-full py-4 bg-cyan-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">{isIdentifying ? (<RefreshCwIcon className="w-4 h-4 animate-spin" />) : (<CameraIcon className="w-4 h-4" />)} {isIdentifying ? t.analyzing : t.identifyBtn}</button>
                    <button onClick={() => setActiveTab('library')} className="w-full py-4 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">{t.openLib}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: LIBRARY (SPLIT VIEW) */}
        {activeTab === 'library' && (
          // CHANGED: Use grid with 5/7 proportion for tablet/desktop to match Deck layout
          <div className="flex-1 md:h-full md:grid md:grid-cols-12 md:gap-6 md:px-6 md:pb-6 relative flex flex-col h-full px-4 pb-24 md:overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ... Library Content ... */}
            <div className="w-full md:col-span-5 lg:col-span-5 flex-shrink-0 md:h-full md:border-r md:border-white/5 bg-[#020617]/95 md:bg-slate-950/40 backdrop-blur-xl md:backdrop-blur-none z-40 transition-all duration-300 flex flex-col rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 space-y-3">
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all pl-11 min-h-[50px] text-white placeholder-slate-500" />
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        </div>
                        <button onClick={() => onViewModeChange(viewMode === 'card' ? 'list' : 'card')} className={`px-4 rounded-xl border transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400'}`}>{viewMode === 'card' ? <LayersIcon className="w-5 h-5" /> : <ListIcon className="w-5 h-5" />}</button>
                    </div>
                    {currentTrack && (<div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">{filterPills.map((pill, idx) => (<button key={idx} onClick={pill.action} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all shadow-sm flex-shrink-0 ${pill.active ? 'bg-cyan-600 text-white border-cyan-400' : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:border-cyan-500 hover:text-white'}`}>{pill.label}</button>))}</div>)}
                    <LibraryFilters availableKeys={availableKeys} availableGenres={availableGenres} onFilterChange={setFilters} initialFilters={filters} />
                    <button onClick={onEnrich} disabled={isEnriching} className="w-full py-2 text-[10px] font-bold text-cyan-500 bg-cyan-900/20 border border-cyan-500/30 rounded-lg flex items-center justify-center gap-2 hover:bg-cyan-900/40 transition-colors disabled:opacity-50"><RefreshCwIcon className={`w-3 h-3 ${isEnriching ? 'animate-spin' : ''}`} /> {isEnriching ? t.analyzing : t.enrichBtn.toUpperCase()}</button>
                </div>
                <div className="hidden md:flex flex-col flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="space-y-1">
                        <button onClick={selectAllDirectories} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${enabledDirectories.length === uniqueDirectories.length ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><span>Todas as Faixas</span>{enabledDirectories.length === uniqueDirectories.length && <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>}</button>
                        {uniqueDirectories.map(dir => { const dirColor = getFolderColor(dir); return (<button key={dir} onClick={() => selectDirectoryExclusive(dir)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group truncate ${enabledDirectories.length === 1 && enabledDirectories[0] === dir ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><div className="flex items-center gap-2 truncate"><div style={{ color: dirColor || '#475569' }}><FolderIcon className="w-4 h-4 flex-shrink-0" /></div><span className="truncate">{dir}</span></div>{enabledDirectories.length === 1 && enabledDirectories[0] === dir && <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>}</button>) })}
                    </div>
                </div>
            </div>
            <div className="md:col-span-7 lg:col-span-7 flex-1 md:h-full md:overflow-y-auto custom-scrollbar md:pr-2 pt-4 md:pt-0 relative">
                <div className="md:hidden flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t.navLib}</span></div>
                {(groupingMode === 'all' || window.innerWidth >= 768) ? (<div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-1 gap-2 md:gap-3' : 'space-y-1.5'}>{filteredPlaylist.length > 0 ? (filteredPlaylist.map(track => renderTrackItem(track))) : (<div className="col-span-full py-20 text-center opacity-50 flex flex-col items-center"><FilterIcon className="w-12 h-12 mb-4 text-slate-600" /><p className="text-sm font-bold uppercase tracking-widest text-slate-500">{t.noTracksFound}</p></div>)}</div>) : (<div className="space-y-3">{Object.entries(groupedPlaylist).map(([folder, tracks]: [string, Track[]]) => { const folderColor = getPredominantColor(tracks) || ''; return (<div key={folder} className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden"><button onClick={() => toggleFolderAccordion(folder)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm"><div className="flex items-center gap-3 overflow-hidden"><div style={{ color: folderColor || '#06b6d4' }}><FolderIcon className="w-4 h-4 flex-shrink-0" /></div><span className="text-xs md:text-sm font-bold uppercase text-white break-words text-left">{folder}</span><span className="text-xs font-bold text-slate-500 bg-black/40 px-2 py-0.5 rounded-full flex-shrink-0">{tracks.length}</span></div><ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform duration-300 flex-shrink-0 ${expandedFolders.includes(folder) ? 'rotate-180' : ''}`} /></button>{expandedFolders.includes(folder) && (<div className={`p-2 border-t border-slate-800 bg-black/20 animate-in slide-in-from-top-2 ${viewMode === 'card' ? 'grid grid-cols-1 gap-2' : 'space-y-0.5'}`}>{tracks.map(track => renderTrackItem(track))}</div>)}</div>); })}</div>)}
            </div>
            <div className={`fixed right-4 z-50 ${currentTrack ? 'bottom-32 md:bottom-24' : 'bottom-24 md:bottom-8'}`}><button onClick={() => { const el = document.querySelector('.md\\:col-span-7.custom-scrollbar') || document.querySelector('main .overflow-y-auto'); if (el) { el.scrollTo({ top: 0, behavior: 'smooth' }); } else { window.scrollTo({ top: 0, behavior: 'smooth' }); } }} className="w-12 h-12 bg-cyan-600 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-90 transition-transform relative group overflow-hidden"><svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" /><circle cx="50" cy="50" r="46" stroke="white" strokeWidth="8" fill="none" strokeDasharray="289" strokeDashoffset={289 - (289 * scrollProgress)} className="transition-all duration-100 ease-linear" /></svg><ArrowUpIcon className="w-5 h-5 relative z-10" /></button></div>
          </div>
        )}
        
        {/* TAB: MASHUPS (Renovated Layout) */}
        {activeTab === 'mashup' && (
            <div className="flex-1 h-full md:overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <MashupFinder playlist={playlist} onSelectTrack={handleSelectTrack} onAddToQueue={(t) => handleAddToQueue(undefined, t)} language={language} />
            </div>
        )}

        {/* TAB: BUILDER (Renovated Layout) */}
        {activeTab === 'builder' && (
          <div className="flex-1 h-full md:overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             <SetBuilder queue={queue} setQueue={setQueue} onSelectTrack={handleSelectTrack} currentTrackId={currentTrack?.id} language={language} fullPlaylist={playlist} enabledDirectories={enabledDirectories} />
          </div>
        )}
        
        {/* TAB: BUILDER REVISITED - Cleanup */}
        {activeTab === 'builder' && (<div className="hidden"></div>)}

        {/* TAB: SETUP (Normal Scroll) */}
        {activeTab === 'setup' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4 max-w-2xl mx-auto">
                    {/* ... Setup Content ... */}
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
            </div>
        )}
      </main>

      {/* --- BOTTOM NAVIGATION (Mobile Only) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50 py-1.5 pb-safe z-[90]">
        <div className="container mx-auto flex justify-between items-center max-w-xl px-2">
            <MobileNavButton active={activeTab === 'deck'} onClick={() => setActiveTab('deck')} icon={<PlayIcon className="w-5 h-5" />} label={t.navDeck} />
            <MobileNavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<ListIcon className="w-5 h-5" />} label={t.navLib} />
            <MobileNavButton active={activeTab === 'mashup'} onClick={() => setActiveTab('mashup')} icon={<GitMergeIcon className="w-5 h-5" />} label="MASH" />
            <MobileNavButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<LayersIcon className="w-5 h-5" />} label={t.navBuilder} badge={queue.length > 0 ? queue.length : undefined} />
            <MobileNavButton active={activeTab === 'setup'} onClick={() => setActiveTab('setup')} icon={<SettingsIcon className="w-5 h-5" />} label={t.navSetup} />
        </div>
      </nav>
    </div>
  );
};
