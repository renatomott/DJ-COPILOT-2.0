
import React from 'react';

interface EnergyBarProps {
  energy: number; // 1 to 5
  className?: string;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({ energy, className = "" }) => {
  // Normalize energy 1-5
  const validEnergy = Math.min(Math.max(Math.round(energy || 0), 0), 5);

  return (
    <div className={`flex items-end gap-0.5 h-3 ${className}`}>
      {[1, 2, 3, 4, 5].map((level) => {
        let colorClass = "bg-gray-700";
        if (level <= validEnergy) {
          if (level <= 2) colorClass = "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]";
          else if (level <= 4) colorClass = "bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]";
          else colorClass = "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]";
        }

        // Height variation for a graphic equalizer look
        const heightClass = 
          level === 1 ? 'h-[40%]' :
          level === 2 ? 'h-[55%]' :
          level === 3 ? 'h-[70%]' :
          level === 4 ? 'h-[85%]' :
          'h-full';

        return (
          <div 
            key={level} 
            className={`w-1.5 rounded-sm transition-all duration-300 ${heightClass} ${colorClass}`}
          />
        );
      })}
    </div>
  );
};
