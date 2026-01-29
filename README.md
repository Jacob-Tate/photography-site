# Photography Portfolio

A self-hosted photography portfolio and gallery application with album management, interactive map view, keyword search, and a Lightroom upload plugin.

## Features

- Portfolio gallery with masonry layout and full-screen lightbox viewer
- Albums organized into groups and collections
- Password-protected albums
- EXIF/IPTC metadata display (camera, lens, exposure, GPS, keywords)
- Interactive map showing geotagged photos
- Keyword search across all images
- Download individual images or full albums as ZIP
- Automatic thumbnail generation
- Lightroom plugin for uploading directly from Adobe Lightroom (LAN only)
- Progressive Web App (installable on mobile)
- Markdown descriptions for albums

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Router, Leaflet
- **Backend**: Node.js, Express, Sharp, TypeScript
- **Deployment**: Docker, Nginx

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Setup

1. Clone the repository

2. Create a `.env` file in the project root:

```
SESSION_SECRET=your-secret-here
API_KEY=your-api-key-here
```

Generate secure values with `openssl rand -hex 32`.

3. Add photos to the `photos/` directory (see structure below)

4. Start the application:

```bash
docker compose up -d
```

The app will be available at `http://localhost`.

### Development

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Run both server and client
cd server && npm run dev     # runs on :3000
cd client && npm run dev     # runs on :5173 with proxy to :3000
```

## Photos Directory Structure

```
photos/
  portfolio/          # Images shown on the main portfolio page
  albums/
    album-name/       # A standalone album
      image.jpg
      README.md       # Optional album description (markdown)
      password.txt    # Optional, protects the album with a password
    group-name/       # A group containing multiple albums
      sub-album/
        image.jpg
  .thumbnails/        # Auto-generated, do not edit
```

- Place featured images in `portfolio/`
- Create folders under `albums/` for albums
- Nest a folder inside another to create album groups
- Add a `password.txt` file containing a password to protect an album
- Add a `README.md` to any album for a description displayed on the album page
- Thumbnails are generated automatically on first access

## API Routes

| Route | Description |
|---|---|
| `/api/portfolio` | Portfolio images |
| `/api/albums` | Album listings and details |
| `/api/images` | Image serving (thumbnails, full, download) |
| `/api/download` | Album ZIP downloads |
| `/api/search` | Keyword search |
| `/api/map` | Geotagged image data |
| `/api/auth` | Album password authentication |
| `/api/upload` | Image upload (LAN only) |
| `/api/manage` | Management endpoints |

## Lightroom Plugin

A Lightroom Classic plugin is included in `lightroom-plugin/` for uploading images directly from Lightroom to the server over the local network. See the plugin directory for installation instructions.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `PHOTOS_DIR` | `./photos` | Path to photos directory |
| `SESSION_SECRET` | - | Session encryption key (required in production) |
| `API_KEY` | - | API key for upload authentication |

## Nginx

The included Nginx configuration:

- Reverse proxies to the Node.js app
- Restricts `/api/upload` to LAN access only (10.x, 172.16.x, 192.168.x)
- Caches static assets for 7 days
- Allows up to 100MB uploads

## Readme example with emedded image
```
# Test
This is a test
- test
- test
- test

![test123](DSCF7318.jpg "test")
```