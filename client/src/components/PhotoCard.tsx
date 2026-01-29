import { useState } from 'react';
import { ImageInfo } from '../api/client';

interface PhotoCardProps {
  image: ImageInfo;
  onClick: () => void;
}

export default function PhotoCard({ image, onClick }: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const aspectRatio = image.height / image.width;

  return (
    <div
      className="mb-4 break-inside-avoid cursor-pointer group relative overflow-hidden rounded-sm"
      onClick={onClick}
    >
      <div style={{ paddingBottom: `${aspectRatio * 100}%` }} className="relative">
        <img
          src={image.thumbnailUrl}
          alt={image.filename}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-105`}
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
        )}
      </div>
    </div>
  );
}
