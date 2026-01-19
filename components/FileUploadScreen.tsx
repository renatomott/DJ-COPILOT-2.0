
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons';
import { Loader } from './Loader';

interface FileUploadScreenProps {
  onFileUpload: (file: File) => void;
  error: string | null;
  isLoading: boolean;
}

export const FileUploadScreen: React.FC<FileUploadScreenProps> = ({ onFileUpload, error, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

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

  const dragClasses = isDragging ? 'border-gray-500 bg-gray-900/50 scale-105' : 'border-gray-700 hover:border-gray-500';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-gray-200 p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-200 tracking-wider">
          DJ Copilot 2.0
        </h1>
        <p className="text-gray-400 mt-2">Seu assistente de mixagem com IA</p>
      </div>

      <div
        className={`w-full max-w-lg p-8 md:p-12 border-2 border-dashed rounded-xl text-center transition-all duration-300 ${dragClasses}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <Loader />
            <p className="mt-4 text-lg">Analisando sua biblioteca...</p>
          </div>
        ) : (
          <>
            <UploadIcon className="mx-auto h-16 w-16 text-gray-500 mb-4" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="font-semibold text-gray-200">Carregue seu XML do Rekordbox</span>
              <p className="text-sm text-gray-500 mt-1">ou arraste e solte</p>
            </label>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xml" onChange={handleFileChange} />
            <p className="text-xs text-gray-600 mt-6">
              Exporte sua playlist do Rekordbox como um arquivo XML.
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-6 text-red-400 bg-red-900/50 p-3 rounded-lg max-w-lg text-center">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};
