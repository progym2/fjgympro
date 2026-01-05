import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Youtube, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YouTubePlayerProps {
  url: string;
  title?: string;
  className?: string;
  showThumbnail?: boolean;
}

// Extract YouTube video ID from various URL formats
const getYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^"&?\/\s]{11})/,
    /(?:youtube\.com\/embed\/)([^"&?\/\s]{11})/,
    /(?:youtu\.be\/)([^"&?\/\s]{11})/,
    /(?:youtube\.com\/v\/)([^"&?\/\s]{11})/,
    /(?:youtube\.com\/shorts\/)([^"&?\/\s]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export const getYoutubeEmbedUrl = (url: string): string => {
  const videoId = getYoutubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  }
  return url;
};

export const getYoutubeThumbnail = (url: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string => {
  const videoId = getYoutubeVideoId(url);
  if (videoId) {
    const qualityMap = {
      default: 'default',
      mq: 'mqdefault',
      hq: 'hqdefault',
      sd: 'sddefault',
      maxres: 'maxresdefault'
    };
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
  }
  return '';
};

export const isYoutubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  url, 
  title = 'Vídeo', 
  className = '',
  showThumbnail = true 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(!showThumbnail);
  const videoId = getYoutubeVideoId(url);

  if (!videoId) {
    // Not a YouTube URL, try to render as regular video
    return (
      <div className={`aspect-video bg-black rounded-xl overflow-hidden ${className}`}>
        <video 
          src={url} 
          controls 
          className="w-full h-full"
          playsInline
        />
      </div>
    );
  }

  const thumbnailUrl = getYoutubeThumbnail(url, 'hq');
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;

  if (!showPlayer && showThumbnail) {
    return (
      <motion.div 
        className={`aspect-video bg-black rounded-xl overflow-hidden relative cursor-pointer group ${className}`}
        onClick={() => setShowPlayer(true)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <img 
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground ml-1" fill="currentColor" />
          </motion.div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded flex items-center gap-1">
          <Youtube size={14} className="text-red-500" />
          <span className="text-xs text-white">YouTube</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`aspect-video bg-black rounded-xl overflow-hidden relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        title={title}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

// Dialog component for video playback
interface VideoDialogContentProps {
  url: string;
  title: string;
  description?: string;
  onOpenExternal?: () => void;
}

export const VideoDialogContent: React.FC<VideoDialogContentProps> = ({
  url,
  title,
  description,
  onOpenExternal
}) => {
  const videoId = getYoutubeVideoId(url);
  
  return (
    <div className="space-y-4">
      <YouTubePlayer url={url} title={title} showThumbnail={false} />
      
      {(description || videoId) && (
        <div className="flex items-start justify-between gap-4">
          {description && (
            <p className="text-sm text-muted-foreground flex-1">{description}</p>
          )}
          {videoId && (
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-2"
              onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
            >
              <ExternalLink size={14} />
              Abrir no YouTube
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
