# Photography Portfolio

Self-hosted photography portfolio and gallery. Full-stack monorepo with React frontend and Express backend. File-based storage (no database).

## Tech Stack

- **Client**: React 19, TypeScript, Vite, Tailwind CSS 3, React Router 7, Leaflet (maps), PWA
- **Server**: Node.js, Express, Sharp (image processing), FFmpeg (video thumbnails), TypeScript
- **Deploy**: Docker multi-stage build, Nginx reverse proxy

## Project Structure

```
photography/
├── client/              # React SPA (Vite)
│   └── src/
│       ├── api/         # API client functions
│       ├── components/  # React components
│       ├── hooks/       # Custom React hooks
│       ├── pages/       # Route pages
│       └── utils/       # Utilities
├── server/              # Express API
│   └── src/
│       ├── routes/      # API endpoints
│       ├── services/    # Business logic
│       ├── middleware/   # Express middleware
│       └── types/       # TypeScript types
├── lightroom-plugin/    # Lightroom Classic upload plugin (Lua)
├── nginx/               # Nginx config
├── photos/              # Photo storage (not in git)
│   ├── portfolio/       # Main portfolio images
│   ├── albums/          # Albums & groups (nested folders)
│   ├── .thumbnails/     # Auto-generated thumbnails
│   ├── .metadata-cache.json
│   └── .analytics.json
└── docker-compose.yml
```

## Commands

```bash
# Development (from root)
npm run dev              # Starts both client (:5173) and server (:3000) via concurrently

# Client only
cd client && npm run dev
cd client && npm run build

# Server only
cd server && npm run dev   # tsx watch mode
cd server && npm run build # Compiles to dist/

# Production
docker compose up -d
```

## Key Architecture Decisions

### File-Based Storage
No database. All data lives on the filesystem:
- Photos organized in `photos/portfolio/` and `photos/albums/`
- Per-album config files: `password.txt`, `cover.txt`, `trip_days.txt`, `sort.txt`, `README.md`
- Per-image captions: `<image-name>.md` next to the image file
- Metadata cached in `.metadata-cache.json` (EXIF/IPTC extraction via Sharp + exif-reader)
- Analytics stored in `.analytics.json` and `.shares.json`
- Sessions are in-memory (express-session)

### API Proxy in Dev
Vite proxies `/api/*` to `http://localhost:3000` during development.

### Security
- Upload endpoint restricted to LAN via Nginx (`10.x`, `172.16.x`, `192.168.x`)
- Management endpoints (`/api/manage/*`) require `API_KEY` header
- Album passwords use express-session
- Path traversal validation on all file-serving routes

### PWA & Caching
- Service worker with Workbox (vite-plugin-pwa)
- API responses: NetworkFirst (24h cache)
- Images: CacheFirst (30 days, 200 max entries)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | Yes (prod) | Session encryption key |
| `API_KEY` | Yes (prod) | API key for uploads and management |
| `PORT` | No (default: 3000) | Server port |
| `PHOTOS_DIR` | No (default: ./photos) | Path to photos directory |

## Conventions

- **TypeScript strict mode** on both client and server
- **Tailwind CSS** for all styling — no CSS modules or styled-components
- **File naming**: PascalCase for React components (`PhotoCard.tsx`), camelCase for everything else
- **Routing**: React Router v7 with route pages in `client/src/pages/`
- **API pattern**: Express routes in `server/src/routes/`, business logic in `server/src/services/`
- **No testing framework** currently configured

## Common Patterns

### Adding a New API Route
1. Create route file in `server/src/routes/`
2. Register it in `server/src/index.ts`
3. Add API client function in `client/src/api/`

### Adding a New Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`

### Adding a New Component
1. Create in `client/src/components/` (PascalCase)
2. Use Tailwind for styling
