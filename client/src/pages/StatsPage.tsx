import { useEffect, useState } from 'react';
import { fetchStats, StatsData } from '../api/client';

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function RankedList({ title, items }: { title: string; items: { name: string; count: number }[] }) {
  const top = items.slice(0, 5);
  if (top.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-5">
        <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">{title}</h3>
        <p className="text-white/30 text-sm">No data</p>
      </div>
    );
  }
  const max = top[0].count;
  return (
    <div className="bg-white/5 rounded-xl p-5">
      <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-3">
        {top.map((item, i) => (
          <div key={item.name}>
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
    </div>
  );
}

function HourChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const labels = ['12AM', '6AM', '12PM', '6PM', '12AM'];
  return (
    <div className="bg-white/5 rounded-xl p-5">
      <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4">Shooting Times</h3>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((count, hour) => (
          <div
            key={hour}
            className="flex-1 bg-white/30 rounded-t-sm min-h-[2px] transition-all hover:bg-white/50"
            style={{ height: `${(count / max) * 100}%` }}
            title={`${hour}:00 — ${count} photos`}
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

function YearChart({ data }: { data: { year: string; count: number }[] }) {
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
          <div key={year} className="flex items-center gap-3">
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

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="bg-white/5 rounded-xl p-5 text-center">
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
          <RankedList title="Top Cameras" items={stats.cameras} />
          <RankedList title="Top Lenses" items={stats.lenses} />
          <RankedList title="Top Focal Lengths" items={stats.focalLengths} />
        </div>

        {/* Time Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HourChart data={stats.byHour} />
          <YearChart data={stats.byYear} />
        </div>
      </div>
    </div>
  );
}
