
// Simple in-memory cache to avoid repeated network requests for the same track
const artCache = new Map<string, string | null>();

export const searchAlbumArt = async (artist: string, name: string): Promise<string | null> => {
  const cacheKey = `${artist}-${name}`;
  if (artCache.has(cacheKey)) {
    return artCache.get(cacheKey) || null;
  }

  try {
    // 1. Clean up search terms for better hit rate
    // Remove things like (Original Mix), [Extended], feat. X, etc.
    const cleanName = name
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*\[.*?\]\s*/g, ' ')
      .replace(/\s*feat\..*/i, '')
      .replace(/\s*ft\..*/i, '')
      .trim();

    const cleanArtist = artist
        .split(/[,&]/)[0] // Take only the first artist if multiple
        .trim();

    const query = encodeURIComponent(`${cleanArtist} ${cleanName}`);
    
    // 2. Fetch from iTunes API
    const response = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=1`);
    
    if (!response.ok) {
        throw new Error('iTunes API Error');
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
    console.warn(`Failed to fetch cover for ${artist} - ${name}`, error);
    return null;
  }
};
