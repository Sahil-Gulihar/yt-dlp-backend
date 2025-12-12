import express from "express"
import cors from "cors"
import path from "path"
import downloadRouter from "./routes/download.js"

const app = express()
const PORT = process.env.PORT || 3000
const isProduction = process.env.NODE_ENV === "production"

// Trust proxy (required for Coolify/reverse proxy)
app.set("trust proxy", 1)

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}))
app.use(express.json({ limit: "10mb" }))

// Serve downloads directory for direct file access
app.use("/files", express.static(path.join(process.cwd(), "downloads")))

// Routes
app.use("/api/download", downloadRouter)

// Health check - detailed for Coolify
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  })
})

// Root endpoint with API info
app.get("/", (_req, res) => {
  res.json({
    name: "YouTube Downloader API",
    version: "1.0.0",
    endpoints: {
      "POST /api/download": {
        description: "Download a YouTube video or audio",
        body: {
          url: "YouTube URL (required)",
          quality: "Video quality: best, 1080, 720, 480, 360 (default: best)",
          format: "Output format: mp4, mp3 (default: mp4)",
          startTime: "Start time in seconds or HH:MM:SS format (optional)",
          endTime: "End time in seconds or HH:MM:SS format (optional)",
        },
      },
      "POST /api/download/info": {
        description: "Get video information",
        body: {
          url: "YouTube URL (required)",
        },
      },
      "GET /health": {
        description: "Health check endpoint",
      },
    },
  })
})

const server = app.listen(PORT, () => {
  console.log(`🚀 YouTube Downloader API running at http://localhost:${PORT}`)
  console.log(`📁 Downloads will be saved to: ${path.join(process.cwd(), "downloads")}`)
  if (isProduction) console.log("🔒 Running in production mode")
})

// Graceful shutdown for container orchestration
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`)
  server.close(() => {
    console.log("HTTP server closed")
    process.exit(0)
  })

  // Force close after 10s
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 10000)
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
