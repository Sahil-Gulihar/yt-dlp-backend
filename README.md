# YouTube Downloader Backend

A TypeScript backend server for downloading YouTube videos and audio using yt-dlp. Optimized for deployment on Coolify.

## Features

- Download YouTube videos in multiple qualities (360p - 1080p)
- Extract audio as MP3
- Trim videos with start/end timestamps
- Docker-ready with yt-dlp and ffmpeg pre-installed
- Health checks for container orchestration
- Graceful shutdown handling

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed
- [FFmpeg](https://ffmpeg.org/) installed

```bash
# macOS
brew install yt-dlp ffmpeg

# Linux
sudo apt install yt-dlp ffmpeg
```

### Run Locally

```bash
npm install
npm run dev
```

## Deploy to Coolify

### Option 1: Docker (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. In Coolify, create a new **Application**
3. Select your Git repository
4. Coolify will auto-detect the Dockerfile
5. Configure environment variables (optional):
   - `PORT`: 3000 (default)
   - `CORS_ORIGIN`: Your frontend URL (optional, defaults to `*`)
6. Deploy!

### Option 2: Nixpacks

Coolify can also use Nixpacks. Create a `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "yt-dlp", "ffmpeg"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "node dist/index.js"
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `YT_DLP_PO_TOKEN` | - | PO token for bypassing YouTube bot detection |

### Bypassing YouTube Bot Detection

YouTube may block requests if it detects automated access. To bypass this, you can provide a PO (Proof of Origin) token.

#### How to Get a PO Token

1. Open YouTube in your browser and press `F12` to open Developer Tools
2. Go to the **Network** tab and filter by `v1/player`
3. Play any video and click on the `player` request
4. In the request payload, find `serviceIntegrityDimensions.poToken` and copy its value

See [TOKEN.md](./TOKEN.md) for detailed instructions.

#### Setting the PO Token

Set the `YT_DLP_PO_TOKEN` environment variable with your token:

**Local Development:**
```bash
export YT_DLP_PO_TOKEN=your_token_here
npm run dev
```

**Docker:**
```bash
docker run -p 3000:3000 \
  -e YT_DLP_PO_TOKEN=your_token_here \
  yt-dl-backend
```

**Docker Compose:**
```yaml
environment:
  - YT_DLP_PO_TOKEN=your_token_here
```

The token will be automatically passed to yt-dlp via extractor arguments.

### Health Check

Coolify will automatically use the `/health` endpoint configured in the Dockerfile.

## API Endpoints

### `GET /`
Returns API information and available endpoints.

### `GET /health`
Health check endpoint. Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### `POST /api/download`
Download a YouTube video or audio.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "quality": "720",
  "format": "mp4",
  "startTime": "00:00:30",
  "endTime": "00:02:00"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | - | YouTube video URL |
| `quality` | string | No | `"best"` | Video quality: `best`, `1080`, `720`, `480`, `360` |
| `format` | string | No | `"mp4"` | Output format: `mp4`, `mp3` |
| `startTime` | string | No | - | Start time (e.g., `"30"` or `"00:00:30"`) |
| `endTime` | string | No | - | End time (e.g., `"120"` or `"00:02:00"`) |

**Response:** Downloads the file directly.

### `POST /api/download/info`
Get video information without downloading.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "duration": 180,
    "thumbnail": "https://...",
    "formats": ["1080p", "720p", "480p"]
  }
}
```

## Examples

### Download full video in 720p
```bash
curl -X POST https://your-coolify-app.com/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "quality": "720"}' \
  --output video.mp4
```

### Download audio only (MP3)
```bash
curl -X POST https://your-coolify-app.com/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "format": "mp3"}' \
  --output audio.mp3
```

### Download a specific portion (30s to 2min)
```bash
curl -X POST https://your-coolify-app.com/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "startTime": "30", "endTime": "120"}' \
  --output clip.mp4
```

## Docker Commands

```bash
# Build image
docker build -t yt-dl-backend .

# Run container
docker run -p 3000:3000 yt-dl-backend

# Run with docker-compose
docker-compose up -d
```

## Project Structure

```
yt-dl-backend/
├── src/
│   ├── index.ts          # Express server with graceful shutdown
│   ├── routes/
│   │   └── download.ts   # Download API routes
│   ├── services/
│   │   └── youtube.ts    # yt-dlp integration
│   └── types/
│       └── index.ts      # TypeScript types & Zod schemas
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Docker Compose config
├── package.json
└── tsconfig.json
```

## License

MIT
