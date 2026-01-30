import express from 'express';
import session from 'express-session';
import path from 'path';
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
import { preGenerateThumbnails } from './services/thumbnailQueue';

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

// Serve static frontend in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Photos directory: ${config.photosDir}`);
  preGenerateThumbnails();
});
