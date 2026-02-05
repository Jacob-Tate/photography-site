import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { SOCIAL_EXPORTS_DIR } from '../config';

export interface SocialPreset {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number | null; // null for "fit within" mode (Facebook)
  aspectRatio: string;
  format: 'jpeg' | 'png';
  quality: number;
  crop: boolean; // false for Facebook mode (no crop, maintain aspect)
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  // Instagram
  { id: 'instagram-square', name: 'Square', platform: 'Instagram', width: 1080, height: 1080, aspectRatio: '1:1', format: 'jpeg', quality: 95, crop: true },
  { id: 'instagram-portrait', name: 'Portrait', platform: 'Instagram', width: 1080, height: 1350, aspectRatio: '4:5', format: 'jpeg', quality: 95, crop: true },
  { id: 'instagram-landscape', name: 'Landscape', platform: 'Instagram', width: 1080, height: 566, aspectRatio: '1.91:1', format: 'jpeg', quality: 95, crop: true },
  { id: 'instagram-stories', name: 'Stories', platform: 'Instagram', width: 1080, height: 1920, aspectRatio: '9:16', format: 'jpeg', quality: 95, crop: true },
  // Facebook
  { id: 'facebook-optimized', name: 'Optimized', platform: 'Facebook', width: 2048, height: null, aspectRatio: 'original', format: 'png', quality: 100, crop: false },
  // Twitter/X
  { id: 'twitter-16x9', name: '16:9', platform: 'Twitter/X', width: 1600, height: 900, aspectRatio: '16:9', format: 'jpeg', quality: 95, crop: true },
  // LinkedIn
  { id: 'linkedin-post', name: 'Post', platform: 'LinkedIn', width: 1200, height: 627, aspectRatio: '1.91:1', format: 'jpeg', quality: 95, crop: true },
];

export function getPresetById(presetId: string): SocialPreset | undefined {
  return SOCIAL_PRESETS.find(p => p.id === presetId);
}

function getSocialExportPath(relativePath: string, preset: SocialPreset): string {
  const parsed = path.parse(relativePath);
  const ext = preset.format === 'png' ? 'png' : 'jpg';
  return path.join(SOCIAL_EXPORTS_DIR, parsed.dir, `${parsed.name}-${preset.id}.${ext}`);
}

const FACEBOOK_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function generateSocialExport(sourcePath: string, preset: SocialPreset): Promise<Buffer> {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  let pipeline: sharp.Sharp;

  if (preset.crop && preset.height !== null) {
    // Center crop mode: extract center region at target aspect ratio, then resize
    const targetAspect = preset.width / preset.height;
    const sourceAspect = metadata.width / metadata.height;

    let extractWidth: number;
    let extractHeight: number;

    if (sourceAspect > targetAspect) {
      // Source is wider than target - crop sides
      extractHeight = metadata.height;
      extractWidth = Math.round(metadata.height * targetAspect);
    } else {
      // Source is taller than target - crop top/bottom
      extractWidth = metadata.width;
      extractHeight = Math.round(metadata.width / targetAspect);
    }

    const left = Math.round((metadata.width - extractWidth) / 2);
    const top = Math.round((metadata.height - extractHeight) / 2);

    pipeline = image
      .extract({ left, top, width: extractWidth, height: extractHeight })
      .resize(preset.width, preset.height);
  } else {
    // Facebook mode: resize to fit within max dimension, no crop, maintain aspect
    pipeline = image
      .resize({
        width: preset.width,
        height: preset.width, // Square bounding box
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toColorspace('srgb'); // Force sRGB for Facebook
  }

  if (preset.format === 'png') {
    // For Facebook, ensure file stays under 10MB
    let buffer = await pipeline.clone().png({ compressionLevel: 9 }).toBuffer();

    if (preset.id === 'facebook-optimized' && buffer.length > FACEBOOK_MAX_SIZE) {
      // If still too large, progressively reduce dimensions
      let scale = 0.9;
      while (buffer.length > FACEBOOK_MAX_SIZE && scale > 0.5) {
        const newWidth = Math.round(preset.width * scale);
        buffer = await sharp(sourcePath)
          .resize({
            width: newWidth,
            height: newWidth,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toColorspace('srgb')
          .png({ compressionLevel: 9 })
          .toBuffer();
        scale -= 0.1;
      }
    }

    return buffer;
  } else {
    return pipeline.jpeg({ quality: preset.quality }).toBuffer();
  }
}

export async function ensureSocialExport(
  sourceAbsPath: string,
  relativePath: string,
  preset: SocialPreset
): Promise<string> {
  const exportPath = getSocialExportPath(relativePath, preset);

  // Check if cached export exists and is still valid
  if (fs.existsSync(exportPath)) {
    const srcStat = fs.statSync(sourceAbsPath);
    const exportStat = fs.statSync(exportPath);
    if (exportStat.mtimeMs >= srcStat.mtimeMs) {
      return exportPath;
    }
  }

  // Ensure directory exists
  const exportDir = path.dirname(exportPath);
  fs.mkdirSync(exportDir, { recursive: true });

  // Generate and save the export
  const buffer = await generateSocialExport(sourceAbsPath, preset);
  fs.writeFileSync(exportPath, buffer);

  return exportPath;
}
