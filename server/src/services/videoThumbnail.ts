import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { THUMBNAILS_DIR, config, videoThumbnailOffset } from '../config';

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
}

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    const data = JSON.parse(stdout);

    // Find the video stream
    const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');

    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;
    const duration = parseFloat(data.format?.duration || '0');

    return { width, height, duration };
  } catch (err) {
    console.error(`[video] Failed to get metadata for ${filePath}:`, err);
    return { width: 0, height: 0, duration: 0 };
  }
}

export async function ensureVideoThumbnail(sourceAbsPath: string, relativePath: string): Promise<string> {
  const parsed = path.parse(relativePath);
  const thumbDir = path.join(THUMBNAILS_DIR, parsed.dir);
  const thumbPath = path.join(thumbDir, `${parsed.name}.jpg`);

  // Check if thumbnail already exists and is newer than source
  if (fs.existsSync(thumbPath)) {
    const srcStat = fs.statSync(sourceAbsPath);
    const thumbStat = fs.statSync(thumbPath);
    if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
      return thumbPath;
    }
  }

  // Ensure thumbnail directory exists
  fs.mkdirSync(thumbDir, { recursive: true });

  // Get video duration to determine offset
  const { duration } = await getVideoMetadata(sourceAbsPath);
  const offset = duration < videoThumbnailOffset ? 0 : videoThumbnailOffset;

  try {
    // Extract frame using FFmpeg
    await execFileAsync('ffmpeg', [
      '-ss', offset.toString(),
      '-i', sourceAbsPath,
      '-vframes', '1',
      '-vf', `scale=${config.thumbnailMaxWidth}:-1`,
      '-q:v', '2', // High quality JPEG
      '-y', // Overwrite output file
      thumbPath,
    ]);

    console.log(`[video] Generated thumbnail: ${relativePath}`);
    return thumbPath;
  } catch (err) {
    console.error(`[video] Failed to generate thumbnail for ${relativePath}:`, err);
    throw err;
  }
}

export function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ['.mp4', '.mov', '.webm', '.m4v', '.mkv'].includes(ext);
}
