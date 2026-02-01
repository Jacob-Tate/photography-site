import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAlbumTree, AlbumTree, AlbumInfo } from '../api/client';
import AlbumCard from '../components/AlbumCard';

export default function AlbumsPage() {
  const [data, setData] = useState<AlbumTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlbumTree()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const recentAlbums = useMemo(() => {
    if (!data) return [];
    const all: AlbumInfo[] = [
      ...data.albums,
      ...data.groups.flatMap(g => g.albums),
    ];
    return all
      .filter(a => a.updatedAt)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 8);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        {error}
      </div>
    );
  }

  if (!data || (data.groups.length === 0 && data.albums.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-neutral-500">
        No albums yet
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-3 sm:p-4 safe-left safe-right">
      {/* Recent changes */}
      {recentAlbums.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Recent Changes</h2>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
            {recentAlbums.map(album => (
              <AlbumCard key={album.path} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* Top-level albums */}
      {data.albums.length > 0 && (
        <div className={data.groups.length > 0 ? 'mb-8 sm:mb-12' : ''}>
          {data.groups.length > 0 && (
            <h2 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Albums</h2>
          )}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
            {data.albums.map(album => (
              <AlbumCard key={album.path} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {data.groups.map(group => (
        <div key={group.slug} className="mb-8 sm:mb-12">
          <Link
            to={`/albums/${group.slug}`}
            className="text-base sm:text-lg font-medium text-white hover:text-neutral-300 active:text-neutral-300 mb-3 sm:mb-4 block touch-target"
          >
            {group.name}
          </Link>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
            {group.albums.slice(0, 4).map(album => (
              <AlbumCard key={album.path} album={album} />
            ))}
          </div>
          {group.albums.length > 4 && (
            <Link
              to={`/albums/${group.slug}`}
              className="mt-3 sm:mt-4 inline-block text-neutral-400 hover:text-white active:text-white text-sm transition-colors py-2 touch-target"
            >
              View all {group.albums.length} albums
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
