import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTags, TagInfo } from '../api/client';

const COLORS = [
  'rgb(255, 255, 255)',
  'rgb(160, 200, 255)',
  'rgb(180, 160, 255)',
  'rgb(255, 180, 200)',
  'rgb(180, 255, 200)',
  'rgb(255, 220, 150)',
  'rgb(200, 200, 220)',
];

// Deterministic shuffle seeded by tag list length
function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  let seed = copy.length;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function TagCloudPage() {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags()
      .then(data => {
        setTags(data.tags);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const cloud = useMemo(() => {
    if (tags.length === 0) return [];
    const maxCount = tags[0].count;
    const minCount = tags[tags.length - 1].count;
    const logMin = Math.log(minCount);
    const logMax = Math.log(maxCount);
    const range = logMax - logMin || 1;

    return shuffled(tags).map((t, i) => {
      const norm = (Math.log(t.count) - logMin) / range;
      const fontSize = 0.7 + norm * 2.8; // 0.7rem to 3.5rem
      const color = COLORS[i % COLORS.length];
      const rotation = norm > 0.6 ? 0 : [0, 0, 0, -12, 12, -8, 8, 0][i % 8];
      const opacity = 0.5 + norm * 0.5; // 0.5 to 1.0
      return { ...t, fontSize, color, rotation, opacity };
    });
  }, [tags]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-xl mb-2">No tags found</p>
          <p className="text-sm">Photos with IPTC keywords will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full flex flex-wrap items-center justify-center gap-x-1 gap-y-0 text-center leading-relaxed">
        {cloud.map(({ tag, count, fontSize, color, rotation, opacity }) => (
          <Link
            key={tag}
            to={`/search?q=${encodeURIComponent(tag)}`}
            className="inline-block px-2 py-1 transition-all duration-200 hover:scale-110 hover:!opacity-100"
            style={{
              fontSize: `${fontSize}rem`,
              color,
              opacity,
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              fontWeight: fontSize > 2 ? 700 : fontSize > 1.2 ? 500 : 400,
            }}
            title={`${tag} (${count})`}
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
