import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { config } from './config';

import portfolioRouter from './routes/portfolio';
import albumsRouter from './routes/albums';
import imagesRouter from './routes/images';
import downloadRouter from './routes/download';
import authRouter from './routes/auth';
import uploadRouter from './routes/upload';
import manageRouter from './routes/manage';
import mapRouter from './routes/map';
import searchRouter from './routes/search';
import tagsRouter from './routes/tags';
import statsRouter from './routes/stats';
import { preGenerateThumbnails } from './services/thumbnailQueue';
import { preWarmMetadataCache } from './services/scanner';

const app = express();

app.use(express.json());

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

// API routes
app.use('/api/portfolio', portfolioRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/download', downloadRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manage', manageRouter);
app.use('/api/map', mapRouter);
app.use('/api/search', searchRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/stats', statsRouter);

// Serve static frontend in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Build Open Graph meta tags for image/album URLs (for Discord, Teams, etc.)
function buildOgTags(req: express.Request): string {
  const host = `${req.protocol}://${req.get('host')}`;
  const imageParam = req.query.image as string | undefined;
  const urlPath = req.path;

  // Image shared from lightbox: /?image=photo.jpg or /albums/foo?image=photo.jpg
  if (imageParam) {
    let imagePath: string;
    if (urlPath === '/' || urlPath === '') {
      imagePath = `portfolio/${imageParam}`;
    } else {
      // Strip leading slash: /albums/foo -> albums/foo
      imagePath = `${urlPath.replace(/^\//, '')}/${imageParam}`;
    }
    const thumbUrl = `${host}/api/images/thumbnail/${imagePath}`;
    const title = imageParam.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    return [
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:image" content="${thumbUrl}" />`,
      `<meta property="og:image:alt" content="${title}" />`,
      `<meta property="og:image:width" content="600" />`,
      `<meta property="og:url" content="${host}${req.originalUrl}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:image" content="${thumbUrl}" />`,
    ].join('\n    ');
  }

  // Album page: /albums/foo (use cover image if available)
  if (urlPath.startsWith('/albums/')) {
    const albumSlug = urlPath.replace(/^\/albums\//, '');
    if (albumSlug) {
      const albumDir = path.join(config.photosDir, 'albums', albumSlug);
      if (fs.existsSync(albumDir) && fs.statSync(albumDir).isDirectory()) {
        const coverFile = path.join(albumDir, 'cover.txt');
        let cover: string | undefined;
        if (fs.existsSync(coverFile)) {
          cover = fs.readFileSync(coverFile, 'utf-8').trim();
        }
        const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];
        const imageFiles = fs.readdirSync(albumDir).filter(f => IMAGE_EXTS.includes(path.extname(f).toLowerCase())).sort();
        if (!cover) {
          cover = imageFiles[0];
        }
        if (cover) {
          const imageCount = imageFiles.length;
          const albumPath = `albums/${albumSlug}`;
          const thumbUrl = `${host}/api/images/thumbnail/${albumPath}/${cover}`;
          const name = albumSlug.split('/').pop()!.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const description = `${imageCount} photo${imageCount !== 1 ? 's' : ''}`;
          return [
            `<meta property="og:title" content="${name}" />`,
            `<meta property="og:type" content="website" />`,
            `<meta property="og:description" content="${description}" />`,
            `<meta property="og:image" content="${thumbUrl}" />`,
            `<meta property="og:image:width" content="600" />`,
            `<meta property="og:url" content="${host}${urlPath}" />`,
            `<meta name="twitter:card" content="summary_large_image" />`,
            `<meta name="twitter:title" content="${name}" />`,
            `<meta name="twitter:description" content="${description}" />`,
            `<meta name="twitter:image" content="${thumbUrl}" />`,
            `<meta name="description" content="${name} — ${description}" />`,
          ].join('\n    ');
        }
      }
    }
  }

  return '';
}

app.get('*', (req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  const ogTags = buildOgTags(req);

  if (!ogTags) {
    return res.sendFile(indexPath);
  }

  // Inject OG tags into the HTML <head>
  let html = fs.readFileSync(indexPath, 'utf-8');
  html = html.replace('</head>', `    ${ogTags}\n  </head>`);
  res.type('html').send(html);
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Photos directory: ${config.photosDir}`);
  preGenerateThumbnails();
  preWarmMetadataCache();

  // Re-scan for new images every 5 minutes
  setInterval(() => {
    preGenerateThumbnails();
    preWarmMetadataCache();
  }, 5 * 60 * 1000);
});
