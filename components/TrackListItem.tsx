
import React, { useState } from 'react';
import type { Track } from '../types';
import { StarIcon, ClockIcon, ActivityIcon, ChevronDownIcon, FolderIcon, TagIcon } from './icons';
import { EnergyBar } from './EnergyBar';

interface TrackListItemProps {
  track: Track;
  onSelect: (track: Track) => void;
  isSelected: boolean;
}

const renderRating = (rating: number) => {
  const stars = [];
  // Escala de 0 a 100 do Rekordbox convertida para 5 estrelas (20 pts cada)
  const normalizedRating = Math.round(rating / 20);
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= normalizedRating;
    stars.push(
      <StarIcon 
        key={i} 
        className={`w-2.5 h-2.5 ${isFilled ? 'text-yellow-400 fill-current' : 'text-white/10 stroke-white/40'}`} 
        filled={isFilled} 
      />
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};
// ... rest of component logic ...
