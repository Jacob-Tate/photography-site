import { useParams, Link } from 'react-router-dom';
import { useAlbum } from '../hooks/usePhotos';
import { GroupDetail } from '../api/client';
import AlbumCard from '../components/AlbumCard';

export default function GroupPage() {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { data, loading, error } = useAlbum(groupSlug || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        {error || 'Not found'}
      </div>
    );
  }

  if (data.type !== 'group') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        Not a group
      </div>
    );
  }

  const group = data as GroupDetail;

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <Link to="/albums" className="text-neutral-400 hover:text-white text-sm transition-colors">
          Albums
        </Link>
        <span className="text-neutral-600 mx-2">/</span>
        <span className="text-white">{group.name}</span>
      </div>

      <h1 className="text-2xl font-medium text-white mb-6">{group.name}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {group.albums.map(album => (
          <AlbumCard key={album.path} album={album} basePath={`/albums/${groupSlug}`} />
        ))}
      </div>
    </div>
  );
}
