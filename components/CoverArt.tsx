
import React, { useState, useEffect, useRef } from 'react';
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
  const [isVisible, setIsVisible] = useState(priority); // Load immediately if priority is true
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer to detect when the component is on screen
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Start loading 100px before it enters the viewport
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  useEffect(() => {
    // Only fetch if visible on screen or is priority
    if (!isVisible) return;

    let isMounted = true;
    setLoading(true);

    const fallbackUrl = `https://picsum.photos/seed/${id}/400`;

    const fetchCover = async () => {
      // Add a small random delay to spread out requests even further
      if (!priority) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
      }

      if (!isMounted) return;

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
  }, [artist, name, id, isVisible, priority]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden bg-gray-800 ${className}`}>
        {/* Placeholder / Loading State */}
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse z-0">
                <MusicIcon className="w-1/3 h-1/3 text-gray-700" />
            </div>
        )}
        
        {/* Actual Image */}
        {imageUrl && (
            <img
                src={imageUrl}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
                loading="lazy"
            />
        )}
    </div>
  );
};
