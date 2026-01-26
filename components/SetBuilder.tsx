
import React, { useState, useMemo, useRef } from 'react';
import type { Track } from '../types';
import { TrackItem } from './TrackItem';
import { TrashIcon, ArrowUpIcon, SaveIcon, DownloadIcon, WandSparklesIcon, RefreshCwIcon, BrainIcon, SparklesIcon, ChevronDownIcon, MusicIcon, PlusIcon, SearchIcon, XIcon, ZapIcon, StarIcon, FolderIcon, ListIcon, ClockIcon, ActivityIcon, UploadIcon, PlayIcon } from './icons';
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

// Componente auxiliar para Swipe to Delete
const SwipeableRow = ({ children, onDelete }: { children: React.ReactNode, onDelete: () => void }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0); // Para detectar scroll vertical

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

        // Se o movimento for mais vertical que horizontal, ignore (deixe o scroll nativo funcionar)
        if (Math.abs(diffY) > Math.abs(diffX)) return;

        // Apenas permitir swipe para a esquerda (valores negativos)
        if (diffX < 0) {
            // Evita scroll da página enquanto faz swipe horizontal
            if (e.cancelable && Math.abs(diffX) > 10) e.preventDefault();
            
            setIsSwiping(true);
            // Limita o swipe a -120px
            setOffsetX(Math.max(diffX, -120));
        }
    };

    const handleTouchEnd = () => {
        if (offsetX < -80) {
            // Se arrastou mais que 80px, confirma deleção
            setOffsetX(-500); // Anima para fora
            setTimeout(() => {
                onDelete();
                setOffsetX(0); // Reseta para o próximo item que ocupar este lugar
            }, 300);
        } else {
            // Snap back
            setOffsetX(0);
        }
        setIsSwiping(false);
    };

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Camada de Fundo (Ação de Deletar) */}
            <div className="absolute inset-0 bg-red-600 flex items-center justify-end pr-6 rounded-xl">
                <TrashIcon className="w-6 h-6 text-white animate-pulse" />
            </div>

            {/* Camada de Frente (Conteúdo) */}
            <div
                className="relative bg-[#020617] transition-transform duration-200 ease-out will-change-transform"
                style={{ 
                    transform: `translateX(${offsetX}px)`,
                    // Adiciona uma borda escura sutil para separar do fundo vermelho visualmente
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
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

  // ... (rest of the file remains same, keeping helper hooks and render)
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
        {/* Changed: Removed parentheses from count */}
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

      {showPlanner && (
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t.progression}</label>
                            <div className="flex flex-col gap-1.5">
                                {[
                                    { id: 'Linear', label: t.progLinear },
                                    { id: 'Rising', label: t.progRising },
                                    { id: 'Chaos', label: t.progChaos }
                                ].map(prog => (
                                    <button key={prog.id} onClick={() => setPlannerParams(p => ({...p, progression: prog.id}))} className={`p-3 rounded-xl border text-left text-[10px] font-bold transition-all ${plannerParams.progression === prog.id ? 'bg-cyan-600 border-cyan-400 text-white shadow-inner' : 'bg-black/40 border-white/5 text-gray-400'}`}>
                                        {prog.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t.setLength}</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[5, 10, 15].map(l => (
                                        <button key={l} onClick={() => setPlannerParams(p => ({...p, length: l}))} className={`p-3 rounded-xl border text-center text-[10px] font-bold transition-all ${plannerParams.length === l ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-black/40 border-white/5 text-gray-400'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t.minRating}</label>
                                <div className="flex items-center gap-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} onClick={() => setPlannerParams(p => ({...p, minRating: star}))} className={`transition-all ${plannerParams.minRating >= star ? 'text-yellow-400 scale-110' : 'text-white/10'}`}>
                                            <StarIcon className="w-4 h-4 fill-current" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">{t.mandatoryTracks}</label>
                            <button onClick={() => setIsBrowsingFolders(!isBrowsingFolders)} className={`text-[9px] font-bold uppercase flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${isBrowsingFolders ? 'bg-cyan-600 text-white' : 'bg-white/5 text-cyan-400'}`}>
                                <FolderIcon className="w-3.5 h-3.5" /> {t.browseByFolder}
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {mustHaves.map(track => (
                                <div key={track.id} className="flex items-center gap-2 bg-cyan-600 px-3 py-2 rounded-xl border border-cyan-400 shadow-sm animate-in scale-in">
                                    <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{track.name}</span>
                                    <button onClick={() => toggleMustHave(track)} className="text-white/60 hover:text-white p-1"><XIcon className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>

                        {isBrowsingFolders ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                {!selectedBrowseFolder ? (
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {availableFolders.map(folder => (
                                            <button key={folder} onClick={() => setSelectedBrowseFolder(folder)} className="p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-bold text-white text-left hover:bg-white/5 transition-all break-words whitespace-normal leading-tight">
                                                📁 {folder}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                                        <div className="p-4 bg-white/5 flex items-center justify-between">
                                            <button onClick={() => setSelectedBrowseFolder(null)} className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 min-h-[44px]">
                                                <ArrowUpIcon className="w-3.5 h-3.5 -rotate-90" /> {t.back}
                                            </button>
                                            <span className="text-[10px] font-bold text-white/50 uppercase truncate max-w-[150px]">{selectedBrowseFolder}</span>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {tracksInSelectedFolder.map(track => {
                                                const isSelected = mustHaves.some(m => m.id === track.id);
                                                return (
                                                    <button key={track.id} onClick={() => toggleMustHave(track)} disabled={isSelected} className={`w-full p-3.5 text-left border-b border-white/5 last:border-none flex items-center justify-between group transition-colors ${isSelected ? 'opacity-40 grayscale' : 'hover:bg-cyan-600/20'}`}>
                                                        <div className="overflow-hidden flex-1 pr-2">
                                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                                <p className="text-[14px] font-bold text-white truncate">{track.name}</p>
                                                                <span className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-400/10 px-1.5 rounded">{track.key}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between opacity-70">
                                                                <p className="text-[9px] text-white/60 truncate max-w-[100px] font-bold">{track.artist}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1 text-[9px] font-mono text-white/80">
                                                                        <ActivityIcon className="w-3 h-3 text-green-500" /> {track.bpm}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[9px] font-mono text-white/80">
                                                                        <ClockIcon className="w-3 h-3 text-cyan-400" /> {track.duration}
                                                                    </div>
                                                                    {renderRatingMini(track.rating)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <PlusIcon className={`w-6 h-6 flex-shrink-0 transition-transform ${isSelected ? 'text-gray-500 rotate-45' : 'text-cyan-400 group-hover:scale-125'}`} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative mt-2">
                                <input type="text" value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} placeholder={t.searchToPlan} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors pl-11 min-h-[50px]" />
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                {filteredLibraryForPlan.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl mt-1 z-50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                                        {filteredLibraryForPlan.map(track => (
                                            <button key={track.id} onClick={() => toggleMustHave(track)} className="w-full p-4 text-left hover:bg-cyan-600/20 border-b border-slate-700 last:border-none flex items-center justify-between">
                                                <div className="overflow-hidden pr-2">
                                                    <p className="text-xs font-bold text-white truncate">{track.name}</p>
                                                    <p className="text-[10px] text-white/40 truncate">{track.artist}</p>
                                                </div>
                                                <PlusIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-[9px] text-white/40 italic">{t.fillGaps}</p>
                    </div>

                    <button onClick={handleAutoPlan} disabled={isPlanning || fullPlaylist.length === 0} className="w-full py-5 bg-white text-black rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl hover:bg-cyan-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 min-h-[60px]">
                        {isPlanning ? (<><div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div> {t.addingToQueue}</>) : (<><ZapIcon className="w-6 h-6 text-cyan-600" /> {t.btnPlan}</>)}
                    </button>
                    <p className="text-[9px] text-white/30 text-center font-bold uppercase tracking-wider italic">{t.plannerHint}</p>
                </div>
          </div>
      )}
      
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 opacity-60">
            <div className="bg-slate-800 p-8 rounded-full mb-6 ring-8 ring-slate-900 shadow-xl relative">
                <MusicIcon className="w-12 h-12 text-white" />
                <div className="absolute -top-1 -right-1 p-2 bg-cyan-600 rounded-full animate-bounce"><PlusIcon className="w-5 h-5 text-white" /></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">{t.emptyBuilder}</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{t.emptyBuilderSub}</p>
            <button onClick={() => importFileRef.current?.click()} className="mt-8 flex items-center gap-3 text-cyan-400 font-bold text-xs uppercase tracking-widest hover:text-cyan-300 transition-colors p-3 bg-cyan-400/10 rounded-xl border border-cyan-400/20">
                <UploadIcon className="w-5 h-5" /> {t.importPlan}
            </button>
        </div>
      ) : (
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
                                        {mustHaves.find(m => m.id === track.id) && !isOnAir && (
                                            <div className="absolute top-1 left-1 bg-yellow-500 text-black text-[7px] font-bold px-1 py-0.5 rounded shadow-sm uppercase z-10">
                                                PICKED
                                            </div>
                                        )}
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
