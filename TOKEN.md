# PO Token Management Guide

This guide explains how to manage PO (Proof of Origin) tokens for the yt-dl-backend server.

## Why Do I Need a PO Token?

YouTube may block automated requests if it detects bot activity. Providing a PO token helps bypass this detection by proving the origin of requests.

## How to Get a PO Token

There are two main methods to obtain a PO token:

### Method 1: Manual Extraction from Browser (Recommended)

1. **Open YouTube in your browser** (Chrome, Firefox, Edge, etc.)
   - Make sure you're logged into your YouTube account (optional but recommended)
   - Visit https://www.youtube.com

2. **Open Developer Tools**
   - Press `F12` (or right-click → Inspect)
   - Go to the **Network** tab

3. **Filter Network Requests**
   - In the filter box, type `v1/player` to filter requests

4. **Play a Video**
   - Start playing any YouTube video
   - A `player` request should appear in the network tab

5. **Extract the PO Token**
   - Click on the most recent `player` request
   - Go to the **Payload** or **Request** tab
   - Look for `serviceIntegrityDimensions.poToken` in the JSON payload
   - Copy the value of this field - this is your PO token

6. **Set the Token**
   ```bash
   export YT_DLP_PO_TOKEN=your_extracted_token_here
   ```

**Note:** PO tokens are session-specific and may expire. You may need to extract a new token periodically.

### Method 2: Automated Plugin (Advanced)

You can use the `yt-dlp-getpot-wpc` plugin to automatically generate PO tokens:

1. **Install the plugin:**
   ```bash
   pip install yt-dlp-getpot-wpc
   ```

2. **Or with pipx:**
   ```bash
   pipx inject yt-dlp yt-dlp-getpot-wpc
   ```

3. The plugin will automatically handle PO token generation when yt-dlp needs it.

**Note:** This requires yt-dlp version `2025.09.26` or later, and the plugin will launch a browser instance.

### Setting the Token

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

**Environment File (.env):**
```bash
YT_DLP_PO_TOKEN=your_token_here
```

## How It Works

The PO token is automatically passed to yt-dlp via extractor arguments in the format `youtube:po_token=web+TOKEN`. This allows yt-dlp to prove the origin of requests and bypass YouTube's bot detection.

**Important:** PO tokens work best when used with cookies from the same browser session. While the token alone can help, combining it with cookies provides the best results.

## When to Refresh Tokens

Refresh your token when you see these errors:
- "YouTube is blocking access to this video"
- "Only images are available for download"
- "Requested format is not available"
- "Invalid or expired PO token"

**Typical token lifespan:**
- Tokens usually have an expiration time set by the provider
- Refresh immediately if you see authentication errors
- Check with your token provider for specific expiration policies

## Security Notes

⚠️ **Important:**
- Tokens contain authentication credentials
- Keep tokens private (don't commit to Git)
- Only share tokens with trusted servers
- Rotate tokens if you suspect they're compromised
- Use environment variables or secure secret management systems

The `.gitignore` file should already exclude `.env` files from version control.

## Troubleshooting

**Token not working:**
- Verify the token is correctly set in the environment variable
- Check that the token hasn't expired
- Ensure the token format is correct (no extra spaces or quotes)
- Verify the token has the necessary permissions for YouTube access

**YouTube still blocking:**
- Try refreshing the token
- Check if the token provider has any rate limits
- Verify the token is valid and not revoked


