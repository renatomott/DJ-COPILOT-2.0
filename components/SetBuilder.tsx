
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Track } from '../types';
import { TrackItem } from './TrackItem';
import { TrashIcon, DownloadIcon, BrainIcon, SparklesIcon, PlusIcon, SearchIcon, XIcon, ZapIcon, TrendingUpIcon, UploadIcon, LayersIcon, PlayIcon } from './icons';
import { translations } from '../utils/translations';
import { planAutoSet } from '../services/geminiService';
import { detectClash } from '../utils/harmonicUtils';
import { SwipeableItem } from './SwipeableItem';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';

interface SetBuilderProps {
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  onSelectTrack: (track: Track) => void;
  currentTrackId: string | undefined;
  language: 'pt-BR' | 'en-US';
  fullPlaylist?: Track[];
  enabledDirectories?: string[];
}

export const SetBuilder: React.FC<SetBuilderProps> = ({ queue, setQueue, onSelectTrack, currentTrackId, language, fullPlaylist = [], enabledDirectories = [] }) => {
  const t = translations[language];
  const [showPlanner, setShowPlanner] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [mustHaves, setMustHaves] = useState<Track[]>([]);
  const [planSearch, setPlanSearch] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  
  // Drag State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchDragInfo, setTouchDragInfo] = useState<{ startIndex: number; currentIndex: number; startY: number } | null>(null);
  
  const importFileRef = useRef<HTMLInputElement>(null);

  const [plannerParams, setPlannerParams] = useState({
      progression: 'Rising',
      length: 10,
      isStrict: false,
      minRating: 3,
      targetPlaylists: [] as string[],
      bpmMin: '',
      bpmMax: '',
      minEnergy: 0 // 0 = any
  });

  const availableFolders = useMemo(() => {
    // Show only folders that are currently enabled in the main settings
    const validDirs = enabledDirectories.length > 0 ? enabledDirectories : Array.from(new Set(fullPlaylist.map(t => t.location)));
    return validDirs.sort();
  }, [fullPlaylist, enabledDirectories]);

  const toggleTargetPlaylist = (folder: string) => {
    setPlannerParams(p => ({
        ...p,
        targetPlaylists: p.targetPlaylists.includes(folder) 
            ? p.targetPlaylists.filter(f => f !== folder)
            : [...p.targetPlaylists, folder]
    }));
  };
  
  const handleRemove = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
    }
  };

  const handleToggleExpand = (key: string) => {
      setExpandedKey(prev => prev === key ? null : key);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (queue.length === 0) return;
    if (window.confirm(t.confirmDownloadBeforeClear)) {
        exportBoth();
    }
    if (window.confirm(t.resetConfirm)) {
      setQueue([]);
    }
  };

  const exportBoth = () => {
      exportTXT();
      exportPDF();
  };

  const exportTXT = () => {
      if (queue.length === 0) return;
      const dateStr = new Date().toLocaleDateString();
      let content = `DJ COPILOT 2.0 - PERFORMANCE SHEET\n`;
      content += `Data: ${dateStr} | Músicas: ${queue.length} | Progressão: ${plannerParams.progression}\n`;
      content += `------------------------------------------\n\n`;
      queue.forEach((t, i) => {
          content += `${(i + 1).toString().padStart(2, '0')}. ${t.artist} - ${t.name} [${t.bpm} BPM | ${t.key} | ${t.duration}]\n`;
      });
      content += `\n------------------------------------------\n`;
      content += `APP_METADATA_START\n`;
      content += JSON.stringify(queue.map(t => t.id));
      content += `\nAPP_METADATA_END`;
      downloadFile(content, getSuggestedFileName('txt'), 'text/plain');
  };

  const exportPDF = () => {
      if (queue.length === 0) return;
      const doc = new jsPDF();
      const dateStr = new Date().toLocaleDateString();
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("DJ COPILOT 2.0", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`SETLIST PERFORMANCE • ${dateStr.toUpperCase()}`, 14, 32);

      const tableData = queue.map((t, i) => {
          const starsCount = t.rating > 5 ? Math.round(t.rating / 20) : t.rating;
          const ratingStr = `${starsCount}/5`;
          
          return [
            (i + 1).toString(),
            t.name,
            t.artist,
            t.bpm,
            t.key,
            t.duration,
            ratingStr
          ];
      });

      // @ts-ignore
      doc.autoTable({
          startY: 45,
          head: [['#', 'TRACK NAME', 'ARTIST', 'BPM', 'KEY', 'TIME', 'RATING']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
          columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 'auto', fontStyle: 'bold' },
              3: { cellWidth: 15, halign: 'center' },
              4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
              5: { cellWidth: 15, halign: 'center' },
              6: { cellWidth: 22, halign: 'center', textColor: [30, 41, 59], fontStyle: 'bold' }
          }
      });

      doc.save(getSuggestedFileName('pdf'));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const metaStart = text.indexOf('APP_METADATA_START');
              const metaEnd = text.indexOf('APP_METADATA_END');
              
              if (metaStart === -1 || metaEnd === -1) throw new Error("Invalid format");
              
              const idsJson = text.substring(metaStart + 19, metaEnd).trim();
              const ids = JSON.parse(idsJson);
              if (Array.isArray(ids)) {
                  const importedQueue = ids.map((id: string) => fullPlaylist.find(t => t.id === id)).filter((t: any) => !!t);
                  if (importedQueue.length > 0) {
                      setQueue(importedQueue);
                      alert(t.setImported);
                  } else {
                      throw new Error("No tracks found in library");
                  }
              }
          } catch (err) {
              alert(t.errorImport);
          }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  const getSuggestedFileName = (ext: string) => {
      const date = new Date().toISOString().split('T')[0];
      const prog = plannerParams.progression.toLowerCase();
      return `Playlist_${date}_${queue.length}_tracks_${prog}.${ext}`;
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleAutoPlan = async () => {
      if (fullPlaylist.length === 0) return;
      setIsPlanning(true);
      try {
          const currentTrack = fullPlaylist.find(t => t.id === currentTrackId) || null;
          
          const params = {
              ...plannerParams,
              bpmRange: (plannerParams.bpmMin && plannerParams.bpmMax) 
                  ? { min: parseFloat(plannerParams.bpmMin), max: parseFloat(plannerParams.bpmMax) } 
                  : undefined
          };

          const sequence = await planAutoSet(fullPlaylist, currentTrack, mustHaves, params, language);
          if (sequence && sequence.length > 0) {
              setQueue(sequence);
              setShowPlanner(false);
              setMustHaves([]);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setIsPlanning(false);
      }
  };

  const filteredSearch = useMemo(() => {
      if (!planSearch || planSearch.length < 2) return [];
      return fullPlaylist.filter(t => 
        (t.name.toLowerCase().includes(planSearch.toLowerCase()) || 
         t.artist.toLowerCase().includes(planSearch.toLowerCase())) &&
        !mustHaves.find(m => m.id === t.id)
      ).slice(0, 5);
  }, [planSearch, fullPlaylist, mustHaves]);

  const toggleMustHave = (track: Track) => {
      if (mustHaves.find(m => m.id === track.id)) {
          setMustHaves(prev => prev.filter(m => m.id !== track.id));
      } else {
          setMustHaves(prev => [...prev, track]);
          setPlanSearch('');
      }
  };

  const matchingCount = useMemo(() => {
      return fullPlaylist.filter(t => {
          const bpm = parseFloat(t.bpm) || 0;
          const matchesRating = t.rating >= plannerParams.minRating;
          const matchesPlaylist = plannerParams.targetPlaylists.length === 0 || plannerParams.targetPlaylists.includes(t.location);
          const matchesBpm = (!plannerParams.bpmMin || bpm >= parseFloat(plannerParams.bpmMin)) && 
                             (!plannerParams.bpmMax || bpm <= parseFloat(plannerParams.bpmMax));
          const matchesEnergy = (!plannerParams.minEnergy || (t.energy || 0) >= plannerParams.minEnergy);
          return matchesRating && matchesPlaylist && matchesBpm && matchesEnergy;
      }).length;
  }, [fullPlaylist, plannerParams]);

  // --- DESKTOP DRAG & DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      // Fallback for invisible image if needed
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault(); 
      if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      if (draggedIndex === null) return;
      moveItem(draggedIndex, index);
      setDraggedIndex(null);
  };

  // --- MOBILE TOUCH DRAG HANDLERS ---
  // Implements custom logic since HTML5 DnD doesn't work on touch
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
      e.stopPropagation(); // Stop SwipeableItem and others
      const touch = e.touches[0];
      setTouchDragInfo({ 
          startIndex: index, 
          currentIndex: index, 
          startY: touch.clientY 
      });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchDragInfo) return;
      
      // Prevent scrolling the page while reordering
      if (e.cancelable) e.preventDefault(); 
      
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Find the row under the finger
      const row = target?.closest('[data-queue-index]');
      if (row) {
          const newIndex = parseInt(row.getAttribute('data-queue-index') || '-1');
          if (newIndex !== -1 && newIndex !== touchDragInfo.currentIndex) {
              setTouchDragInfo(prev => prev ? { ...prev, currentIndex: newIndex } : null);
          }
      }
  };

  const handleTouchEnd = () => {
      if (touchDragInfo) {
          if (touchDragInfo.startIndex !== touchDragInfo.currentIndex) {
              moveItem(touchDragInfo.startIndex, touchDragInfo.currentIndex);
          }
          setTouchDragInfo(null);
      }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
      const newQueue = [...queue];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);
      setQueue(newQueue);
  };

  return (
    <div className="h-full md:grid md:grid-cols-12 md:gap-6 md:px-6 md:pb-6 relative flex flex-col px-4 pb-24 md:overflow-hidden">
      <input type="file" ref={importFileRef} className="hidden" accept=".txt" onChange={handleImport} />
      
      {/* --- Column 1: Planner & Tools (Sticky on Desktop) --- */}
      <div className="w-full md:col-span-5 lg:col-span-5 flex-shrink-0 md:h-full md:border-r md:border-white/5 bg-[#020617]/95 md:bg-slate-950/40 backdrop-blur-xl md:backdrop-blur-none z-40 transition-all duration-300 flex flex-col rounded-xl overflow-hidden mb-4 md:mb-0">
          <div className="p-3 border-b border-white/5 space-y-2 overflow-y-auto custom-scrollbar h-full">
                
                {/* Header */}
                <div className="flex items-center justify-between relative z-30 mb-2">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <LayersIcon className="w-5 h-5 text-cyan-400" />
                        {t.navBuilder}
                    </h2>
                    
                    {/* Action Bar */}
                    <div className="flex gap-2 w-full md:w-auto justify-end">
                        <button 
                            onClick={() => setShowPlanner(!showPlanner)} 
                            className={`p-2 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center border ${showPlanner ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800'}`}
                            title={t.plannerTitle}
                        >
                            <SparklesIcon className="w-4 h-4" />
                        </button>
                        {queue.length > 0 ? (
                            <>
                                <button onClick={exportBoth} className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg min-h-[36px]">
                                    <DownloadIcon className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleClear} 
                                    className="p-2 bg-red-950/20 rounded-lg text-red-500 hover:bg-red-900/40 border border-red-500/30 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center shadow-lg active:scale-95"
                                    title="Limpar Set"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => importFileRef.current?.click()} className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors min-h-[36px]">
                                <UploadIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                
                {/* PLANNER UI - Compact Layout */}
                {(showPlanner || window.innerWidth >= 768) && (
                    <div className={`bg-gradient-to-br from-cyan-950/20 via-slate-950/50 to-black/50 rounded-2xl border border-cyan-500/20 shadow-lg animate-in fade-in duration-300 overflow-hidden ${window.innerWidth >= 768 && !showPlanner ? 'hidden md:block' : ''}`}>
                            <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1 bg-cyan-600 rounded-lg shadow-lg shadow-cyan-500/20">
                                        <BrainIcon className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">{t.plannerTitle}</h3>
                                </div>
                                {/* Simple Count Badge */}
                                <div className="bg-black/40 px-2 py-1 rounded text-xs font-mono font-bold text-cyan-400 border border-cyan-500/20" title={t.matchingTracks}>
                                    {matchingCount}
                                </div>
                            </div>

                            <div className="p-3 space-y-2.5">
                                {/* Row 1: Mode & Length */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex p-0.5 bg-black/60 rounded-lg border border-white/5">
                                        <button onClick={() => setPlannerParams(p => ({...p, isStrict: false}))} className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${!plannerParams.isStrict ? 'bg-slate-800 text-cyan-400 shadow-lg' : 'text-gray-500'}`}>
                                            Pref.
                                        </button>
                                        <button onClick={() => setPlannerParams(p => ({...p, isStrict: true}))} className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${plannerParams.isStrict ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500'}`}>
                                            Obg.
                                        </button>
                                    </div>
                                    
                                    <div className="flex p-0.5 bg-black/60 rounded-lg border border-white/5">
                                        {[5, 10, 15, 20].map(len => (
                                            <button key={len} onClick={() => setPlannerParams(p => ({...p, length: len}))} className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${plannerParams.length === len ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                                                {len}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Row 2: Progression */}
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">{t.progression}</label>
                                    <div className="flex gap-1">
                                        {['Linear', 'Rising', 'Chaos'].map(prog => (
                                            <button 
                                                key={prog}
                                                onClick={() => setPlannerParams(p => ({...p, progression: prog}))}
                                                className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${plannerParams.progression === prog ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}
                                            >
                                                {prog === 'Rising' && <TrendingUpIcon className="w-3 h-3 inline mr-1" />}
                                                {prog}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Row 3: Technical Filters */}
                                <div className="grid grid-cols-2 gap-2">
                                    {/* BPM Range */}
                                    <div>
                                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">BPM Range</label>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                placeholder="Min" 
                                                value={plannerParams.bpmMin} 
                                                onChange={(e) => setPlannerParams(p => ({...p, bpmMin: e.target.value}))}
                                                className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-center text-xs font-mono text-white focus:border-cyan-500 outline-none font-bold" 
                                            />
                                            <span className="text-white/20 font-bold">-</span>
                                            <input 
                                                type="number" 
                                                placeholder="Max" 
                                                value={plannerParams.bpmMax} 
                                                onChange={(e) => setPlannerParams(p => ({...p, bpmMax: e.target.value}))}
                                                className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-center text-xs font-mono text-white focus:border-cyan-500 outline-none font-bold" 
                                            />
                                        </div>
                                    </div>

                                    {/* Energy */}
                                    <div>
                                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">Min Energy</label>
                                        <div className="flex gap-0.5 h-[32px]">
                                            {[0, 1, 2, 3, 4, 5].map(lvl => (
                                                <button 
                                                    key={lvl} 
                                                    onClick={() => setPlannerParams(p => ({...p, minEnergy: lvl}))}
                                                    className={`flex-1 rounded-md text-[10px] font-bold border transition-all ${plannerParams.minEnergy === lvl ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-black/40 border-white/5 text-gray-600 hover:bg-white/5'}`}
                                                >
                                                    {lvl === 0 ? 'All' : lvl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Mandatory Tracks */}
                                <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">{t.mandatoryTracks}</label>
                                    
                                    {/* List Selected */}
                                    {mustHaves.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {mustHaves.map(m => (
                                                <span key={m.id} className="flex items-center gap-1 bg-cyan-900/30 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[9px] font-bold">
                                                    {m.name}
                                                    <button onClick={() => toggleMustHave(m)} className="hover:text-white"><XIcon className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Search Input */}
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder={t.searchToPlan} 
                                            value={planSearch}
                                            onChange={(e) => setPlanSearch(e.target.value)}
                                            className="w-full bg-black/60 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-xs font-bold text-white focus:border-cyan-500 outline-none"
                                        />
                                        <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {filteredSearch.length > 0 && (
                                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                            {filteredSearch.map(t => (
                                                <div 
                                                    key={t.id} 
                                                    onClick={() => toggleMustHave(t)}
                                                    className="flex items-center justify-between p-1.5 hover:bg-white/10 rounded-lg cursor-pointer group"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{t.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{t.artist}</p>
                                                    </div>
                                                    <PlusIcon className="w-3.5 h-3.5 text-cyan-500 opacity-0 group-hover:opacity-100" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Playlists - Enhanced Filtering */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">{t.targetPlaylists}</label>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                                        {availableFolders.length > 0 ? availableFolders.map(folder => (
                                            <button key={folder} onClick={() => toggleTargetPlaylist(folder)} className={`px-2 py-1 rounded-md border text-[9px] font-bold transition-all ${plannerParams.targetPlaylists.includes(folder) ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}>
                                                {folder}
                                            </button>
                                        )) : (
                                            <p className="text-[10px] text-slate-500 italic">Nenhuma playlist habilitada nas configurações.</p>
                                        )}
                                    </div>
                                </div>
                                
                                <button onClick={handleAutoPlan} disabled={isPlanning || fullPlaylist.length === 0} className="w-full py-3 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-cyan-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-h-[40px]">
                                    {isPlanning ? (<><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> {t.addingToQueue}</>) : (<><ZapIcon className="w-4 h-4 text-cyan-600" /> {t.btnPlan}</>)}
                                </button>
                            </div>
                    </div>
                )}
          </div>
      </div>
      
      {/* --- Column 2: List content (Right Side) --- */}
      <div className="md:col-span-7 lg:col-span-7 flex-1 md:h-full md:overflow-y-auto custom-scrollbar md:pr-2 pt-4 md:pt-0 relative">
          <div className="hidden md:flex items-center justify-between mb-4 sticky top-0 bg-[#020617]/95 backdrop-blur-sm p-2 z-10 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">{t.yourSet} ({queue.length})</h2>
          </div>

          {queue.length > 0 ? (
            <div 
                className="space-y-4 px-1 pb-20"
            >
                {queue.map((track, index) => {
                    let transitionInfo = null;
                    const isOnAir = track.id === currentTrackId;
                    
                    const isDuplicate = queue.filter(t => t.id === track.id).length > 1;
                    const uniqueKey = isDuplicate ? `${track.id}-${index}` : track.id;
                    
                    const isExpanded = expandedKey === uniqueKey;
                    const isDragging = draggedIndex === index;
                    const isTouchTarget = touchDragInfo?.currentIndex === index;

                    if (index > 0) {
                        const prev = queue[index-1];
                        const clashInfo = detectClash(prev.key, prev.bpm, track.key, track.bpm);
                        const bpmDiffVal = parseFloat(track.bpm) - parseFloat(prev.bpm);
                        const bpmDiff = bpmDiffVal > 0 ? `+${bpmDiffVal.toFixed(1)}` : bpmDiffVal.toFixed(1);
                        
                        // Visual Connection Line Logic
                        const lineColor = clashInfo.hasClash 
                            ? (clashInfo.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500') 
                            : 'bg-green-500';
                        const textColor = clashInfo.hasClash 
                            ? (clashInfo.severity === 'critical' ? 'text-red-400' : 'text-yellow-400') 
                            : 'text-green-400';

                        transitionInfo = (
                            <div className="flex justify-center items-center py-2 relative">
                                {/* Visual Connection Line */}
                                <div className={`h-8 w-0.5 ${lineColor} absolute top-[-1rem] opacity-50`}></div>
                                <div className={`bg-black/90 border border-white/10 rounded-full px-4 py-1.5 font-mono font-bold flex gap-4 shadow-xl z-10 ${textColor}`}>
                                    <span className={`text-base md:text-lg ${track.key === prev.key ? 'text-white' : 'text-slate-400'}`}>{prev.key} → {track.key}</span>
                                    <div className="w-px h-4 bg-slate-700/50 self-center"></div>
                                    <span className="text-base md:text-lg">{bpmDiff} BPM</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div 
                            key={uniqueKey} 
                            data-queue-index={index}
                            className={`animate-in slide-in-from-left-2 transition-all duration-200 
                                ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'} 
                                ${isTouchTarget && touchDragInfo ? 'border-t-4 border-cyan-500 pt-2' : ''}
                            `}
                            draggable={!isExpanded} 
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            {transitionInfo}
                            
                            <SwipeableItem 
                                // Drag Right (>>): Delete
                                onLeftAction={() => handleRemove(index)}
                                leftColor="bg-red-600"
                                leftIcon={<TrashIcon className="w-8 h-8 text-white" />}
                                // Drag Left (<<): Load On Air
                                onRightAction={() => onSelectTrack(track)}
                                rightColor="bg-cyan-600"
                                rightIcon={<PlayIcon className="w-8 h-8 text-white" />}
                            >
                                <div className="relative group flex items-stretch gap-3">
                                    {/* Drag Handle Area - Now with TOUCH support */}
                                    <div 
                                        className="flex-shrink-0 w-8 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
                                        onTouchStart={(e) => handleTouchStart(e, index)}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        <div className={`text-xs font-black ${isOnAir ? 'text-cyan-400' : 'text-slate-600'} mb-0.5`}>{index + 1}</div>
                                        <div className={`flex-1 w-[3px] bg-gradient-to-b ${isOnAir ? 'from-cyan-400' : 'from-slate-800'} to-transparent rounded-full`}></div>
                                    </div>
                                    
                                    <div className="flex-1 relative pb-1">
                                        <div className={`relative overflow-hidden rounded-xl transition-all duration-300 ${isOnAir ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black scale-[1.01] shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'hover:scale-[1.01]'}`}>
                                            <TrackItem 
                                                track={track} 
                                                onSelect={(t) => onSelectTrack(t)} 
                                                isSelected={currentTrackId === track.id} 
                                                isOnAir={isOnAir}
                                                isExpanded={isExpanded}
                                                onToggleExpand={() => handleToggleExpand(uniqueKey)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </SwipeableItem>
                        </div>
                    );
                })}
            </div>
          ) : (
            <div className="h-64 md:h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl opacity-50">
                <p className="text-white font-bold uppercase tracking-widest">{t.emptyBuilder}</p>
                <p className="text-xs text-slate-500 mt-2 max-w-xs">{t.emptyBuilderSub}</p>
            </div>
          )}
      </div>
    </div>
  );
};
