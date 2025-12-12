import { spawn } from "child_process"
import { existsSync, mkdirSync } from "fs"
import path from "path"
import type { DownloadRequest, VideoInfo } from "../types/index.js"

const DOWNLOADS_DIR = path.join(process.cwd(), "downloads")

function ensureDownloadsDir() {
  if (!existsSync(DOWNLOADS_DIR)) {
    mkdirSync(DOWNLOADS_DIR, { recursive: true })
  }
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 100)
}

function buildYtDlpArgs(request: DownloadRequest, outputPath: string): string[] {
  const args: string[] = []

  if (request.format === "mp3") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0")
  } else {
    const qualityMap: Record<string, string> = {
      best: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "1080": "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best",
      "720": "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best",
      "480": "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best",
      "360": "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best",
    }
    args.push("-f", qualityMap[request.quality] || qualityMap.best)
    args.push("--merge-output-format", "mp4")
  }

  // Add time range if specified
  if (request.startTime || request.endTime) {
    const downloadSections = `*${request.startTime || "0"}-${request.endTime || "inf"}`
    args.push("--download-sections", downloadSections)
    args.push("--force-keyframes-at-cuts")
  }

  args.push("-o", outputPath)
  args.push("--no-playlist")
  args.push("--restrict-filenames")
  args.push(request.url)

  return args
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const args = ["-j", "--no-playlist", url]
    const process = spawn("yt-dlp", args)

    let stdout = ""
    let stderr = ""

    process.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    process.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to get video info: ${stderr}`))
        return
      }

      try {
        const info = JSON.parse(stdout)
        resolve({
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          formats: info.formats?.map((f: { format_note?: string }) => f.format_note).filter(Boolean) || [],
        })
      } catch {
        reject(new Error("Failed to parse video info"))
      }
    })
  })
}

export async function downloadVideo(request: DownloadRequest): Promise<{ filename: string; filepath: string }> {
  ensureDownloadsDir()

  // Get video info first to get the title
  const info = await getVideoInfo(request.url)
  const sanitizedTitle = sanitizeFilename(info.title)
  const extension = request.format === "mp3" ? "mp3" : "mp4"
  const filename = `${sanitizedTitle}_${Date.now()}.${extension}`
  const outputPath = path.join(DOWNLOADS_DIR, filename)

  const args = buildYtDlpArgs(request, outputPath)

  return new Promise((resolve, reject) => {
    console.log(`Starting download: yt-dlp ${args.join(" ")}`)

    const process = spawn("yt-dlp", args)

    let stderr = ""

    process.stdout.on("data", (data) => {
      console.log(`yt-dlp: ${data.toString()}`)
    })

    process.stderr.on("data", (data) => {
      stderr += data.toString()
      console.error(`yt-dlp error: ${data.toString()}`)
    })

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed: ${stderr}`))
        return
      }

      resolve({ filename, filepath: outputPath })
    })

    process.on("error", (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}. Make sure yt-dlp is installed.`))
    })
  })
}

