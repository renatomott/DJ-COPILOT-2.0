
// Camelot Wheel Map
// 1A = Abm, 1B = B, etc.
const CAMELOT_MAP: Record<string, { perfect: string[], good: string[] }> = {
  '1A': { perfect: ['1A', '1B', '12A', '2A'], good: ['12B', '2B'] },
  '1B': { perfect: ['1B', '1A', '12B', '2B'], good: ['12A', '2A'] },
  '2A': { perfect: ['2A', '2B', '1A', '3A'], good: ['1B', '3B'] },
  '2B': { perfect: ['2B', '2A', '1B', '3B'], good: ['1A', '3A'] },
  '3A': { perfect: ['3A', '3B', '2A', '4A'], good: ['2B', '4B'] },
  '3B': { perfect: ['3B', '3A', '2B', '4B'], good: ['2A', '4A'] },
  '4A': { perfect: ['4A', '4B', '3A', '5A'], good: ['3B', '5B'] },
  '4B': { perfect: ['4B', '4A', '3B', '5B'], good: ['3A', '5A'] },
  '5A': { perfect: ['5A', '5B', '4A', '6A'], good: ['4B', '6B'] },
  '5B': { perfect: ['5B', '5A', '4B', '6B'], good: ['4A', '6A'] },
  '6A': { perfect: ['6A', '6B', '5A', '7A'], good: ['5B', '7B'] },
  '6B': { perfect: ['6B', '6A', '5B', '7B'], good: ['5A', '7A'] },
  '7A': { perfect: ['7A', '7B', '6A', '8A'], good: ['6B', '8B'] },
  '7B': { perfect: ['7B', '7A', '6B', '8B'], good: ['6A', '8A'] },
  '8A': { perfect: ['8A', '8B', '7A', '9A'], good: ['7B', '9B'] },
  '8B': { perfect: ['8B', '8A', '7B', '9B'], good: ['7A', '9A'] },
  '9A': { perfect: ['9A', '9B', '8A', '10A'], good: ['8B', '10B'] },
  '9B': { perfect: ['9B', '9A', '8B', '10B'], good: ['8A', '10A'] },
  '10A': { perfect: ['10A', '10B', '9A', '11A'], good: ['9B', '11B'] },
  '10B': { perfect: ['10B', '10A', '9B', '11B'], good: ['9A', '11A'] },
  '11A': { perfect: ['11A', '11B', '10A', '12A'], good: ['10B', '12B'] },
  '11B': { perfect: ['11B', '11A', '10B', '12B'], good: ['10A', '12A'] },
  '12A': { perfect: ['12A', '12B', '11A', '1A'], good: ['11B', '1B'] },
  '12B': { perfect: ['12B', '12A', '11B', '1B'], good: ['11A', '1A'] },
};

export interface ClashResult {
  hasClash: boolean;
  reasons: string[];
  severity: 'none' | 'warning' | 'critical';
}

export const detectClash = (trackA_Key: string, trackA_Bpm: string, trackB_Key: string, trackB_Bpm: string): ClashResult => {
  const result: ClashResult = { hasClash: false, reasons: [], severity: 'none' };

  // 1. BPM Clash (> 6% difference usually sounds bad without master tempo/artifacts)
  const bpmA = parseFloat(trackA_Bpm) || 0;
  const bpmB = parseFloat(trackB_Bpm) || 0;
  
  if (bpmA > 0 && bpmB > 0) {
    const diff = Math.abs(bpmA - bpmB);
    const percentage = (diff / bpmA) * 100;
    
    if (percentage > 6) {
      result.hasClash = true;
      result.reasons.push(`BPM Gap: ${percentage.toFixed(1)}% (Too fast/slow)`);
      result.severity = 'warning';
    }
  }

  // 2. Harmonic Clash
  if (trackA_Key && trackB_Key && trackA_Key !== 'N/A' && trackB_Key !== 'N/A') {
    const keyA = trackA_Key.toUpperCase();
    const keyB = trackB_Key.toUpperCase();
    
    if (keyA !== keyB) {
       const compatibility = CAMELOT_MAP[keyA];
       if (compatibility) {
         if (!compatibility.perfect.includes(keyB) && !compatibility.good.includes(keyB)) {
            result.hasClash = true;
            result.reasons.push(`Harmonic Clash: ${keyA} vs ${keyB}`);
            // If severity was already warning, upgrade to critical, otherwise warning
            result.severity = result.severity === 'warning' ? 'critical' : 'warning';
         }
       }
    }
  }

  return result;
};
