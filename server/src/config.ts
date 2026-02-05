import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Resolve PHOTOS_DIR relative to project root (where .env is), not CWD
const projectRoot = path.dirname(envPath);
const photosDir = process.env.PHOTOS_DIR || './photos';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  photosDir: path.resolve(projectRoot, photosDir),
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  apiKey: process.env.API_KEY || '',
  thumbnailMaxWidth: 600,
  thumbnailQuality: 80,
};

export const PORTFOLIO_DIR = path.join(config.photosDir, 'portfolio');
export const ALBUMS_DIR = path.join(config.photosDir, 'albums');
export const THUMBNAILS_DIR = path.join(config.photosDir, '.thumbnails');
export const SOCIAL_EXPORTS_DIR = path.join(config.photosDir, '.social-exports');

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.mkv'];
export const MEDIA_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];
export const videoThumbnailOffset = 1; // extract frame at 1 second to avoid black frames
