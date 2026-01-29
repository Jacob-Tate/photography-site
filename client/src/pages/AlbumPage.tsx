import { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAlbum } from '../hooks/usePhotos';
import { useLightbox } from '../hooks/useLightbox';
import { AlbumDetail } from '../api/client';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import PasswordGate from '../components/PasswordGate';
import AlbumDownloadButton from '../components/AlbumDownloadButton';
import ShareButton from '../components/ShareButton';
import ReadmeContent from '../components/ReadmeContent';

export default function AlbumPage() {
  const params = useParams<{ groupSlug?: string; albumSlug: string; '*'?: string }>();

  let path = '';
  if (params.groupSlug && params.albumSlug) {
    path = `${params.groupSlug}/${params.albumSlug}`;
  } else if (params['*']) {
    path = params['*'];
  } else if (params.albumSlug) {
    path = params.albumSlug;
  }

  const [searchParams] = useSearchParams();
  const imageParam = searchParams.get('image');

  const { data, loading, error, refetch } = useAlbum(path);
  const images = (data as AlbumDetail)?.images || [];
  const lightbox = useLightbox(images);

  // Auto-open lightbox when ?image= param is present
  useEffect(() => {
    if (!imageParam || images.length === 0) return;
    const index = images.findIndex(img => img.filename === imageParam);
    if (index !== -1) {
      lightbox.open(index);
    }
  }, [imageParam, images.length]);

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

  if (data.type !== 'album') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        Not an album
      </div>
    );
  }

  const album = data as AlbumDetail;

  // Build breadcrumb
  const pathParts = path.split('/');
  const breadcrumbs = pathParts.slice(0, -1);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="p-3 sm:p-4 pb-0 safe-left safe-right">
        <div className="mb-3 sm:mb-4 flex items-center text-sm flex-wrap gap-y-1">
          <Link to="/albums" className="text-neutral-400 hover:text-white active:text-white transition-colors">
            Albums
          </Link>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center">
              <span className="text-neutral-600 mx-2">/</span>
              <Link
                to={`/albums/${breadcrumbs.slice(0, i + 1).join('/')}`}
                className="text-neutral-400 hover:text-white active:text-white transition-colors"
              >
                {part.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Link>
            </span>
          ))}
          <span className="text-neutral-600 mx-2">/</span>
          <span className="text-white truncate">{album.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-medium text-white truncate">{album.name}</h1>
            <p className="text-neutral-500 text-sm sm:text-base">{album.imageCount} photos</p>
          </div>
          {!album.needsPassword && (
            <div className="flex items-center gap-2">
              <ShareButton type="album" targetPath={album.path} />
              <AlbumDownloadButton albumPath={album.path} albumName={album.name} />
            </div>
          )}
        </div>

        {/* README */}
        {album.readme && (
          <ReadmeContent
            html={album.readme}
            images={images}
            onImageClick={lightbox.open}
          />
        )}
      </div>

      {/* Password gate or photos */}
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
