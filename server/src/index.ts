import app from './app';
import { config } from './config';
import { preGenerateThumbnails } from './services/thumbnailQueue';
import { preWarmMetadataCache } from './services/scanner';
import { initAnalytics } from './services/analytics';

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Photos directory: ${config.photosDir}`);
  initAnalytics();
  preGenerateThumbnails();
  preWarmMetadataCache();

  // Re-scan for new images every 5 minutes
  setInterval(() => {
    preGenerateThumbnails();
    preWarmMetadataCache();
  }, 5 * 60 * 1000);
});
