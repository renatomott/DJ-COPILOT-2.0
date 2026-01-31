
import React, { useEffect, useState } from 'react';
import { TrendingUpIcon, TrendingDownIcon, ActivityIcon, CheckCircleIcon, AlertTriangleIcon } from './icons';

interface TransitionToastProps {
  prevBpm?: string;
  newBpm: string;
  prevKey?: string;
  newKey: string;
  prevEnergy?: number;
  newEnergy?: number;
  onClose: () => void;
}

export const TransitionToast: React.FC<TransitionToastProps> = ({ prevBpm, newBpm, prevKey, newKey, prevEnergy, newEnergy, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!prevBpm) return null; // Needs context

  const bpmDiff = parseFloat(newBpm) - parseFloat(prevBpm);
  const energyDiff = (newEnergy || 0) - (prevEnergy || 0);
  const isHarmonic = prevKey === newKey || !prevKey; // Simplified harmonic check for visual

  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[300px]">
            {/* Status Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${Math.abs(bpmDiff) > 6 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                {Math.abs(bpmDiff) > 6 ? <AlertTriangleIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
            </div>

            <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Previsão de Mix</p>
                <div className="flex gap-3 text-[10px] font-bold">
                    {/* BPM Stat */}
                    <div className={`flex items-center gap-1 ${Math.abs(bpmDiff) > 6 ? 'text-yellow-400' : 'text-slate-300'}`}>
                        <ActivityIcon className="w-3 h-3" />
                        <span>{bpmDiff > 0 ? '+' : ''}{bpmDiff.toFixed(1)} BPM</span>
                    </div>
                    {/* Energy Stat */}
                    <div className={`flex items-center gap-1 ${energyDiff > 0 ? 'text-red-400' : energyDiff < 0 ? 'text-blue-400' : 'text-slate-300'}`}>
                        {energyDiff > 0 ? <TrendingUpIcon className="w-3 h-3" /> : energyDiff < 0 ? <TrendingDownIcon className="w-3 h-3" /> : null}
                        <span>Energia {energyDiff > 0 ? '+' : ''}{energyDiff}</span>
                    </div>
                    {/* Key Stat */}
                    <div className={`flex items-center gap-1 ${isHarmonic ? 'text-cyan-400' : 'text-pink-400'}`}>
                        <span>{prevKey} → {newKey}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
