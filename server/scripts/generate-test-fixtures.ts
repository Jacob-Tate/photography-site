/**
 * Generate test photo fixtures for the photography portfolio test suite.
 *
 * Uses Sharp to create tiny JPEG images with embedded EXIF/XMP metadata,
 * plus the text config files (cover.txt, password.txt, etc.) that tests expect.
 *
 * Usage:  npx tsx scripts/generate-test-fixtures.ts
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Resolve photos dir relative to the project root (one level up from this script)
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PHOTOS_DIR = path.join(PROJECT_ROOT, 'photos');
const WIDTH = 100;
const HEIGHT = 67;

// ---------------------------------------------------------------------------
// EXIF helpers — build a minimal valid EXIF APP1 segment
// ---------------------------------------------------------------------------

interface ExifOptions {
  make?: string;
  model?: string;
  dateTime?: string;        // "YYYY:MM:DD HH:MM:SS"
  gpsLat?: number;          // decimal degrees (positive = N)
  gpsLng?: number;          // decimal degrees (positive = E)
}

function toRational(value: number): [number, number] {
  const denom = 10000;
  return [Math.round(value * denom), denom];
}

function degreesToDMS(decimal: number): Array<[number, number]> {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return [[d, 1], [m, 1], toRational(s)];
}

function buildExifBuffer(opts: ExifOptions): Buffer {
  // We build a minimal TIFF structure (little-endian) with IFD0, ExifIFD, and optionally GPSIFD.
  // Then wrap it in the APP1 EXIF header.

  const entries: Array<{ tag: number; type: number; count: number; value: Buffer }> = [];
  const exifEntries: Array<{ tag: number; type: number; count: number; value: Buffer }> = [];
  const gpsEntries: Array<{ tag: number; type: number; count: number; value: Buffer }> = [];

  // Helpers to create value buffers
  const asciiValue = (s: string): Buffer => {
    const buf = Buffer.alloc(s.length + 1);
    buf.write(s, 'ascii');
    buf[s.length] = 0;
    return buf;
  };

  const rationalValue = (num: number, den: number): Buffer => {
    const buf = Buffer.alloc(8);
    buf.writeUInt32LE(num, 0);
    buf.writeUInt32LE(den, 4);
    return buf;
  };

  const multiRationalValue = (pairs: Array<[number, number]>): Buffer => {
    const buf = Buffer.alloc(pairs.length * 8);
    for (let i = 0; i < pairs.length; i++) {
      buf.writeUInt32LE(pairs[i][0], i * 8);
      buf.writeUInt32LE(pairs[i][1], i * 8 + 4);
    }
    return buf;
  };

  // IFD0: Make (0x010F)
  if (opts.make) {
    const val = asciiValue(opts.make);
    entries.push({ tag: 0x010F, type: 2, count: val.length, value: val });
  }

  // IFD0: Model (0x0110)
  if (opts.model) {
    const val = asciiValue(opts.model);
    entries.push({ tag: 0x0110, type: 2, count: val.length, value: val });
  }

  // ExifIFD: DateTimeOriginal (0x9003)
  if (opts.dateTime) {
    const val = asciiValue(opts.dateTime);
    exifEntries.push({ tag: 0x9003, type: 2, count: val.length, value: val });
  }

  // GPS entries
  if (opts.gpsLat !== undefined && opts.gpsLng !== undefined) {
    // GPSVersionID (0x0000) — BYTE x4: 2.3.0.0
    const versionBuf = Buffer.from([2, 3, 0, 0]);
    gpsEntries.push({ tag: 0x0000, type: 1, count: 4, value: versionBuf });

    // GPSLatitudeRef (0x0001) — ASCII
    const latRef = opts.gpsLat >= 0 ? 'N' : 'S';
    gpsEntries.push({ tag: 0x0001, type: 2, count: 2, value: asciiValue(latRef) });

    // GPSLatitude (0x0002) — RATIONAL x3
    const latDMS = degreesToDMS(opts.gpsLat);
    gpsEntries.push({ tag: 0x0002, type: 5, count: 3, value: multiRationalValue(latDMS) });

    // GPSLongitudeRef (0x0003) — ASCII
    const lngRef = opts.gpsLng >= 0 ? 'E' : 'W';
    gpsEntries.push({ tag: 0x0003, type: 2, count: 2, value: asciiValue(lngRef) });

    // GPSLongitude (0x0004) — RATIONAL x3
    const lngDMS = degreesToDMS(opts.gpsLng);
    gpsEntries.push({ tag: 0x0004, type: 5, count: 3, value: multiRationalValue(lngDMS) });
  }

  // Now we need to layout the TIFF structure.
  // Layout: TIFF header (8 bytes) | IFD0 | ExifIFD | GPSIFD | data blobs
  //
  // We'll collect all IFDs and their data, then assemble.

  // Placeholder for ExifIFD pointer (tag 0x8769) and GPSIFD pointer (tag 0x8825) in IFD0
  // We'll add them as entries and fix up later.
  const hasExif = exifEntries.length > 0;
  const hasGPS = gpsEntries.length > 0;

  // Sort IFD0 entries by tag (EXIF requires sorted tags)
  if (hasExif) {
    entries.push({ tag: 0x8769, type: 4, count: 1, value: Buffer.alloc(4) }); // placeholder
  }
  if (hasGPS) {
    entries.push({ tag: 0x8825, type: 4, count: 1, value: Buffer.alloc(4) }); // placeholder
  }
  entries.sort((a, b) => a.tag - b.tag);
  exifEntries.sort((a, b) => a.tag - b.tag);
  gpsEntries.sort((a, b) => a.tag - b.tag);

  // Type sizes
  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };

  function ifdSize(e: typeof entries): number {
    return 2 + e.length * 12 + 4; // count(2) + entries(n*12) + next-ifd-offset(4)
  }

  function dataSize(e: typeof entries): number {
    let size = 0;
    for (const entry of e) {
      const totalBytes = entry.count * (typeSize[entry.type] || 1);
      if (totalBytes > 4) {
        size += totalBytes;
        // Align to 2 bytes
        if (size % 2 !== 0) size++;
      }
    }
    return size;
  }

  // Compute offsets
  const tiffHeaderSize = 8;
  const ifd0Offset = tiffHeaderSize;
  const ifd0IfdSize = ifdSize(entries);

  let nextOffset = ifd0Offset + ifd0IfdSize;

  // IFD0 data block
  const ifd0DataOffset = nextOffset;
  const ifd0DataSize = dataSize(entries);
  nextOffset += ifd0DataSize;

  // ExifIFD
  let exifIfdOffset = 0;
  let exifDataOffset = 0;
  if (hasExif) {
    exifIfdOffset = nextOffset;
    nextOffset += ifdSize(exifEntries);
    exifDataOffset = nextOffset;
    nextOffset += dataSize(exifEntries);
  }

  // GPSIFD
  let gpsIfdOffset = 0;
  let gpsDataOffset = 0;
  if (hasGPS) {
    gpsIfdOffset = nextOffset;
    nextOffset += ifdSize(gpsEntries);
    gpsDataOffset = nextOffset;
    nextOffset += dataSize(gpsEntries);
  }

  const totalSize = nextOffset;
  const buf = Buffer.alloc(totalSize);

  // TIFF header (little-endian)
  buf.write('II', 0, 'ascii');         // byte order
  buf.writeUInt16LE(42, 2);            // magic
  buf.writeUInt32LE(ifd0Offset, 4);    // offset to IFD0

  // Write an IFD
  function writeIFD(
    ifdEntries: typeof entries,
    ifdStart: number,
    dataStart: number,
  ): void {
    let pos = ifdStart;
    buf.writeUInt16LE(ifdEntries.length, pos);
    pos += 2;

    let dataPos = dataStart;
    for (const entry of ifdEntries) {
      buf.writeUInt16LE(entry.tag, pos);
      buf.writeUInt16LE(entry.type, pos + 2);
      buf.writeUInt32LE(entry.count, pos + 4);

      const totalBytes = entry.count * (typeSize[entry.type] || 1);
      if (totalBytes <= 4) {
        entry.value.copy(buf, pos + 8, 0, Math.min(totalBytes, entry.value.length));
      } else {
        buf.writeUInt32LE(dataPos, pos + 8);
        entry.value.copy(buf, dataPos, 0, totalBytes);
        dataPos += totalBytes;
        if (dataPos % 2 !== 0) dataPos++;
      }
      pos += 12;
    }
    // Next IFD offset = 0 (no more IFDs)
    buf.writeUInt32LE(0, pos);
  }

  // Fix up ExifIFD and GPSIFD pointers in IFD0 entries
  for (const entry of entries) {
    if (entry.tag === 0x8769 && hasExif) {
      entry.value.writeUInt32LE(exifIfdOffset, 0);
    }
    if (entry.tag === 0x8825 && hasGPS) {
      entry.value.writeUInt32LE(gpsIfdOffset, 0);
    }
  }

  writeIFD(entries, ifd0Offset, ifd0DataOffset);
  if (hasExif) writeIFD(exifEntries, exifIfdOffset, exifDataOffset);
  if (hasGPS) writeIFD(gpsEntries, gpsIfdOffset, gpsDataOffset);

  // Wrap in APP1: FF E1 [length] "Exif\0\0" [tiff data]
  const exifHeader = Buffer.from('457869660000', 'hex'); // "Exif\0\0"
  const app1Payload = Buffer.concat([exifHeader, buf]);
  const app1Length = app1Payload.length + 2; // +2 for length field itself
  const app1Marker = Buffer.alloc(4);
  app1Marker.writeUInt8(0xFF, 0);
  app1Marker.writeUInt8(0xE1, 1);
  app1Marker.writeUInt16BE(app1Length, 2);

  return Buffer.concat([app1Marker, app1Payload]);
}

// ---------------------------------------------------------------------------
// XMP helper — build a minimal XMP packet with dc:subject keywords
// ---------------------------------------------------------------------------

function buildXmpBuffer(keywords: string[]): Buffer {
  const items = keywords.map(k => `<rdf:li>${k}</rdf:li>`).join('');
  const xmp = [
    '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/">',
    `<dc:subject><rdf:Bag>${items}</rdf:Bag></dc:subject>`,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
  return Buffer.from(xmp, 'utf8');
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

interface ImageSpec {
  filePath: string;          // relative to PHOTOS_DIR
  color: { r: number; g: number; b: number };
  exif?: ExifOptions;
  xmpKeywords?: string[];
}

async function generateImage(spec: ImageSpec): Promise<void> {
  const fullPath = path.join(PHOTOS_DIR, spec.filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  let pipeline = sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 3,
      background: spec.color,
    },
  }).jpeg({ quality: 80 });

  // Sharp doesn't let us inject raw EXIF/XMP into the create pipeline easily.
  // Instead, generate the JPEG first, then re-inject the metadata by
  // manipulating the raw JPEG bytes (insert APP1/APP1-XMP segments).

  let jpegBuf = await pipeline.toBuffer();

  const segments: Buffer[] = [];

  // JPEG always starts with SOI (FF D8)
  segments.push(jpegBuf.subarray(0, 2)); // SOI

  // Insert EXIF APP1 segment
  if (spec.exif) {
    segments.push(buildExifBuffer(spec.exif));
  }

  // Insert XMP APP1 segment
  if (spec.xmpKeywords && spec.xmpKeywords.length > 0) {
    const xmpData = buildXmpBuffer(spec.xmpKeywords);
    const xmpNS = Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'ascii');
    const payload = Buffer.concat([xmpNS, xmpData]);
    const marker = Buffer.alloc(4);
    marker.writeUInt8(0xFF, 0);
    marker.writeUInt8(0xE1, 1);
    marker.writeUInt16BE(payload.length + 2, 2);
    segments.push(Buffer.concat([marker, payload]));
  }

  // Rest of the JPEG (after SOI)
  segments.push(jpegBuf.subarray(2));

  const finalBuf = Buffer.concat(segments);
  fs.writeFileSync(fullPath, finalBuf);
}

// ---------------------------------------------------------------------------
// Text file helper
// ---------------------------------------------------------------------------

function writeText(relPath: string, content: string): void {
  const fullPath = path.join(PHOTOS_DIR, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
}

// ---------------------------------------------------------------------------
// Minimal valid MP4 — uses ffmpeg to generate a tiny H.264 video so that
// ffprobe/ffmpeg can parse it (requires a proper moov atom).
// ---------------------------------------------------------------------------

async function generateMinimalMp4(outputPath: string): Promise<void> {
  const { execFileSync } = await import('child_process');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  execFileSync('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'color=c=black:s=64x64:d=0.1',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ], { stdio: 'ignore' });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Generating test fixtures in', PHOTOS_DIR);

  // Clean up metadata cache so tests start fresh
  const cacheFile = path.join(PHOTOS_DIR, '.metadata-cache.json');
  if (fs.existsSync(cacheFile)) {
    fs.unlinkSync(cacheFile);
    console.log('  Deleted .metadata-cache.json');
  }

  // Define all image specs
  const images: ImageSpec[] = [
    // --- Portfolio ---
    {
      filePath: 'portfolio/DSCF7313.jpg',
      color: { r: 70, g: 130, b: 180 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:01:15 10:30:00',
        gpsLat: 47.6062,
        gpsLng: -122.3321,
      },
    },
    {
      filePath: 'portfolio/DSCF7315.jpg',
      color: { r: 34, g: 139, b: 34 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:02:20 14:15:00',
      },
    },

    // --- test-cover ---
    {
      filePath: 'albums/test-cover/DSCF7315.jpg',
      color: { r: 255, g: 165, b: 0 },
    },

    // --- test-sort ---
    {
      filePath: 'albums/test-sort/img-a.jpg',
      color: { r: 255, g: 69, b: 0 },
    },

    // --- test-tripdays ---
    {
      filePath: 'albums/test-tripdays/img-a.jpg',
      color: { r: 148, g: 103, b: 189 },
    },

    // --- test-readme ---
    {
      filePath: 'albums/test-readme/img-a.jpg',
      color: { r: 188, g: 143, b: 143 },
    },

    // --- test-password ---
    {
      filePath: 'albums/test-password/img-a.jpg',
      color: { r: 128, g: 0, b: 0 },
    },

    // --- test-captions ---
    {
      filePath: 'albums/test-captions/img-a.jpg',
      color: { r: 0, g: 128, b: 128 },
    },
    {
      filePath: 'albums/test-captions/img-b.jpg',
      color: { r: 0, g: 100, b: 100 },
    },

    // --- test-gps ---
    {
      filePath: 'albums/test-gps/gps-photo.jpg',
      color: { r: 65, g: 105, b: 225 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:03:01 09:00:00',
        gpsLat: 48.8566,
        gpsLng: 2.3522,
      },
    },

    // --- test-ignorestats ---
    {
      filePath: 'albums/test-ignorestats/img-a.jpg',
      color: { r: 169, g: 169, b: 169 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:03:05 11:00:00',
        gpsLat: 35.6762,
        gpsLng: 139.6503,
      },
    },

    // --- test-manage ---
    {
      filePath: 'albums/test-manage/DSCF7313.jpg',
      color: { r: 220, g: 20, b: 60 },
    },

    // --- test-keywords ---
    {
      filePath: 'albums/test-keywords/GFXR7398.jpg',
      color: { r: 255, g: 215, b: 0 },
      exif: {
        make: 'FUJIFILM',
        model: 'GFX100S',
        dateTime: '2024:04:10 15:00:00',
      },
      xmpKeywords: ['Cat'],
    },

    // --- test-group ---
    {
      filePath: 'albums/test-group/sub-album-a/img-a.jpg',
      color: { r: 50, g: 205, b: 50 },
    },
    {
      filePath: 'albums/test-group/sub-album-b/img-a.jpg',
      color: { r: 60, g: 179, b: 113 },
    },

    // --- samples/photostream ---
    {
      filePath: 'albums/samples/photostream/DSCF9948.jpg',
      color: { r: 135, g: 206, b: 235 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:06:15 10:00:00',
      },
      xmpKeywords: ['Kirkland'],
    },
    {
      filePath: 'albums/samples/photostream/img-b.jpg',
      color: { r: 100, g: 149, b: 237 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:06:16 14:00:00',
      },
    },
    {
      filePath: 'albums/samples/photostream/img-c.jpg',
      color: { r: 70, g: 130, b: 180 },
      exif: {
        make: 'FUJIFILM',
        model: 'X-T4',
        dateTime: '2024:06:17 08:00:00',
      },
    },
  ];

  // Generate images
  for (const img of images) {
    await generateImage(img);
    console.log(`  Created ${img.filePath}`);
  }

  // --- Text / config files ---
  writeText('portfolio/DSCF7315.md', 'A beautiful landscape shot');
  console.log('  Created portfolio/DSCF7315.md');

  writeText('albums/test-cover/cover.txt', 'DSCF7315.jpg');
  console.log('  Created albums/test-cover/cover.txt');

  writeText('albums/test-sort/sort.txt', 'filename-desc');
  console.log('  Created albums/test-sort/sort.txt');

  writeText('albums/test-tripdays/trip_days.txt', '');
  console.log('  Created albums/test-tripdays/trip_days.txt');

  writeText('albums/test-readme/README.md', '**test**');
  console.log('  Created albums/test-readme/README.md');

  writeText('albums/test-password/password.txt', 'testpass123');
  console.log('  Created albums/test-password/password.txt');

  writeText('albums/test-captions/img-a.md', 'A captioned image');
  console.log('  Created albums/test-captions/img-a.md');

  writeText('albums/test-ignorestats/ignorestats.txt', '');
  console.log('  Created albums/test-ignorestats/ignorestats.txt');

  writeText('albums/samples/photostream/sort.txt', 'date-asc');
  console.log('  Created albums/samples/photostream/sort.txt');

  // --- Minimal MP4 (via ffmpeg for valid moov atom) ---
  const mp4Path = path.join(PHOTOS_DIR, 'albums/test-video/file_example_MP4_1920_18MG.mp4');
  await generateMinimalMp4(mp4Path);
  console.log('  Created albums/test-video/file_example_MP4_1920_18MG.mp4');

  // --- Empty directory ---
  const emptyDir = path.join(PHOTOS_DIR, 'albums/test-empty');
  fs.mkdirSync(emptyDir, { recursive: true });
  // Add .gitkeep so git tracks the empty dir
  fs.writeFileSync(path.join(emptyDir, '.gitkeep'), '');
  console.log('  Created albums/test-empty/ (with .gitkeep)');

  console.log('\nDone! All test fixtures generated.');
}

main().catch((err) => {
  console.error('Failed to generate test fixtures:', err);
  process.exit(1);
});
