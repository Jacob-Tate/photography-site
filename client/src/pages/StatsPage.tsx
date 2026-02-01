import { useEffect, useState, useCallback } from 'react';
import { fetchStats, fetchStatsFilter, StatsData, StatsFilterResult } from '../api/client';
import Lightbox from '../components/Lightbox';

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function RankedList({ title, items, onItemClick }: { title: string; items: { name: string; count: number }[]; onItemClick?: (name: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? items : items.slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-5">
        <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">{title}</h3>
        <p className="text-white/30 text-sm">No data</p>
      </div>
    );
  }
  const max = items[0].count;
  return (
    <div className="bg-white/5 rounded-xl p-5">
      <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-3">
        {displayed.map((item, i) => (
          <div
            key={item.name}
            className={onItemClick ? 'cursor-pointer rounded-lg px-2 py-1 -mx-2 hover:bg-white/10 transition-colors' : ''}
            onClick={onItemClick ? () => onItemClick(item.name) : undefined}
          >
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/80">
                <span className="text-white/40 mr-2">{i + 1}.</span>
                {item.name}
              </span>
              <span className="text-white/50">{item.count}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/30 rounded-full"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {items.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          {showAll ? 'Show less' : `Show all (${items.length})`}
        </button>
      )}
    </div>
  );
}

function HourChart({ data, onBarClick }: { data: number[]; onBarClick?: (hour: number) => void }) {
  const max = Math.max(...data, 1);
  const labels = ['12AM', '6AM', '12PM', '6PM', '12AM'];
  return (
    <div className="bg-white/5 rounded-xl p-5">
      <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">Shooting Times</h3>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((count, hour) => (
          <div
            key={hour}
            className={`flex-1 bg-white/30 rounded-t-sm min-h-[2px] transition-all hover:bg-white/50${count > 0 && onBarClick ? ' cursor-pointer' : ''}`}
            style={{ height: `${(count / max) * 100}%` }}
            title={`${hour}:00 — ${count} photos`}
            onClick={count > 0 && onBarClick ? () => onBarClick(hour) : undefined}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/30 mt-2">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function YearChart({ data, onBarClick }: { data: { year: string; count: number }[]; onBarClick?: (year: string) => void }) {
  if (data.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-5">
        <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">Photos by Year</h3>
        <p className="text-white/30 text-sm">No data</p>
      </div>
    );
  }
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="bg-white/5 rounded-xl p-5">
      <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">Photos by Year</h3>
      <div className="space-y-2">
        {data.map(({ year, count }) => (
          <div
            key={year}
            className={`flex items-center gap-3${onBarClick ? ' cursor-pointer rounded-lg px-2 py-0.5 -mx-2 hover:bg-white/10 transition-colors' : ''}`}
            onClick={onBarClick ? () => onBarClick(year) : undefined}
          >
            <span className="text-white/50 text-sm w-12 text-right">{year}</span>
            <div className="flex-1 h-5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/30 rounded-full"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-white/50 text-sm w-10 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter overlay state
  const [filterImages, setFilterImages] = useState<StatsFilterResult[] | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterLabel, setFilterLabel] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [collapsedAlbums, setCollapsedAlbums] = useState<Set<string>>(new Set());
  const [showIPs, setShowIPs] = useState(false);

  useEffect(() => {
    fetchStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleStatClick = useCallback((field: string, value: string) => {
    let label: string;
    switch (field) {
      case 'camera': label = `Camera: ${value}`; break;
      case 'lens': label = `Lens: ${value}`; break;
      case 'focalLength': label = `Focal Length: ${value}`; break;
      case 'aperture': label = `Aperture: ${value}`; break;
      case 'iso': label = `ISO: ${value}`; break;
      case 'year': label = `Year: ${value}`; break;
      case 'hour': label = `Hour: ${formatHourLabel(Number(value))}`; break;
      default: label = value;
    }
    setFilterLabel(label);
    setFilterLoading(true);
    setFilterImages(null);
    setLightboxIndex(0);
    setCollapsedAlbums(new Set());

    fetchStatsFilter(field, value)
      .then(data => {
        setFilterImages(data.results);
        setFilterLoading(false);
      })
      .catch(() => {
        setFilterImages([]);
        setFilterLoading(false);
      });
  }, []);

  const closeOverlay = useCallback(() => {
    setFilterImages(null);
    setFilterLoading(false);
    setFilterLabel('');
    setLightboxIndex(0);
  }, []);

  const toggleAlbum = useCallback((albumName: string) => {
    setCollapsedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumName)) {
        next.delete(albumName);
      } else {
        next.add(albumName);
      }
      return next;
    });
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex > 0) {
          setLightboxIndex(0);
        } else if (filterImages !== null || filterLoading) {
          closeOverlay();
        } else if (showIPs) {
          setShowIPs(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filterImages, filterLoading, closeOverlay]);

  // Body scroll lock
  useEffect(() => {
    if (filterImages !== null || filterLoading || showIPs) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [filterImages, filterLoading, showIPs]);

  const overlayOpen = filterImages !== null || filterLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Stats</h1>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{stats.totalPhotos.toLocaleString()}</div>
            <div className="text-white/50 text-sm mt-1">Photos</div>
          </div>
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{stats.totalAlbums}</div>
            <div className="text-white/50 text-sm mt-1">Albums</div>
          </div>
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{formatBytes(stats.diskUsageBytes)}</div>
            <div className="text-white/50 text-sm mt-1">Disk Usage</div>
          </div>
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{stats.geotaggedCount.toLocaleString()}</div>
            <div className="text-white/50 text-sm mt-1">Geotagged</div>
          </div>
          <div className="bg-white/5 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{stats.totalViews.toLocaleString()}</div>
            <div className="text-white/50 text-sm mt-1">Total Views</div>
          </div>
          <div
            className="bg-white/5 rounded-xl p-5 text-center cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => setShowIPs(true)}
          >
            <div className="text-3xl font-bold text-white">{stats.uniqueVisitors.toLocaleString()}</div>
            <div className="text-white/50 text-sm mt-1">Unique Visitors</div>
          </div>
        </div>

        {/* Top Viewed */}
        {(stats.topAlbums.length > 0 || stats.topPhotos.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <RankedList title="Top Viewed Albums" items={stats.topAlbums} />
            <RankedList title="Top Viewed Photos" items={stats.topPhotos} />
          </div>
        )}

        {/* Top Gear */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <RankedList title="Top Cameras" items={stats.cameras} onItemClick={(name) => handleStatClick('camera', name)} />
          <RankedList title="Top Lenses" items={stats.lenses} onItemClick={(name) => handleStatClick('lens', name)} />
          <RankedList title="Top Focal Lengths" items={stats.focalLengths} onItemClick={(name) => handleStatClick('focalLength', name)} />
        </div>

        {/* Exposure Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <RankedList title="Top Apertures" items={stats.apertures} onItemClick={(name) => handleStatClick('aperture', name)} />
          <RankedList title="Top ISOs" items={stats.isos} onItemClick={(name) => handleStatClick('iso', name)} />
        </div>

        {/* Time Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourChart data={stats.byHour} onBarClick={(hour) => handleStatClick('hour', String(hour))} />
          <YearChart data={stats.byYear} onBarClick={(year) => handleStatClick('year', year)} />
        </div>
      </div>

      {/* IP addresses overlay */}
      {showIPs && stats.uniqueIPList.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 overflow-auto"
          style={{ zIndex: 1000 }}
          onClick={() => setShowIPs(false)}
        >
          <div className="p-4 pt-16 max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowIPs(false)}
              className="fixed top-4 right-4 p-2 text-white/70 hover:text-white"
              style={{ zIndex: 1001 }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-white text-lg mb-4 text-center">
              Unique Visitors
              <span className="text-white/50 ml-2">— {stats.uniqueIPList.length} IP{stats.uniqueIPList.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="bg-white/5 rounded-xl p-4 space-y-1">
              {stats.uniqueIPList.map((ip) => (
                <div key={ip} className="text-white/70 text-sm font-mono py-1 px-2 rounded hover:bg-white/5">
                  {ip}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter overlay */}
      {overlayOpen && (
        <div
          className="fixed inset-0 bg-black/90 overflow-auto"
          style={{ zIndex: 1000 }}
          onClick={closeOverlay}
        >
          <div className="p-4 pt-16">
            <button
              onClick={closeOverlay}
              className="fixed top-4 right-4 p-2 text-white/70 hover:text-white"
              style={{ zIndex: 1001 }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-white text-lg mb-4 text-center">
              {filterLabel}
              {filterImages && (
                <span className="text-white/50 ml-2">
                  — {filterImages.length} photo{filterImages.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>

            {filterLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {filterImages && filterImages.length === 0 && (
              <p className="text-white/40 text-center py-20">No photos found</p>
            )}

            {filterImages && filterImages.length > 0 && (() => {
              const albums = [...new Set(filterImages.map(img => img.albumName).filter(Boolean))];
              if (albums.length <= 1) {
                return (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {filterImages.map((img, idx) => (
                      <div
                        key={img.path}
                        className="aspect-square cursor-pointer overflow-hidden rounded-lg hover:ring-2 hover:ring-white/50 transition-all"
                        onClick={() => setLightboxIndex(idx + 1)}
                      >
                        <img
                          src={img.thumbnailUrl}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  {albums.map(albumName => {
                    const albumImages = filterImages.filter(img => img.albumName === albumName);
                    const isCollapsed = collapsedAlbums.has(albumName!);
                    return (
                      <div key={albumName} className="mb-6">
                        <button
                          onClick={() => toggleAlbum(albumName!)}
                          className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2 hover:text-white transition-colors"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {albumName} <span className="text-white/40">({albumImages.length})</span>
                        </button>
                        {!isCollapsed && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {albumImages.map(img => {
                              const idx = filterImages.indexOf(img);
                              return (
                                <div
                                  key={img.path}
                                  className="aspect-square cursor-pointer overflow-hidden rounded-lg hover:ring-2 hover:ring-white/50 transition-all"
                                  onClick={() => setLightboxIndex(idx + 1)}
                                >
                                  <img
                                    src={img.thumbnailUrl}
                                    alt={img.filename}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Images without album (portfolio) */}
                  {filterImages.some(img => !img.albumName) && (() => {
                    const portfolioImages = filterImages.filter(img => !img.albumName);
                    const isCollapsed = collapsedAlbums.has('__portfolio__');
                    return (
                      <div className="mb-6">
                        <button
                          onClick={() => toggleAlbum('__portfolio__')}
                          className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2 hover:text-white transition-colors"
                        >
                          <svg className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Portfolio <span className="text-white/40">({portfolioImages.length})</span>
                        </button>
                        {!isCollapsed && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {portfolioImages.map(img => {
                              const idx = filterImages.indexOf(img);
                              return (
                                <div
                                  key={img.path}
                                  className="aspect-square cursor-pointer overflow-hidden rounded-lg hover:ring-2 hover:ring-white/50 transition-all"
                                  onClick={() => setLightboxIndex(idx + 1)}
                                >
                                  <img
                                    src={img.thumbnailUrl}
                                    alt={img.filename}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {filterImages && filterImages.length > 0 && lightboxIndex > 0 && (
        <div className="fixed inset-0" style={{ zIndex: 1002 }}>
          <Lightbox
            image={filterImages[lightboxIndex - 1]}
            onClose={() => setLightboxIndex(0)}
            onNext={() => {
              if (lightboxIndex - 1 < filterImages.length - 1) {
                setLightboxIndex(lightboxIndex + 1);
              }
            }}
            onPrev={() => {
              if (lightboxIndex - 1 > 0) {
                setLightboxIndex(lightboxIndex - 1);
              }
            }}
            hasNext={lightboxIndex - 1 < filterImages.length - 1}
            hasPrev={lightboxIndex - 1 > 0}
            images={filterImages}
            currentIndex={lightboxIndex - 1}
            onNavigate={(idx) => setLightboxIndex(idx + 1)}
          />
        </div>
      )}
    </div>
  );
}
