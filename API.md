# YouTube Downloader API Documentation

**Base URL:** `http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io`

**Version:** 1.0.0

## Table of Contents

- [Health Check](#health-check)
- [API Information](#api-information)
- [Get Video Information](#get-video-information)
- [Download Video/Audio](#download-videoaudio)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Health Check

Check if the API is running and healthy.

### Request

```http
GET /health
```

### Response

```json
{
  "status": "ok",
  "timestamp": "2025-12-29T22:13:37.039Z",
  "uptime": 42.876147562,
  "environment": "production"
}
```

### Example

```bash
curl http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/health
```

---

## API Information

Get information about available endpoints.

### Request

```http
GET /
```

### Response

```json
{
  "name": "YouTube Downloader API",
  "version": "1.0.0",
  "endpoints": {
    "POST /api/download": {
      "description": "Download a YouTube video or audio",
      "body": {
        "url": "YouTube URL (required)",
        "quality": "Video quality: best, 1080, 720, 480, 360 (default: best)",
        "format": "Output format: mp4, mp3 (default: mp4)",
        "startTime": "Start time in seconds or HH:MM:SS format (optional)",
        "endTime": "End time in seconds or HH:MM:SS format (optional)"
      }
    },
    "POST /api/download/info": {
      "description": "Get video information",
      "body": {
        "url": "YouTube URL (required)"
      }
    },
    "GET /health": {
      "description": "Health check endpoint"
    }
  }
}
```

### Example

```bash
curl http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/
```

---

## Get Video Information

Get metadata about a YouTube video without downloading it.

### Request

```http
POST /api/download/info
Content-Type: application/json
```

### Request Body

| Field | Type   | Required | Description                    |
|-------|--------|----------|--------------------------------|
| `url` | string | Yes      | YouTube video URL              |

### Response

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "title": "Video Title",
    "duration": 180,
    "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg",
    "formats": ["1080p", "720p", "480p", "360p"]
  }
}
```

**Error (400/500):**

```json
{
  "success": false,
  "message": "Error message here"
}
```

### Examples

**cURL:**

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

**JavaScript (Fetch):**

```javascript
const response = await fetch('http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download/info', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
  })
})

const data = await response.json()
console.log(data)
```

**Python (requests):**

```python
import requests

response = requests.post(
    'http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download/info',
    json={
        'url': 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
    }
)

print(response.json())
```

---

## Download Video/Audio

Download a YouTube video or extract audio as MP3.

### Request

```http
POST /api/download
Content-Type: application/json
```

### Request Body

| Field       | Type   | Required | Default | Description                                                                 |
|-------------|--------|----------|---------|-----------------------------------------------------------------------------|
| `url`       | string | Yes      | -       | YouTube video URL (must be a valid YouTube URL)                             |
| `quality`   | string | No       | `"best"` | Video quality: `"best"`, `"1080"`, `"720"`, `"480"`, `"360"`               |
| `format`    | string | No       | `"mp4"`  | Output format: `"mp4"` (video) or `"mp3"` (audio only)                     |
| `startTime` | string | No       | -       | Start time in seconds (e.g., `"30"`) or HH:MM:SS format (e.g., `"00:00:30"`) |
| `endTime`   | string | No       | -       | End time in seconds (e.g., `"120"`) or HH:MM:SS format (e.g., `"00:02:00"`)  |

### Response

**Success (200 OK):**

Returns the file as a binary download with appropriate headers:
- `Content-Type`: `video/mp4` or `audio/mpeg`
- `Content-Disposition`: `attachment; filename="filename.mp4"`

**Error (400/500):**

```json
{
  "success": false,
  "message": "Error message here",
  "errors": [] // Only present for validation errors
}
```

### Examples

#### Download Full Video (Best Quality)

**cURL:**

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}' \
  --output video.mp4
```

**JavaScript (Fetch):**

```javascript
const response = await fetch('http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
  })
})

const blob = await response.blob()
const url = window.URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = 'video.mp4'
a.click()
```

**Python (requests):**

```python
import requests

response = requests.post(
    'http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download',
    json={
        'url': 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
    }
)

with open('video.mp4', 'wb') as f:
    f.write(response.content)
```

#### Download Video in 720p

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "quality": "720"}' \
  --output video_720p.mp4
```

#### Download Audio Only (MP3)

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "format": "mp3"}' \
  --output audio.mp3
```

#### Download Video Clip (30 seconds to 2 minutes)

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "startTime": "30",
    "endTime": "120"
  }' \
  --output clip.mp4
```

#### Download Video Clip with Time Format (HH:MM:SS)

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "startTime": "00:00:30",
    "endTime": "00:02:00"
  }' \
  --output clip.mp4
```

#### Download 1080p Video Clip

```bash
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "quality": "1080",
    "startTime": "00:01:00",
    "endTime": "00:03:00"
  }' \
  --output clip_1080p.mp4
```

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [] // Optional: validation errors with details
}
```

### HTTP Status Codes

| Status Code | Description                          |
|-------------|--------------------------------------|
| 200         | Success                              |
| 400         | Bad Request (invalid input)          |
| 500         | Internal Server Error                |

### Common Error Messages

- `"URL is required"` - Missing URL in request body
- `"Invalid YouTube URL"` - URL is not a valid YouTube URL
- `"Invalid request"` - Request body validation failed
- `"Failed to get video info"` - Error fetching video metadata
- `"Download failed"` - Error during download process
- `"Failed to send file"` - Error sending file to client

### Example Error Response

```json
{
  "success": false,
  "message": "Invalid request",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["url"],
      "message": "Required"
    }
  ]
}
```

---

## Examples

### Complete Workflow: Get Info Then Download

```bash
# Step 1: Get video information
INFO=$(curl -s -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}')

echo "$INFO" | jq .

# Step 2: Download based on info
curl -X POST http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "format": "mp3"}' \
  --output audio.mp3
```

### JavaScript Example (Browser)

```javascript
async function downloadYouTubeVideo(url, options = {}) {
  const { quality = 'best', format = 'mp4', startTime, endTime } = options
  
  const response = await fetch('http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io/api/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      quality,
      format,
      startTime,
      endTime,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = `video.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
}

// Usage
downloadYouTubeVideo('https://www.youtube.com/watch?v=jNQXAC9IVRw', {
  format: 'mp3',
  quality: 'best'
})
```

### Python Example

```python
import requests
import json

BASE_URL = 'http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io'

def get_video_info(url):
    """Get video information without downloading."""
    response = requests.post(
        f'{BASE_URL}/api/download/info',
        json={'url': url}
    )
    return response.json()

def download_video(url, quality='best', format='mp4', start_time=None, end_time=None, output_file=None):
    """Download YouTube video or audio."""
    payload = {
        'url': url,
        'quality': quality,
        'format': format,
    }
    
    if start_time:
        payload['startTime'] = start_time
    if end_time:
        payload['endTime'] = end_time
    
    response = requests.post(
        f'{BASE_URL}/api/download',
        json=payload
    )
    
    if response.status_code == 200:
        if output_file is None:
            output_file = f'video.{format}'
        
        with open(output_file, 'wb') as f:
            f.write(response.content)
        return output_file
    else:
        error = response.json()
        raise Exception(error.get('message', 'Download failed'))

# Usage examples
if __name__ == '__main__':
    video_url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'
    
    # Get video info
    info = get_video_info(video_url)
    print(json.dumps(info, indent=2))
    
    # Download MP3
    download_video(video_url, format='mp3', output_file='audio.mp3')
    
    # Download 720p video
    download_video(video_url, quality='720', output_file='video_720p.mp4')
    
    # Download clip
    download_video(
        video_url,
        start_time='00:00:30',
        end_time='00:02:00',
        output_file='clip.mp4'
    )
```

---

## Notes

- All YouTube URLs must be valid YouTube links (youtube.com or youtu.be)
- Video downloads may take time depending on video length and quality
- The API uses yt-dlp for extraction, which handles various YouTube formats
- Time ranges use ffmpeg for precise cutting
- Files are temporarily stored on the server and cleaned up after download

---

## Support

For issues or questions, please check the project repository or contact the maintainer.

