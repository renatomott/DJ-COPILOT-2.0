
import React from 'react';

interface RadarChartProps {
  data: { label: string; value: number }[]; // value 0-100
  color: string;
  className?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ data, color, className = "" }) => {
  const size = 100;
  const center = size / 2;
  const radius = size * 0.4;
  const angleSlice = (Math.PI * 2) / data.length;

  // Helper to calculate coordinates
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleSlice - Math.PI / 2; // Start from top
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const points = data.map((d, i) => {
    const { x, y } = getCoordinates(d.value, i);
    return `${x},${y}`;
  }).join(' ');

  // Background Grid Levels
  const levels = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={`overflow-visible ${className}`}>
        {/* Grid Circles */}
        {levels.map(level => (
            <circle 
                key={level} 
                cx={center} 
                cy={center} 
                r={(level / 100) * radius} 
                fill="none" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="0.5" 
            />
        ))}
        
        {/* Axes */}
        {data.map((_, i) => {
            const { x, y } = getCoordinates(100, i);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />;
        })}

        {/* Data Path */}
        <polygon points={points} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
        
        {/* Labels */}
        {data.map((d, i) => {
             const { x, y } = getCoordinates(115, i);
             return (
                 <text 
                    key={i} 
                    x={x} 
                    y={y} 
                    fontSize="6" 
                    fill="rgba(255,255,255,0.6)" 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    className="font-mono font-bold"
                 >
                     {d.label.substring(0, 3)}
                 </text>
             );
        })}
    </svg>
  );
};
