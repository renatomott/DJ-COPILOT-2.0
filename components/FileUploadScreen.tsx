
import React, { useState, useCallback } from 'react';
import { UploadIcon, GlobeIcon } from './icons';
import { Loader } from './Loader';
import { translations } from '../utils/translations';

interface FileUploadScreenProps {
  onFileUpload: (file: File) => void;
  error: string | null;
  isLoading: boolean;
  language: 'pt-BR' | 'en-US';
  setLanguage: (lang: 'pt-BR' | 'en-US') => void;
}

export const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUpload, error, isLoading, language, setLanguage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const t = translations[language];

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const dragClasses = isDragging ? 'border-blue-500 bg-blue-500/5 scale-105' : 'border-gray-700 hover:border-gray-500';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020617] text-gray-200 p-4">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 flex bg-slate-900/50 rounded-full border border-slate-800 p-1">
        <button 
          onClick={() => setLanguage('pt-BR')}
          className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${language === 'pt-BR' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          PT
        </button>
        <button 
          onClick={() => setLanguage('en-US')}
          className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${language === 'en-US' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          EN
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
          DJ Copilot <span className="text-blue-500">2.0</span>
        </h1>
        <p className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-xs opacity-70">{t.uploadSub}</p>
      </div>

      <div
        className={`w-full max-w-lg p-8 md:p-12 border-2 border-dashed rounded-3xl text-center transition-all duration-300 bg-slate-900/20 backdrop-blur-sm ${dragClasses}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader />
            <p className="mt-6 text-sm font-black uppercase tracking-widest text-blue-400 animate-pulse">{t.analyzing}</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border border-slate-700">
                <UploadIcon className="h-10 w-10 text-blue-400" />
            </div>
            <label htmlFor="file-upload" className="cursor-pointer block">
              <span className="text-xl font-black text-white block mb-1">{t.uploadBoxTitle}</span>
              <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">{t.uploadBoxSub}</p>
            </label>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xml" onChange={handleFileChange} />
            <div className="mt-8 pt-6 border-t border-slate-800/50">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
                  {t.uploadNote}
                </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 text-red-400 bg-red-900/20 border border-red-500/20 px-6 py-4 rounded-2xl max-w-lg text-center animate-in fade-in zoom-in-95">
          <p className="text-xs font-black uppercase tracking-widest">{t.uploadError}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};
