import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAlbum } from '../hooks/usePhotos';
import { useLightbox } from '../hooks/useLightbox';
import { GroupDetail, AlbumDetail, ImageInfo } from '../api/client';
import AlbumCard from '../components/AlbumCard';
import PhotoGrid from '../components/PhotoGrid';
import Lightbox from '../components/Lightbox';
import PasswordGate from '../components/PasswordGate';
import AlbumDownloadButton from '../components/AlbumDownloadButton';
import ShareButton from '../components/ShareButton';
import ReadmeContent from '../components/ReadmeContent';

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

export default function GroupPage() {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const [searchParams] = useSearchParams();
  const imageParam = searchParams.get('image');

  const [sortOption, setSortOption] = useState<SortOption>('date-desc');

  const { data, loading, error, refetch } = useAlbum(groupSlug || '');
  const images = (data as AlbumDetail)?.images || [];
  const sortedImages = useMemo(() => sortImages(images, sortOption), [images, sortOption]);
  const lightbox = useLightbox(sortedImages);

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

  // Handle album type (directory with images) - e.g. /albums/photostream
  if (data.type === 'album') {
    const album = data as AlbumDetail;
    
    // Check locked state
    if (album.needsPassword) {
      return (
        <div className="max-w-7xl mx-auto px-5 py-8 safe-left safe-right">
          <div className="mb-8 flex items-center text-sm flex-wrap gap-y-1">
            <Link to="/albums" className="text-neutral-400 hover:text-white active:text-white transition-colors">
              Albums
            </Link>
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
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-black/30" />
            </>
          )}
          
          <div className="absolute inset-0 flex flex-col justify-between max-w-7xl mx-auto px-5 py-6 safe-left safe-right">
            {/* Top Area: Breadcrumbs */}
            <div className="mt-[calc(3.5rem+var(--safe-area-top))] sm:mt-[calc(4rem+var(--safe-area-top))]">
              <div className="flex items-center text-sm text-white/80 flex-wrap gap-y-1 drop-shadow-md">
                <Link to="/albums" className="hover:text-white transition-colors">
                  Albums
                </Link>
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
                 <AlbumDownloadButton albumPath={album.path} albumName={album.name} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-5 py-8 safe-left safe-right">
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
               <div className="hidden md:block flex-1" />
             )}
             
             <div className={`shrink-0 flex items-center gap-2 ${!album.readme ? 'ml-auto' : ''}`}>
                <span className="text-sm text-neutral-400">Sort by:</span>
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

          <PhotoGrid images={sortedImages} onPhotoClick={lightbox.open} lightboxOpen={lightbox.isOpen} />
          
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
    <div className="max-w-7xl mx-auto px-5 py-3 sm:p-4 safe-left safe-right">
      <div className="mb-4 sm:mb-6 flex items-center text-sm flex-wrap gap-y-1">
        <Link to="/albums" className="text-neutral-400 hover:text-white active:text-white transition-colors">
          Albums
        </Link>
        <span className="text-neutral-600 mx-2">/</span>
        <span className="text-white truncate">{group.name}</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-medium text-white mb-4 sm:mb-6">{group.name}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {group.albums.map(album => (
          <AlbumCard key={album.path} album={album} basePath={`/albums/${groupSlug}`} />
        ))}
      </div>
    </div>
  );
}
