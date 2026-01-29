import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchImages, SearchResult } from '../api/client';
import Lightbox from '../components/Lightbox';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    searchImages(query)
      .then(data => {
        setResults(data.results);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [query]);

  if (!query) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/50">Enter a keyword to search</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl text-white">
          {results.length} result{results.length !== 1 ? 's' : ''} for "<span className="text-white/70">{query}</span>"
        </h1>
      </div>

      {results.length === 0 ? (
        <p className="text-white/50">No photos found matching that keyword</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {results.map((img, idx) => (
            <div
              key={img.path}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg"
              onClick={() => setLightboxIndex(idx)}
            >
              <img
                src={img.thumbnailUrl}
                alt={img.filename}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white/90 truncate">{img.albumName}</p>
                {img.exif?.keywords && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {img.exif.keywords.slice(0, 3).map((kw, i) => (
                      <span key={i} className="bg-white/20 text-white/80 px-1.5 py-0.5 rounded text-[10px]">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          image={results[lightboxIndex]}
          onClose={() => setLightboxIndex(null)}
          onNext={() => {
            if (lightboxIndex < results.length - 1) setLightboxIndex(lightboxIndex + 1);
          }}
          onPrev={() => {
            if (lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
          }}
          hasNext={lightboxIndex < results.length - 1}
          hasPrev={lightboxIndex > 0}
        />
      )}
    </div>
  );
}
