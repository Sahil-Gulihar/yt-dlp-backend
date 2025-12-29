#!/bin/bash

BASE_URL="http://iksw4skooo8gww0co4s8k44s.72.61.238.204.sslip.io"
TEST_VIDEO="https://www.youtube.com/watch?v=jNQXAC9IVRw"

echo "🧪 Testing YouTube Downloader API"
echo "=================================="
echo ""

echo "1️⃣  Testing Health Endpoint..."
HEALTH=$(curl -s "${BASE_URL}/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Health check passed"
  echo "$HEALTH" | jq .
else
  echo "❌ Health check failed"
  echo "$HEALTH"
fi
echo ""

echo "2️⃣  Testing API Info Endpoint..."
INFO=$(curl -s "${BASE_URL}/")
if echo "$INFO" | grep -q "YouTube Downloader API"; then
  echo "✅ API info endpoint working"
  echo "$INFO" | jq .
else
  echo "❌ API info endpoint failed"
  echo "$INFO"
fi
echo ""

echo "3️⃣  Testing Video Info Endpoint..."
VIDEO_INFO=$(curl -s -X POST "${BASE_URL}/api/download/info" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${TEST_VIDEO}\"}")
if echo "$VIDEO_INFO" | grep -q "success.*true"; then
  echo "✅ Video info endpoint working"
  echo "$VIDEO_INFO" | jq .
else
  echo "⚠️  Video info endpoint returned:"
  echo "$VIDEO_INFO" | jq .
fi
echo ""

echo "4️⃣  Testing Download Endpoint (MP3)..."
DOWNLOAD=$(curl -s -X POST "${BASE_URL}/api/download" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${TEST_VIDEO}\",\"format\":\"mp3\",\"quality\":\"best\"}")
if echo "$DOWNLOAD" | grep -q "success.*true"; then
  echo "✅ Download endpoint working"
  echo "$DOWNLOAD" | jq .
else
  echo "⚠️  Download endpoint returned:"
  echo "$DOWNLOAD" | jq .
fi
echo ""

echo "=================================="
echo "✅ Testing complete!"
