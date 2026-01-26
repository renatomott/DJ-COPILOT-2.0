
import React from 'react';

interface AudioVisualizerProps {
  bpm: number;
  className?: string;
  isZen?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ bpm, className = '', isZen = false }) => {
  // Simulate duration based on BPM (faster BPM = faster animation)
  // Standard 128 BPM = ~0.46s per beat. Let's make bars dance.
  const speed = Math.max(0.2, 60 / bpm);
  
  return (
    <div className={`flex items-end justify-center gap-[2px] h-full w-full opacity-60 ${className}`}>
        {Array.from({ length: isZen ? 20 : 12 }).map((_, i) => (
            <div 
                key={i}
                className="w-1.5 sm:w-2 bg-cyan-400 rounded-t-sm"
                style={{
                    animation: `sound-bar ${speed * (0.5 + Math.random())}s ease-in-out infinite alternate`,
                    animationDelay: `-${Math.random()}s`,
                    height: `${10 + Math.random() * 40}%`
                }}
            ></div>
        ))}
    </div>
  );
};
