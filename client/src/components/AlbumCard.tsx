import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlbumInfo } from '../api/client';

interface AlbumCardProps {
  album: AlbumInfo;
  basePath?: string;
}

export default function AlbumCard({ album, basePath = '' }: AlbumCardProps) {
  const [loaded, setLoaded] = useState(false);
  const to = basePath ? `${basePath}/${album.slug}` : `/albums/${album.path.replace('albums/', '')}`;
  const aspectRatio = album.coverWidth && album.coverHeight
    ? album.coverHeight / album.coverWidth
    : 3 / 4;

  return (
    <Link to={to} className="block group break-inside-avoid mb-3 sm:mb-4">
      <div className="relative overflow-hidden rounded-sm bg-neutral-800">
        <div style={{ paddingBottom: `${aspectRatio * 100}%` }} className="relative">
          {album.coverImage ? (
            <img
              src={album.coverImage}
              alt={album.name}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                loaded ? 'opacity-100' : 'opacity-0'
              } group-hover:scale-105`}
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {!loaded && album.coverImage && (
            <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
          )}
        </div>
        {album.hasPassword && (
          <div className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-white font-medium group-hover:text-neutral-300 transition-colors">
          {album.name}
        </h3>
        <p className="text-neutral-500 text-sm">{album.imageCount} photos</p>
      </div>
    </Link>
  );
}
