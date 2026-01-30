export interface ExifData {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  dateTaken?: string;
  dimensions?: string;
  aspectRatio?: string;
  megapixels?: string;
  exposureComp?: string;
  whiteBalance?: string;
  flash?: string;
  colorSpace?: string;
  keywords?: string[];
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
}

export interface ImageInfo {
  filename: string;
  path: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  fullUrl: string;
  downloadUrl: string;
  exif?: ExifData;
}

export interface AlbumInfo {
  name: string;
  slug: string;
  path: string;
  coverImage: string | null;
  imageCount: number;
  hasPassword: boolean;
}

export interface GroupInfo {
  name: string;
  slug: string;
  albums: AlbumInfo[];
}

export interface AlbumTree {
  groups: GroupInfo[];
  albums: AlbumInfo[];
}

export interface AlbumDetail {
  type: 'album';
  name: string;
  slug: string;
  path: string;
  hasPassword: boolean;
  needsPassword: boolean;
  images?: ImageInfo[];
  readme?: string;
  imageCount: number;
}

export interface GroupDetail {
  type: 'group';
  name: string;
  slug: string;
  albums: AlbumInfo[];
}

export async function fetchPortfolio(): Promise<{ images: ImageInfo[] }> {
  const res = await fetch('/api/portfolio');
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}

export async function fetchAlbumTree(): Promise<AlbumTree> {
  const res = await fetch('/api/albums');
  if (!res.ok) throw new Error('Failed to fetch albums');
  return res.json();
}

export async function fetchAlbumDetail(path: string): Promise<AlbumDetail | GroupDetail> {
  const res = await fetch(`/api/albums/${path}`);
  if (!res.ok) throw new Error('Failed to fetch album');
  return res.json();
}

export async function checkAuth(albumPath: string): Promise<{ hasPassword: boolean; isUnlocked: boolean }> {
  const res = await fetch('/api/auth/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumPath }),
  });
  if (!res.ok) throw new Error('Auth check failed');
  return res.json();
}

export async function unlockAlbum(albumPath: string, password: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/auth/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ albumPath, password }),
  });
  return res.json();
}

export interface MapImage extends ImageInfo {
  albumName?: string;
  albumPath?: string;
}

export async function fetchMapImages(): Promise<{ images: MapImage[] }> {
  const res = await fetch('/api/map');
  if (!res.ok) throw new Error('Failed to fetch map data');
  return res.json();
}

export interface SearchResult extends ImageInfo {
  albumName?: string;
  albumPath?: string;
}

export async function searchImages(query: string): Promise<{ results: SearchResult[]; query: string }> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export interface TagInfo {
  tag: string;
  count: number;
}

export async function fetchTags(): Promise<{ tags: TagInfo[] }> {
  const res = await fetch('/api/tags');
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export interface StatsData {
  totalPhotos: number;
  totalAlbums: number;
  totalGroups: number;
  diskUsageBytes: number;
  cameras: { name: string; count: number }[];
  lenses: { name: string; count: number }[];
  focalLengths: { name: string; count: number }[];
  apertures: { name: string; count: number }[];
  isos: { name: string; count: number }[];
  byYear: { year: string; count: number }[];
  byHour: number[];
  geotaggedCount: number;
  keywordedCount: number;
}

export async function fetchStats(): Promise<StatsData> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}