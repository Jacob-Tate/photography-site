import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAlbumTree, AlbumTree } from '../api/client';
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
    <div className="max-w-7xl mx-auto p-4">
      {/* Groups */}
      {data.groups.map(group => (
        <div key={group.slug} className="mb-12">
          <Link
            to={`/albums/${group.slug}`}
            className="text-lg font-medium text-white hover:text-neutral-300 mb-4 block"
          >
            {group.name}
          </Link>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {group.albums.slice(0, 4).map(album => (
              <AlbumCard key={album.path} album={album} />
            ))}
          </div>
          {group.albums.length > 4 && (
            <Link
              to={`/albums/${group.slug}`}
              className="mt-4 inline-block text-neutral-400 hover:text-white text-sm transition-colors"
            >
              View all {group.albums.length} albums
            </Link>
          )}
        </div>
      ))}

      {/* Top-level albums */}
      {data.albums.length > 0 && (
        <div>
          {data.groups.length > 0 && (
            <h2 className="text-lg font-medium text-white mb-4">Albums</h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.albums.map(album => (
              <AlbumCard key={album.path} album={album} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
