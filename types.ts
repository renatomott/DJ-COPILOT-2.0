
export interface Track {
  id: string;
  name: string;
  artist: string;
  bpm: string;
  key: string;
  genre: string;
  album: string;
  playCount: number;
  rating: number;
  duration: string;
  location: string;
  color?: string;
  energy?: number;
  subgenre?: string;
  cuePoints?: string[];
  visualUrl?: string;
  isSample?: boolean;
}

export interface Suggestion extends Track {
  reason: string;
  matchScore: number;
}

export interface MashupPair {
  track1: Track;
  track2: Track;
  reason: string;
}

export interface SetReport {
  summary: string;
  highlights: string[];
  vibeProgression: string;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  cuePoints: string[];
}
