
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
  const [isVisible, setIsVisible] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer: Only load when the element is near the viewport
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Pre-load when within 200px of scrolling
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;
    setLoading(true);

    const fallbackUrl = `https://picsum.photos/seed/${id}/400`;

    const fetchCover = async () => {
      // Add a tiny random delay to prevent bursting the API even when visible
      if (!priority) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      }
      
      if (!isMounted) return;

      // Try fetching from iTunes
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-0">
                <MusicIcon className="w-1/3 h-1/3 text-gray-700 animate-pulse" />
            </div>
        )}
        
        {/* Actual Image */}
        {imageUrl && (
            <img
                src={imageUrl}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-700 ${loading ? 'opacity-0' : 'opacity-100'}`}
                loading="lazy"
            />
        )}
    </div>
  );
};
