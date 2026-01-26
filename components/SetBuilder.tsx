
import React, { useState, useMemo, useRef } from 'react';
import type { Track } from '../types';
import { TrackItem } from './TrackItem';
import { TrashIcon, ArrowUpIcon, SaveIcon, DownloadIcon, WandSparklesIcon, RefreshCwIcon, BrainIcon, SparklesIcon, ChevronDownIcon, MusicIcon, PlusIcon, SearchIcon, XIcon, ZapIcon, StarIcon, FolderIcon, ListIcon, ClockIcon, ActivityIcon, UploadIcon, PlayIcon, BarChartIcon } from './icons';
import { translations } from '../utils/translations';
import { planAutoSet } from '../services/geminiService';
import { Loader } from './Loader';
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
}

interface SwipeableRowProps {
    children: React.ReactNode;
    onDelete: () => void;
}

// SwipeableRow implementation remains the same
const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, onDelete }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        setIsSwiping(false);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX.current;
        const diffY = currentY - startY.current;
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        if (diffX < 0) {
            if (e.cancelable && Math.abs(diffX) > 10) e.preventDefault();
            setIsSwiping(true);
            setOffsetX(Math.max(diffX, -120));
        }
    };

    const handleTouchEnd = () => {
        if (offsetX < -80) {
            setOffsetX(-500);
            setTimeout(() => {
                onDelete();
                setOffsetX(0);
            }, 300);
        } else {
            setOffsetX(0);
        }
        setIsSwiping(false);
    };

    return (
        <div className="relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-xl">
                <TrashIcon className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div
                className="relative bg-[#020617] transition-transform duration-200 ease-out will-change-transform"
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
};

// Simple Energy Timeline Component
const EnergyTimeline: React.FC<{ queue: Track[] }> = ({ queue }) => {
    if (queue.length < 2) return null;

    const points = queue.map((t, i) => {
        const energy = t.energy || 3; // Default to mid if unknown
        const x = (i / (queue.length - 1)) * 100;
        const y = 100 - (energy * 20); // Scale 1-5 to 0-100% (inverted for SVG)
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="mb-4 bg-slate-900/50 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <BarChartIcon className="w-3 h-3 text-cyan-400" />
                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Fluxo de Energia</span>
            </div>
            <div className="h-12 w-full relative">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="energyGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={`M0,100 ${points} 100,100`} fill="url(#energyGradient)" />
                    <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    {queue.map((t, i) => (
                        <circle 
                            key={i} 
                            cx={(i / (queue.length - 1)) * 100} 
                            cy={100 - ((t.energy || 3) * 20)} 
                            r="1.5" 
                            fill="#fff" 
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};

export const SetBuilder: React.FC<SetBuilderProps> = ({ queue, setQueue, onSelectTrack, currentTrackId, language, fullPlaylist = [] }) => {
  const t = translations[language];
  const [showPlanner, setShowPlanner] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [mustHaves, setMustHaves] = useState<Track[]>([]);
  const [planSearch, setPlanSearch] = useState('');
  const [isBrowsingFolders, setIsBrowsingFolders] = useState(false);
  const [selectedBrowseFolder, setSelectedBrowseFolder] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [plannerParams, setPlannerParams] = useState({
      progression: 'Rising',
      length: 10,
      isStrict: false,
      minRating: 0,
      targetPlaylists: [] as string[]
  });

  const availableFolders = useMemo(() => {
    const folders = new Set<string>();
    fullPlaylist.forEach(t => folders.add(t.location));
    return Array.from(folders).sort();
  }, [fullPlaylist]);

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

  const exportM3U = () => {
    if (queue.length === 0) return;
    const m3uContent = "#EXTM3U\n" + queue.map(t => `#EXTINF:${parseInt(t.duration) || 0},${t.artist} - ${t.name}\n${t.location}`).join('\n');
    downloadFile(m3uContent, getSuggestedFileName('m3u'), 'audio/x-mpegurl');
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
          const sequence = await planAutoSet(fullPlaylist, currentTrack, mustHaves, plannerParams, language);
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

  const filteredLibraryForPlan = useMemo(() => {
      if (!planSearch || planSearch.length < 2) return [];
      return fullPlaylist.filter(t => 
        (t.name.toLowerCase().includes(planSearch.toLowerCase()) || 
         t.artist.toLowerCase().includes(planSearch.toLowerCase())) &&
        !mustHaves.find(m => m.id === t.id)
      ).slice(0, 5);
  }, [planSearch, fullPlaylist, mustHaves]);

  const tracksInSelectedFolder = useMemo(() => {
      if (!selectedBrowseFolder) return [];
      return fullPlaylist.filter(t => t.location === selectedBrowseFolder);
  }, [selectedBrowseFolder, fullPlaylist]);

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
          const matchesRating = t.rating >= plannerParams.minRating;
          const matchesPlaylist = plannerParams.targetPlaylists.length === 0 || plannerParams.targetPlaylists.includes(t.location);
          return matchesRating && matchesPlaylist;
      }).length;
  }, [fullPlaylist, plannerParams.minRating, plannerParams.targetPlaylists]);

  const renderRatingMini = (rating: number) => {
      const stars = rating > 5 ? Math.round(rating / 20) : rating;
      return (
          <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                  <StarIcon key={s} className={`w-2 h-2 ${s <= stars ? 'text-yellow-500 fill-current' : 'text-white/5'}`} />
              ))}
          </div>
      );
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-right-4 duration-500">
      <input type="file" ref={importFileRef} className="hidden" accept=".txt" onChange={handleImport} />
      
      <div className="flex items-center justify-between mb-4 px-1 relative z-30">
        <h2 className="text-xl font-bold text-white">{t.yourSet} {queue.length}</h2>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowPlanner(!showPlanner)} 
                className={`p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border ${showPlanner ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-cyan-400 hover:bg-slate-800'}`}
                title={t.plannerTitle}
            >
                <SparklesIcon className="w-5 h-5" />
            </button>
            {queue.length > 0 ? (
                <>
                    <button onClick={exportBoth} className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg min-h-[44px]">
                        <DownloadIcon className="w-4 h-4" />
                        <span className="hidden xs:inline">{t.downloadAll}</span>
                        <span className="xs:hidden">EXP</span>
                    </button>
                    <button onClick={exportM3U} className="px-3 py-2 bg-cyan-600 border border-cyan-400 rounded-lg text-white font-bold text-xs flex items-center gap-2 hover:bg-cyan-500 transition-colors shadow-lg min-h-[44px]">
                        <span className="hidden xs:inline">.M3U</span>
                        <span className="xs:hidden">M3U</span>
                    </button>
                    <button 
                        onClick={handleClear} 
                        className="p-2 bg-red-950/20 rounded-lg text-red-500 hover:bg-red-900/40 border border-red-500/30 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shadow-lg active:scale-95"
                        title="Limpar Set"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </>
            ) : (
                <button onClick={() => importFileRef.current?.click()} className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-cyan-400 font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-colors min-h-[44px]">
                    <UploadIcon className="w-4 h-4" />
                    <span>{t.importPlan}</span>
                </button>
            )}
        </div>
      </div>
      
      {queue.length > 0 && <EnergyTimeline queue={queue} />}

      {showPlanner && (
          // Planner Modal Content (same as before, just adding wrapper for better transition potentially later)
          <div className="mb-6 bg-gradient-to-br from-cyan-950/40 via-slate-950 to-black rounded-3xl border border-cyan-500/30 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-600 rounded-xl shadow-lg shadow-cyan-500/20">
                            <BrainIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t.plannerTitle}</h3>
                            <p className="text-[10px] text-cyan-300 font-bold opacity-80">{t.plannerSub}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-white/40 uppercase">{t.matchingTracks}</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">{matchingCount}</span>
                    </div>
                </div>

                <div className="p-5 space-y-6">
                    <div className="flex p-1 bg-black/60 rounded-xl border border-white/5">
                        <button onClick={() => setPlannerParams(p => ({...p, isStrict: false}))} className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase rounded-lg transition-all ${!plannerParams.isStrict ? 'bg-slate-800 text-cyan-400 shadow-lg' : 'text-gray-500'}`}>
                            <SparklesIcon className="w-3 h-3" /> {t.modeInspired}
                        </button>
                        <button onClick={() => setPlannerParams(p => ({...p, isStrict: true}))} className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase rounded-lg transition-all ${plannerParams.isStrict ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-500'}`}>
                            <ZapIcon className="w-3 h-3" /> {t.modeStrict}
                        </button>
                    </div>
                    {/* Rest of the planner inputs... */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">{t.targetPlaylists}</label>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
                            {availableFolders.map(folder => (
                                <button key={folder} onClick={() => toggleTargetPlaylist(folder)} className={`px-2.5 py-2 rounded-lg border text-[9px] font-bold transition-all ${plannerParams.targetPlaylists.includes(folder) ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}>
                                    {folder}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={handleAutoPlan} disabled={isPlanning || fullPlaylist.length === 0} className="w-full py-5 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl hover:bg-cyan-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-h-[60px]">
                        {isPlanning ? (<><div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div> {t.addingToQueue}</>) : (<><ZapIcon className="w-6 h-6 text-cyan-600" /> {t.btnPlan}</>)}
                    </button>
                </div>
          </div>
      )}
      
      {/* List content */}
      {queue.length > 0 && (
        <div className="space-y-3 px-1">
            {queue.map((track, index) => {
                let transitionInfo = null;
                const isOnAir = track.id === currentTrackId;
                if (index > 0) {
                    const prev = queue[index-1];
                    const bpmDiffVal = parseFloat(track.bpm) - parseFloat(prev.bpm);
                    const bpmDiff = bpmDiffVal > 0 ? `+${bpmDiffVal.toFixed(1)}` : bpmDiffVal.toFixed(1);
                    transitionInfo = (
                        <div className="flex justify-center items-center py-1 relative">
                            <div className="h-6 w-px bg-slate-800 absolute top-[-0.75rem]"></div>
                            <div className="bg-black/60 border border-slate-800/50 rounded-full px-3 py-1 text-[8px] font-mono font-bold text-slate-500 flex gap-3 shadow-sm z-10 scale-90">
                                <span className={track.key === prev.key ? 'text-cyan-400' : 'text-slate-500'}>{prev.key} → {track.key}</span>
                                <div className="w-px h-2 bg-slate-700/50 self-center"></div>
                                <span className={Math.abs(bpmDiffVal) > 5 ? 'text-red-400' : 'text-green-500'}>{bpmDiff} BPM</span>
                            </div>
                        </div>
                    );
                }

                return (
                    <div key={`${track.id}-${index}`} className="animate-in slide-in-from-left-2" style={{ animationDelay: `${index * 50}ms` }}>
                        {transitionInfo}
                        <SwipeableRow onDelete={() => handleRemove(index)}>
                            <div className="relative group flex items-stretch gap-2">
                                <div className="flex-shrink-0 w-5 flex flex-col items-center justify-center">
                                    <div className={`text-[10px] font-bold ${isOnAir ? 'text-cyan-400' : 'text-slate-500 opacity-30'} mb-0.5`}>{index + 1}</div>
                                    <div className={`flex-1 w-[1px] bg-gradient-to-b ${isOnAir ? 'from-cyan-400' : 'from-slate-700/30'} to-transparent`}></div>
                                </div>
                                <div className="flex-1 relative pb-1">
                                    <div className={`relative overflow-hidden rounded-xl transition-all duration-300 ${isOnAir ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-black scale-[1.01] shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'opacity-80 hover:opacity-100'}`}>
                                        <TrackItem 
                                            track={track} 
                                            onSelect={(t) => onSelectTrack(t)} 
                                            isSelected={currentTrackId === track.id} 
                                            isOnAir={isOnAir}
                                        />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemove(index); }} 
                                            className="absolute left-2 bottom-2 p-1.5 bg-black/60 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-white/10 hover:border-red-500 flex items-center justify-center min-h-[28px] min-w-[28px] z-20 shadow-lg active:scale-90 backdrop-blur-sm"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </SwipeableRow>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};
