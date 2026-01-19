
import React, { useState, useEffect } from 'react';
import { searchAlbumArt } from '../services/itunesService';
import { MusicIcon } from './icons';

interface CoverArtProps {
  artist: string;
  name: string;
  id: string; // Used for the fallback random seed
  className?: string;
  alt?: string;
  priority?: boolean; // If true, tries to fetch immediately
}

export const CoverArt: React.FC<CoverArtProps> = ({ artist, name, id, className = "", alt = "Album Art", priority = false }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Fallback simulated image (Picsum) - shown while loading or if not found
    const fallbackUrl = `https://picsum.photos/seed/${id}/400`;

    // If we want to strictly optimize list scrolling, we could only fetch if priority is true
    // But for now, we fetch all to look nice.
    const fetchCover = async () => {
      // Use a small delay to avoid hammering the API instantly on list renders
      if (!priority) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      }

      const foundUrl = await searchAlbumArt(artist, name);
      
      if (isMounted) {
        if (foundUrl) {
            setImageUrl(foundUrl);
        } else {
            setImageUrl(fallbackUrl);
        }
        setLoading(false);
      }
    };

    fetchCover();

    return () => {
      isMounted = false;
    };
  }, [artist, name, id, priority]);

  return (
    <div className={`relative overflow-hidden bg-gray-800 ${className}`}>
        {/* Placeholder / Loading State */}
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse z-0">
                <MusicIcon className="w-1/3 h-1/3 text-gray-700" />
            </div>
        )}
        
        {/* Actual Image */}
        <img
            src={imageUrl || `https://picsum.photos/seed/${id}/400`}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
        />
    </div>
  );
};
