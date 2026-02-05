# Stage 1: Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Install sharp dependencies and FFmpeg for video thumbnails
RUN apk add --no-cache vips-dev ffmpeg

# Copy server production dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy built server
COPY --from=server-builder /app/server/dist ./dist

# Copy built client
COPY --from=client-builder /app/client/dist ../client/dist

# Create photos directory
RUN mkdir -p /app/photos/portfolio /app/photos/albums /app/photos/.thumbnails

WORKDIR /app/server

ENV NODE_ENV=production
ENV PHOTOS_DIR=/app/photos
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
