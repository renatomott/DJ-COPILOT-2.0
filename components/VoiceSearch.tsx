
import React, { useState, useEffect } from 'react';
import { MicIcon, XIcon, SearchIcon } from './icons';

interface VoiceSearchProps {
    onSearch: (query: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const VoiceSearch: React.FC<VoiceSearchProps> = ({ onSearch, isOpen, onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let recognition: any = null;

        if (isOpen) {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = 'pt-BR'; // or en-US based on app language
                recognition.interimResults = true;

                recognition.onstart = () => {
                    setIsListening(true);
                    setError('');
                };

                recognition.onresult = (event: any) => {
                    const current = event.resultIndex;
                    const transcriptVal = event.results[current][0].transcript;
                    setTranscript(transcriptVal);
                };

                recognition.onend = () => {
                    setIsListening(false);
                    if (transcript) {
                        onSearch(transcript);
                        setTimeout(onClose, 500);
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error(event.error);
                    setError('Não entendi. Tente novamente.');
                    setIsListening(false);
                };

                recognition.start();
            } else {
                setError('Navegador não suporta voz.');
            }
        }

        return () => {
            if (recognition) recognition.stop();
        };
    }, [isOpen, onSearch, onClose, transcript]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white p-2">
                <XIcon className="w-8 h-8" />
            </button>

            <div className="flex flex-col items-center gap-8 w-full max-w-md text-center">
                <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${isListening ? 'border-cyan-500 bg-cyan-500/20 scale-110 shadow-[0_0_50px_rgba(6,182,212,0.5)]' : 'border-gray-700 bg-gray-800'}`}>
                    <MicIcon className={`w-10 h-10 ${isListening ? 'text-cyan-400' : 'text-gray-500'}`} />
                </div>

                <div className="space-y-2 h-20">
                    <h3 className="text-xl font-bold text-white">
                        {isListening ? 'Ouvindo...' : 'Toque para falar'}
                    </h3>
                    <p className="text-lg text-cyan-400 font-medium italic">
                        {transcript || (error ? <span className="text-red-400">{error}</span> : '"Techno Melódico"')}
                    </p>
                </div>
            </div>
        </div>
    );
};
