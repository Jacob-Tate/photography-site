export interface ImageInfo {
  filename: string;
  path: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  fullUrl: string;
  downloadUrl: string;
}

export interface AlbumInfo {
  name: string;
  slug: string;
  path: string;
  coverImage: string | null;
  imageCount: number;
  hasPassword: boolean;
  readme?: string;
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
