import { useState, useEffect } from 'react';

/**
 * Hook for progressive image loading with placeholder
 * Returns the current image source (placeholder until full image loads)
 */
export function useProgressiveImage(highResSrc: string): {
  src: string;
  isLoaded: boolean;
  blur: boolean;
} {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = highResSrc;
    
    if (img.complete) {
      setIsLoaded(true);
    } else {
      img.onload = () => setIsLoaded(true);
    }

    return () => {
      img.onload = null;
    };
  }, [highResSrc]);

  return {
    src: highResSrc,
    isLoaded,
    blur: !isLoaded
  };
}

/**
 * CSS class helper for progressive background
 */
export function getProgressiveBackgroundStyle(
  src: string,
  isLoaded: boolean
): React.CSSProperties {
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'filter 0.3s ease-out',
    filter: isLoaded ? 'none' : 'blur(10px)',
  };
}
