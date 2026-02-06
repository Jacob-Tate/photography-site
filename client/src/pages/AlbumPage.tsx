import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAlbum } from '../hooks/usePhotos';
import { useLightbox } from '../hooks/useLightbox';
import { AlbumDetail, ImageInfo } from '../api/client';
import PhotoGrid from '../components/PhotoGrid';
import TripDaysGrid from '../components/TripDaysGrid';
import Lightbox from '../components/Lightbox';
import PasswordGate from '../components/PasswordGate';
import AlbumDownloadButton from '../components/AlbumDownloadButton';
import ShareButton from '../components/ShareButton';
import ReadmeContent from '../components/ReadmeContent';
import MapTrailButton from '../components/MapTrailButton';

type SortOption = 'filename-asc' | 'filename-desc' | 'date-desc' | 'date-asc';

function parseDateTaken(dateStr: string): number | null {
  const parsed = new Date(dateStr.replace(' at ', ' '));
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function sortImages(images: ImageInfo[], sort: SortOption): ImageInfo[] {
  const sorted = [...images];
  switch (sort) {
    case 'filename-asc':
      return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    case 'filename-desc':
      return sorted.sort((a, b) => b.filename.localeCompare(a.filename));
    case 'date-desc':
      return sorted.sort((a, b) => {
        const da = a.exif?.dateTaken ? parseDateTaken(a.exif.dateTaken) : null;
        const db = b.exif?.dateTaken ? parseDateTaken(b.exif.dateTaken) : null;
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return db - da;
      });
    case 'date-asc':
      return sorted.sort((a, b) => {
        const da = a.exif?.dateTaken ? parseDateTaken(a.exif.dateTaken) : null;
        const db = b.exif?.dateTaken ? parseDateTaken(b.exif.dateTaken) : null;
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
  }
}

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

  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  const { data, loading, error, refetch } = useAlbum(path);
  const album = data as AlbumDetail | undefined;
  const images = album?.images || [];
  const sortedImages = useMemo(() => sortImages(images, sortOption), [images, sortOption]);
  const lightbox = useLightbox(sortedImages);

  // Reset sort when navigating to a different album
  useEffect(() => {
    setSortOption('date-desc');
  }, [path]);

  // Auto-open lightbox when ?image= param is present
  useEffect(() => {
    if (!imageParam || sortedImages.length === 0) return;
    const index = sortedImages.findIndex(img => img.filename === imageParam);
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

  if (data.type !== 'album' || !album) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400">
        Not an album
      </div>
    );
  }

  // Build breadcrumb
  const pathParts = path.split('/');
  const breadcrumbs = pathParts.slice(0, -1);

  if (album.needsPassword) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-8 safe-left safe-right">
        {/* Simple breadcrumb for locked view */}
        <div className="mb-8 flex items-center text-sm flex-wrap gap-y-1">
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

        <PasswordGate
          albumPath={album.path}
          albumName={album.name}
          onUnlock={refetch}
        />
      </div>
    );
  }

  // Determine hero image
  const heroImage = album.coverImage || sortedImages[0]?.fullUrl;

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative w-full h-[50vh] min-h-[400px] overflow-hidden group">
        {heroImage && (
          <>
            <img
              src={heroImage}
              alt={album.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-black/30" />
          </>
        )}
        
        {/* Hero Content */}
        <div className="absolute inset-0 flex flex-col justify-between max-w-7xl mx-auto px-5 py-6 safe-left safe-right">
          
          {/* Top Area: Breadcrumbs */}
          <div className="mt-[calc(3.5rem+var(--safe-area-top))] sm:mt-[calc(4rem+var(--safe-area-top))]">
            <div className="flex items-center text-sm text-white/80 flex-wrap gap-y-1 drop-shadow-md">
              <Link to="/albums" className="hover:text-white transition-colors">
                Albums
              </Link>
              {breadcrumbs.map((part, i) => (
                <span key={i} className="flex items-center">
                  <span className="mx-2 opacity-60">/</span>
                  <Link
                    to={`/albums/${breadcrumbs.slice(0, i + 1).join('/')}`}
                    className="hover:text-white transition-colors"
                  >
                    {part.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Link>
                </span>
              ))}
              <span className="mx-2 opacity-60">/</span>
              <span className="font-medium text-white">{album.name}</span>
            </div>
          </div>

          {/* Bottom Area: Title & Actions */}
          <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
            <div className="text-white drop-shadow-lg">
               <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 tracking-tight">{album.name}</h1>
               <p className="text-lg text-white/80">{album.imageCount} photos</p>
            </div>
            
            <div className="flex items-center gap-3">
               <ShareButton type="album" targetPath={album.path} />
               <MapTrailButton images={sortedImages} />
               <AlbumDownloadButton albumPath={album.path} albumName={album.name} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-5 py-8 safe-left safe-right">
        
        {/* Description & Sort Toolbar */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-8">
           {album.readme ? (
             <div className="flex-1 max-w-3xl">
               <ReadmeContent
                 html={album.readme}
                 images={sortedImages}
                 onImageClick={lightbox.open}
               />
             </div>
           ) : (
             // Spacer if no readme
             <div className="hidden md:block flex-1" />
           )}
           
           {/* Sort Control */}
           <div className={`shrink-0 flex items-center gap-2 ${!album.readme ? 'ml-auto' : ''}`}>
              <span className="text-sm text-neutral-400">Sort:</span>
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as SortOption)}
                className="bg-neutral-800 text-neutral-300 text-sm border border-neutral-700 rounded-lg px-3 py-2 outline-none hover:border-neutral-600 focus:border-neutral-500 cursor-pointer transition-colors"
              >
                <option value="filename-asc">Filename (A→Z)</option>
                <option value="filename-desc">Filename (Z→A)</option>
                <option value="date-desc">Date taken (newest)</option>
                <option value="date-asc">Date taken (oldest)</option>
              </select>
           </div>
        </div>

        {album.tripDays ? (
          <TripDaysGrid images={sortedImages} onPhotoClick={lightbox.open} lightboxOpen={lightbox.isOpen} />
        ) : (
          <PhotoGrid images={sortedImages} onPhotoClick={lightbox.open} lightboxOpen={lightbox.isOpen} />
        )}
        
        {lightbox.isOpen && lightbox.currentImage && (
          <Lightbox
            image={lightbox.currentImage}
            onClose={lightbox.close}
            onNext={lightbox.next}
            onPrev={lightbox.prev}
            hasNext={lightbox.hasNext}
            hasPrev={lightbox.hasPrev}
            images={sortedImages}
            currentIndex={lightbox.currentIndex!}
            onNavigate={lightbox.navigateTo}
          />
        )}
      </div>
    </div>
  );
}
