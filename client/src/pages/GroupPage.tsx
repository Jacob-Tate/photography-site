import { useParams, Link } from 'react-router-dom';
import { useAlbum } from '../hooks/usePhotos';
import { useLightbox } from '../hooks/useLightbox';
import { GroupDetail, AlbumDetail } from '../api/client';
import AlbumCard from '../components/AlbumCard';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import PasswordGate from '../components/PasswordGate';
import AlbumDownloadButton from '../components/AlbumDownloadButton';

export default function GroupPage() {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { data, loading, error, refetch } = useAlbum(groupSlug || '');
  const images = (data as AlbumDetail)?.images || [];
  const lightbox = useLightbox(images);

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

  // Handle album type (directory with images)
  if (data.type === 'album') {
    const album = data as AlbumDetail;
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-4 pb-0">
          <div className="mb-4 flex items-center text-sm">
            <Link to="/albums" className="text-neutral-400 hover:text-white transition-colors">
              Albums
            </Link>
            <span className="text-neutral-600 mx-2">/</span>
            <span className="text-white">{album.name}</span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-medium text-white">{album.name}</h1>
              <p className="text-neutral-500">{album.imageCount} photos</p>
            </div>
            {!album.needsPassword && (
              <AlbumDownloadButton albumPath={album.path} albumName={album.name} />
            )}
          </div>

          {album.readme && (
            <div
              className="prose prose-invert prose-sm max-w-none mb-6 text-neutral-300"
              dangerouslySetInnerHTML={{ __html: album.readme }}
            />
          )}
        </div>

        {album.needsPassword ? (
          <PasswordGate
            albumPath={album.path}
            albumName={album.name}
            onUnlock={refetch}
          />
        ) : (
          <>
            <PhotoGrid images={images} onPhotoClick={lightbox.open} />
            {lightbox.isOpen && lightbox.currentImage && (
              <Lightbox
                image={lightbox.currentImage}
                onClose={lightbox.close}
                onNext={lightbox.next}
                onPrev={lightbox.prev}
                hasNext={lightbox.hasNext}
                hasPrev={lightbox.hasPrev}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // Handle group type (directory with subdirectories)
  if (data.type !== 'group') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        Not found
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
