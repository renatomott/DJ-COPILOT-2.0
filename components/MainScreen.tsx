
import React, { useState, useMemo } from 'react';
import type { Track, Suggestion } from '../types';
import { translations } from '../utils/translations';
import { 
    ListIcon, 
    LayersIcon, 
    SettingsIcon, 
    PlayIcon, 
    ChevronDownIcon, 
    RefreshCwIcon,
    SearchIcon
} from './icons';
import { NowPlaying } from './NowPlaying';
import { SuggestionPanel } from './SuggestionPanel';
import { TrackItem } from './TrackItem';
import { SetBuilder } from './SetBuilder';
import { LibraryFilters, FilterState } from './LibraryFilters';
import { Header } from './Header';

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
  const [activeTab, setActiveTab] = useState<'deck' | 'library' | 'builder' | 'setup'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ minBpm: '', maxBpm: '', keys: [], genres: [] });
  
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

      <main className="container mx-auto px-4 pt-20 pb-28 max-w-lg">
        {activeTab === 'deck' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <PlayIcon className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                <p className="text-lg font-black uppercase tracking-widest">{t.deckEmptyTitle}</p>
                <p className="text-sm mt-2">{t.deckEmptyMsg}</p>
                <button 
                    onClick={() => setActiveTab('library')}
                    className="mt-8 px-6 py-3 bg-cyan-600 text-white rounded-full font-black text-xs uppercase tracking-widest"
                >
                    {t.openLib}
                </button>
              </div>
            )}

            {/* MINI PLAYER / QUEUE BUTTON - APENAS NA ABA DECK */}
            {nextTrackInfo && (
                <div className="fixed bottom-24 left-4 right-4 z-[100] pointer-events-none">
                    <div className="pointer-events-auto w-full bg-cyan-600/90 backdrop-blur-xl text-white rounded-2xl p-2.5 shadow-[0_10px_40px_rgba(6,182,212,0.4)] border border-cyan-400/30 flex items-center min-h-[64px] animate-in slide-in-from-bottom-5 active:scale-[0.98] transition-all">
                        <button 
                            onClick={(e) => { e.stopPropagation(); triggerHaptic(); handleSelectTrack(nextTrackInfo.track); }}
                            className="bg-black/30 p-2.5 rounded-xl flex-shrink-0 shadow-inner hover:bg-black/50 transition-colors mr-3 active:scale-90"
                            title={t.loadDeck}
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
                                        <span className="bg-black/30 px-1.5 py-0.5 rounded text-[9px] font-black text-white">{nextTrackInfo.currentNum}</span>
                                        <span className="text-[9px] font-black text-white/40">/</span>
                                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-black text-white">{nextTrackInfo.totalNum}</span>
                                        <span className="text-[9px] font-black text-white/40 mx-0.5">|</span>
                                        <span className="text-[9px] font-black text-white/90">{nextTrackInfo.track.duration}</span>
                                    </div>
                                </div>
                                <p className="text-sm font-black truncate text-white tracking-tight leading-tight">{nextTrackInfo.track.name}</p>
                                <p className="text-[9px] font-bold text-cyan-100 opacity-60 truncate uppercase tracking-wider">{nextTrackInfo.track.location}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <div className="bg-black/20 px-2 py-1.5 rounded-lg border border-white/10 group-hover:border-white/30 transition-colors">
                                    <span className="text-[10px] font-black font-mono text-white">{nextTrackInfo.track.key}</span>
                                </div>
                                <ChevronDownIcon className="w-4 h-4 text-white/40 -rotate-90 group-hover:text-white transition-colors" />
                            </div>
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
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all pl-11"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
                <button 
                    onClick={onEnrich}
                    disabled={isEnriching}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50"
                    title={t.enrichBtn}
                >
                    <RefreshCwIcon className={`w-5 h-5 text-cyan-400 ${isEnriching ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <LibraryFilters 
                availableKeys={availableKeys}
                availableGenres={availableGenres}
                onFilterChange={setFilters}
                initialFilters={filters}
            />

            <div className="space-y-2 mt-6">
                <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t.navLib}</span>
                    <span className="text-[10px] font-black text-cyan-500">{filteredPlaylist.length} {t.trackCount}</span>
                </div>
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

        {activeTab === 'setup' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <h2 className="text-xl font-black text-white px-1">{t.settingsTitle}</h2>
                
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4">{t.automationTitle}</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-white">{t.autoEnrichTitle}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{t.autoEnrichDesc}</p>
                        </div>
                        <button 
                            onClick={() => onAutoEnrichChange(!autoEnrichEnabled)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${autoEnrichEnabled ? 'bg-cyan-500' : 'bg-slate-800'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${autoEnrichEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4">{t.langTitle}</h3>
                    <div className="flex bg-black/40 p-1 rounded-xl">
                        <button 
                            onClick={() => setLanguage('pt-BR')}
                            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${language === 'pt-BR' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            PORTUGUÊS
                        </button>
                        <button 
                            onClick={() => setLanguage('en-US')}
                            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${language === 'en-US' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            ENGLISH
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4">{t.accessTitle}</h3>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-sm font-bold text-white">{t.highContrastTitle}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{t.highContrastDesc}</p>
                        </div>
                        <button 
                            onClick={() => onHighContrastChange(!isHighContrast)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isHighContrast ? 'bg-cyan-500' : 'bg-slate-800'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isHighContrast ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white mb-3">{t.fontSize}</p>
                        <div className="flex gap-2">
                            {[80, 100, 120].map(scale => (
                                <button 
                                    key={scale}
                                    onClick={() => onFontScaleChange(scale)}
                                    className={`flex-1 py-3 border rounded-xl text-[10px] font-black uppercase transition-all ${fontScale === scale ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                >
                                    {scale === 80 ? t.compact : scale === 100 ? t.standard : t.large}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-2 border-dashed border-red-900/30 rounded-3xl">
                    <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-4">{t.criticalMgmt}</h3>
                    <div className="space-y-3">
                         <button 
                            onClick={() => onReset()}
                            className="w-full py-4 bg-red-950/20 text-red-500 border border-red-900/30 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-900/40 transition-all"
                         >
                            {t.clearAll}
                         </button>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50 p-2 pb-8 z-[90]">
        <div className="container mx-auto flex justify-between items-center max-w-lg">
            <NavButton 
                active={activeTab === 'deck'} 
                onClick={() => setActiveTab('deck')} 
                icon={<PlayIcon className="w-5 h-5" />} 
                label={t.navDeck} 
            />
            <NavButton 
                active={activeTab === 'library'} 
                onClick={() => setActiveTab('library')} 
                icon={<ListIcon className="w-5 h-5" />} 
                label={t.navLib} 
            />
            <NavButton 
                active={activeTab === 'builder'} 
                onClick={() => setActiveTab('builder')} 
                icon={<LayersIcon className="w-5 h-5" />} 
                label={t.navBuilder} 
                badge={queue.length > 0 ? queue.length : undefined}
            />
            <NavButton 
                active={activeTab === 'setup'} 
                onClick={() => setActiveTab('setup')} 
                icon={<SettingsIcon className="w-5 h-5" />} 
                label={t.navSetup} 
            />
        </div>
      </nav>
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
        className={`flex flex-col items-center justify-center flex-1 py-2 rounded-2xl transition-all relative ${active ? 'text-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
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
        {active && <div className="absolute -bottom-1 w-1 h-1 bg-cyan-400 rounded-full" />}
    </button>
);
