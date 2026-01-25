
// Simple in-memory cache to avoid repeated network requests for the same track
const artCache = new Map<string, string | null>();

// Circuit breaker flag to stop requests if we get rate limited
let isRateLimited = false;
let rateLimitResetTimeout: ReturnType<typeof setTimeout> | null = null;

export const searchAlbumArt = async (artist: string, name: string): Promise<string | null> => {
  if (isRateLimited) return null;

  const cacheKey = `${artist}-${name}`.toLowerCase();
  if (artCache.has(cacheKey)) return artCache.get(cacheKey) || null;

  try {
    // 1. CLEANING: Deep strip of DJ metadata that breaks iTunes search
    // Handles common DJ patterns like: "1A - 124 - Artist - Song (Original Mix)"
    let cleanName = name
      .replace(/^[0-9]{1,2}[A-B]\s*-\s*[0-9]{2,3}\s*-\s*/, '') // Strip "1A - 124 - " prefix
      .replace(/\s*\(.*?\)\s*/g, ' ') // Strip (remix info)
      .replace(/\s*\[.*?\]\s*/g, ' ') // Strip [label info]
      .replace(/\s*feat\..*/i, '')
      .replace(/\s*ft\..*/i, '')
      .replace(/\.(mp3|wav|aiff|m4a|flac)$/i, '')
      .replace(/original mix|extended mix|radio edit|remix|mix/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    let cleanArtist = artist
        .split(/[,&]/)[0] // Only first artist
        .replace(/^[0-9]{1,2}[A-B]\s*-\s*/, '') // Strip Key prefix if artist tag is messy
        .replace(/feat\..*/i, '')
        .trim();

    if (!cleanName || cleanName.length < 2) cleanName = name;
    if (!cleanArtist || cleanArtist.length < 2) cleanArtist = artist;

    const query = encodeURIComponent(`${cleanArtist} ${cleanName}`);
    
    // First attempt: Cleaned search
    let response = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`);
    
    if (response.status === 429 || response.status === 403) {
        isRateLimited = true;
        rateLimitResetTimeout = setTimeout(() => { isRateLimited = false; }, 60000);
        return null;
    }

    let data = await response.json();

    // Second attempt fallback: Just the artist + first 2 words of title if first failed
    if ((!data.results || data.results.length === 0) && cleanName.split(' ').length > 2) {
        const fuzzyTitle = cleanName.split(' ').slice(0, 2).join(' ');
        const fuzzyQuery = encodeURIComponent(`${cleanArtist} ${fuzzyTitle}`);
        response = await fetch(`https://itunes.apple.com/search?term=${fuzzyQuery}&media=music&entity=song&limit=1`);
        data = await response.json();
    }

    if (data.results && data.results.length > 0) {
      const artworkUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
      artCache.set(cacheKey, artworkUrl);
      return artworkUrl;
    }

    artCache.set(cacheKey, null);
    return null;
  } catch (error) {
    return null;
  }
};
