
import type { Track } from '../types';

export type ThemeColor = {
    primary: string; // Tailwind class text/bg prefix (e.g., 'cyan')
    accent: string; // Hex for inline styles
    gradientFrom: string;
    gradientTo: string;
    glow: string; // Box shadow color
};

const DEFAULT_THEME: ThemeColor = {
    primary: 'cyan',
    accent: '#22d3ee',
    gradientFrom: 'from-slate-900',
    gradientTo: 'to-black',
    glow: 'rgba(34, 211, 238, 0.4)'
};

export const getGenreTheme = (track: Track | null): ThemeColor => {
    if (!track || !track.genre) return DEFAULT_THEME;

    const genre = track.genre.toLowerCase();
    const key = track.key || '';

    // 1. Genre Based Rules
    if (genre.includes('techno') || genre.includes('industrial')) {
        return {
            primary: 'red',
            accent: '#ef4444',
            gradientFrom: 'from-red-950',
            gradientTo: 'to-black',
            glow: 'rgba(239, 68, 68, 0.5)'
        };
    }
    if (genre.includes('house') || genre.includes('disco') || genre.includes('funky')) {
        return {
            primary: 'orange',
            accent: '#f97316',
            gradientFrom: 'from-orange-950',
            gradientTo: 'to-black',
            glow: 'rgba(249, 115, 22, 0.5)'
        };
    }
    if (genre.includes('trance') || genre.includes('progressive')) {
        return {
            primary: 'blue',
            accent: '#3b82f6',
            gradientFrom: 'from-blue-950',
            gradientTo: 'to-black',
            glow: 'rgba(59, 130, 246, 0.5)'
        };
    }
    if (genre.includes('drum') || genre.includes('bass') || genre.includes('dubstep')) {
        return {
            primary: 'violet',
            accent: '#8b5cf6',
            gradientFrom: 'from-violet-950',
            gradientTo: 'to-black',
            glow: 'rgba(139, 92, 246, 0.5)'
        };
    }
    if (genre.includes('chill') || genre.includes('lounge') || genre.includes('downtempo')) {
        return {
            primary: 'teal',
            accent: '#14b8a6',
            gradientFrom: 'from-teal-950',
            gradientTo: 'to-black',
            glow: 'rgba(20, 184, 166, 0.4)'
        };
    }

    // 2. Fallback to Key-based energy if genre is generic
    if (key.includes('m')) { 
        // Minor - cooler/darker
        return { ...DEFAULT_THEME, gradientFrom: 'from-slate-900' };
    } else {
        // Major - warmer/brighter
        return {
            primary: 'pink',
            accent: '#ec4899',
            gradientFrom: 'from-pink-950',
            gradientTo: 'to-black',
            glow: 'rgba(236, 72, 153, 0.4)'
        };
    }
};
