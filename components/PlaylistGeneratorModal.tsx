
import React, { useState } from 'react';
import type { Track } from '../types';
import { generatePlaylist } from '../services/geminiService';
import { CloseIcon, WandSparklesIcon } from './icons';
import { Loader } from './Loader';

interface PlaylistGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
}

export const PlaylistGeneratorModal: React.FC<PlaylistGeneratorModalProps> = ({ isOpen, onClose, playlist }) => {
  const [vibe, setVibe] = useState('energética');
  const [isVocal, setIsVocal] = useState('any');
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Track[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedPlaylist(null);
    try {
      const result = await generatePlaylist(playlist, vibe, isVocal);
      setGeneratedPlaylist(result);
    } catch (err)
      {
      setError('Falha ao gerar a playlist. Por favor, tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-gray-200">Gerador de Playlist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!generatedPlaylist && !isLoading && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="vibe" className="block text-sm font-medium text-gray-300 mb-2">
                  Descreva a Vibe
                </label>
                <input
                  id="vibe"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  placeholder="ex: deep house, techno, chill out"
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-white"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Vocais</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsVocal('any')} className={`flex-1 p-2 rounded ${isVocal === 'any' ? 'bg-gray-700 text-white' : 'bg-gray-900'}`}>Qualquer</button>
                  <button type="button" onClick={() => setIsVocal('vocal')} className={`flex-1 p-2 rounded ${isVocal === 'vocal' ? 'bg-gray-700 text-white' : 'bg-gray-900'}`}>Com Vocal</button>
                  <button type="button" onClick={() => setIsVocal('instrumental')} className={`flex-1 p-2 rounded ${isVocal === 'instrumental' ? 'bg-gray-700 text-white' : 'bg-gray-900'}`}>Instrumental</button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gray-200 text-black font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                <WandSparklesIcon className="w-5 h-5" />
                Gerar Playlist
              </button>
            </form>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader />
              <p className="mt-4">Criando sua playlist...</p>
            </div>
          )}

          {error && <p className="text-red-400 text-center">{error}</p>}
          
          {generatedPlaylist && (
            <div>
              <h3 className="text-lg font-bold text-gray-200 mb-4">Sua Playlist Gerada:</h3>
              <div className="space-y-2">
                {generatedPlaylist.map((track, index) => (
                  <div key={track.id} className="p-2 bg-gray-900 rounded flex items-center gap-4">
                    <span className="font-mono text-sm text-gray-500 w-6">{index + 1}.</span>
                    <div>
                        <p className="font-semibold text-white">{track.name}</p>
                        <p className="text-xs text-gray-400">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
               <button
                onClick={() => {
                    setGeneratedPlaylist(null);
                    setError(null);
                }}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Gerar Outra
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
