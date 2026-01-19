
import React, { useState, useEffect } from 'react';
import { FilterIcon, SaveIcon, TrashIcon, ChevronDownIcon, XIcon, PlusIcon } from './icons';

export interface FilterState {
  minBpm: string;
  maxBpm: string;
  keys: string[];
  genres: string[];
}

export interface SavedFilter {
  name: string;
  filter: FilterState;
}

interface LibraryFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  availableKeys: string[];
  availableGenres: string[];
  initialFilters: FilterState;
}

const STORAGE_KEY_FILTERS = 'dj_copilot_saved_filters';

export const LibraryFilters: React.FC<LibraryFiltersProps> = ({ 
  onFilterChange, 
  availableKeys, 
  availableGenres,
  initialFilters 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved filters");
      }
    }
  }, []);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return;
    const newSaved = [...savedFilters, { name: newFilterName, filter: filters }];
    setSavedFilters(newSaved);
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(newSaved));
    setNewFilterName('');
    setIsSaving(false);
  };

  const handleLoadFilter = (saved: SavedFilter) => {
    setFilters(saved.filter);
  };

  const handleDeleteFilter = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newSaved = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newSaved);
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(newSaved));
  };

  const toggleKey = (key: string) => {
    setFilters(prev => ({
      ...prev,
      keys: prev.keys.includes(key) ? prev.keys.filter(k => k !== key) : [...prev.keys, key]
    }));
  };

  const toggleGenre = (genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre]
    }));
  };

  const clearFilters = () => {
    setFilters({ minBpm: '', maxBpm: '', keys: [], genres: [] });
  };

  const activeCount = (filters.minBpm ? 1 : 0) + (filters.maxBpm ? 1 : 0) + filters.keys.length + filters.genres.length;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden mb-4 shadow-lg">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer bg-gray-900 hover:bg-gray-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <FilterIcon className={`w-4 h-4 ${activeCount > 0 ? 'text-blue-400' : 'text-white'}`} />
          <span className={`text-sm font-black ${activeCount > 0 ? 'text-blue-400' : 'text-white'}`}>
            Filtros Avançados
          </span>
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="p-4 border-t border-gray-700 bg-black/40">
          {savedFilters.length > 0 && (
            <div className="mb-6 pb-4 border-b border-gray-700 overflow-x-auto">
              <p className="text-xs font-black text-white uppercase mb-2">Filtros Salvos</p>
              <div className="flex gap-2">
                {savedFilters.map((sf, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleLoadFilter(sf)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full text-xs text-white font-black whitespace-nowrap group transition-colors"
                  >
                    <span>{sf.name}</span>
                    <span onClick={(e) => handleDeleteFilter(e, idx)} className="text-white opacity-60 hover:text-red-400 p-0.5 transition-colors">
                      <XIcon className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black text-white uppercase mb-2 block">Intervalo de BPM</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" value={filters.minBpm} onChange={(e) => setFilters(prev => ({ ...prev, minBpm: e.target.value }))} className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white font-bold focus:border-blue-500 focus:outline-none placeholder:text-gray-600" />
                <span className="text-white font-black">-</span>
                <input type="number" placeholder="Max" value={filters.maxBpm} onChange={(e) => setFilters(prev => ({ ...prev, maxBpm: e.target.value }))} className="w-full bg-black border border-gray-700 rounded p-2 text-sm text-white font-bold focus:border-blue-500 focus:outline-none placeholder:text-gray-600" />
              </div>
            </div>

            <div className="flex items-end justify-end">
                {isSaving ? (
                    <div className="flex gap-2 w-full animate-in fade-in slide-in-from-right-2">
                        <input type="text" placeholder="Nome do filtro..." value={newFilterName} onChange={(e) => setNewFilterName(e.target.value)} className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm text-white font-bold focus:border-blue-500 focus:outline-none placeholder:text-gray-600" />
                        <button onClick={handleSaveFilter} className="bg-blue-600 px-3 py-2 rounded text-white hover:bg-blue-500 transition-colors"><SaveIcon className="w-4 h-4" /></button>
                        <button onClick={() => setIsSaving(false)} className="bg-gray-800 px-3 py-2 rounded text-white hover:text-red-400 transition-colors"><XIcon className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={clearFilters} className="text-xs text-white font-black underline px-3 transition-colors">Limpar Tudo</button>
                        <button onClick={() => setIsSaving(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-xs font-black transition-colors border border-blue-500 shadow-lg">
                            <SaveIcon className="w-3.5 h-3.5" />
                            Salvar Preset
                        </button>
                    </div>
                )}
            </div>

            <div className="md:col-span-2">
               <label className="text-xs font-black text-white uppercase mb-2 block">Tons (Keys)</label>
               <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                 {availableKeys.map(key => (
                   <button key={key} onClick={() => toggleKey(key)} className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${filters.keys.includes(key) ? 'bg-blue-600 border-blue-500 text-white font-black' : 'bg-gray-800 border-gray-700 text-white hover:border-blue-400'}`}>
                     {key}
                   </button>
                 ))}
               </div>
            </div>

            <div className="md:col-span-2">
               <label className="text-xs font-black text-white uppercase mb-2 block">Gêneros</label>
               <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1">
                 {availableGenres.map(genre => (
                   <button key={genre} onClick={() => toggleGenre(genre)} className={`px-2 py-1 rounded text-xs transition-colors border font-black ${filters.genres.includes(genre) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-white hover:border-purple-400'}`}>
                     {genre || 'Unknown'}
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
