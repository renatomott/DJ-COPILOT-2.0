
// Simple in-memory cache to avoid repeated network requests for the same track
const artCache = new Map<string, string | null>();

// Circuit breaker flag to stop requests if we get rate limited
let isRateLimited = false;
let rateLimitResetTimeout: ReturnType<typeof setTimeout> | null = null;

export const searchAlbumArt = async (artist: string, name: string): Promise<string | null> => {
  // If we are rate limited, don't even try, just return null immediately
  if (isRateLimited) {
    return null;
  }

  // Check cache first
  const cacheKey = `${artist}-${name}`.toLowerCase();
  if (artCache.has(cacheKey)) {
    return artCache.get(cacheKey) || null;
  }

  try {
    // 1. Clean up search terms aggressively for better hit rate
    let cleanName = name
      // Remove content within parentheses or brackets (often contains remix info that breaks search)
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      // Remove common feature markers
      .replace(/\s*feat\..*/i, '')
      .replace(/\s*ft\..*/i, '')
      .replace(/\s*with\..*/i, '')
      // Remove file extensions if somehow present
      .replace(/\.(mp3|wav|aiff|m4a|flac)$/i, '')
      // Remove common DJ suffixes often found after a dash
      .replace(/\s*-\s*.*(?:mix|edit|remix|dub|instrumental).*/i, '')
      // Remove specific keywords even if no dash
      .replace(/original mix/gi, '')
      .replace(/extended mix/gi, '')
      .replace(/radio edit/gi, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim();

    let cleanArtist = artist
        .split(/[,&]/)[0] // Take only the first artist if multiple (e.g. "Artist A & Artist B")
        .replace(/feat\..*/i, '')
        .trim();

    // If cleaning resulted in empty strings (unlikely), fallback to original
    if (!cleanName) cleanName = name;
    if (!cleanArtist) cleanArtist = artist;

    const query = encodeURIComponent(`${cleanArtist} ${cleanName}`);
    
    // 2. Fetch from iTunes API
    const response = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`);
    
    // Handle Rate Limiting (429) or Forbidden (403) which usually means IP ban
    if (response.status === 429 || response.status === 403) {
        console.warn(`iTunes API Rate Limit detected (${response.status}). Pausing art fetch for 60s.`);
        isRateLimited = true;
        
        if (rateLimitResetTimeout) clearTimeout(rateLimitResetTimeout);
        
        rateLimitResetTimeout = setTimeout(() => {
            isRateLimited = false;
            console.log("Resuming iTunes API requests...");
        }, 60000); // Wait 1 minute
        
        return null;
    }

    if (!response.ok) {
        return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Get the artwork URL and upgrade resolution from 100x100 to 600x600
      const artworkUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
      artCache.set(cacheKey, artworkUrl);
      return artworkUrl;
    }

    // No result found
    artCache.set(cacheKey, null);
    return null;

  } catch (error) {
    // Suppress network errors to avoid console pollution
    return null;
  }
};
