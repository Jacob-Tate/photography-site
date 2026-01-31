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
  caption?: string;
}

export interface AlbumInfo {
  name: string;
  slug: string;
  path: string;
  coverImage: string | null;
  imageCount: number;
  hasPassword: boolean;
  readme?: string;
  updatedAt?: number;
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

declare module 'express-session' {
  interface SessionData {
    unlockedAlbums?: string[];
  }
}
