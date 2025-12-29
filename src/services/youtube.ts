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

function addTokenArgs(args: string[], hasToken: { value: boolean }): void {
  const poToken = process.env.YT_DLP_PO_TOKEN
  if (poToken) {
    // Add PO token via extractor args (yt-dlp format: youtube:po_token=web+TOKEN)
    args.push("--extractor-args", `youtube:po_token=web+${poToken}`)
    hasToken.value = true
  }
}

function buildYtDlpArgs(request: DownloadRequest, outputPath: string): string[] {
  const args: string[] = [
    "--js-runtimes", "deno",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "--referer", "https://www.youtube.com/",
    "--add-header", "Accept-Language:en-US,en;q=0.9",
    "--add-header", "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  ]

  // Add PO token support for bypassing bot detection
  const hasToken = { value: false }
  addTokenArgs(args, hasToken)

  // Use multiple player clients as fallback
  // Only use web client when token is present (ios/android don't support tokens)
  if (hasToken.value) {
    args.push("--extractor-args", "youtube:player_client=web")
  } else {
    args.push("--extractor-args", "youtube:player_client=web,ios,android")
  }

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
    const args = [
      "-j",
      "--no-playlist",
      "--js-runtimes", "deno",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--referer", "https://www.youtube.com/",
      "--add-header", "Accept-Language:en-US,en;q=0.9",
      "--add-header", "Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ]

    // Add PO token support for bypassing bot detection
    const hasToken = { value: false }
    addTokenArgs(args, hasToken)

    // Use multiple player clients as fallback
    // Only use web client when token is present (ios/android don't support tokens)
    if (hasToken.value) {
      args.push("--extractor-args", "youtube:player_client=web")
    } else {
      args.push("--extractor-args", "youtube:player_client=web,ios,android")
    }
    args.push(url)
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
        const filteredStderr = stderr.trim()
        
        // Check for specific YouTube blocking errors
        if (filteredStderr.includes("Only images are available") || filteredStderr.includes("Requested format is not available")) {
          const errorMsg = "YouTube is blocking access to this video. This may be due to:\n" +
            "- Invalid or expired PO token (check YT_DLP_PO_TOKEN environment variable)\n" +
            "- Bot detection (YouTube may require a valid token)\n" +
            "- Age-restricted or region-locked content\n" +
            "- Video may be unavailable\n\n" +
            "Original error: " + filteredStderr
          reject(new Error(`Failed to get video info: ${errorMsg}`))
          return
        }
        
        // If there's still an error after filtering, reject
        if (filteredStderr && !stdout.trim()) {
          reject(new Error(`Failed to get video info: ${filteredStderr || stderr}`))
          return
        }
        
        // If we have stdout despite the error, try to parse it
        if (stdout.trim()) {
          // Continue to parse even if there were warnings
        } else {
          reject(new Error(`Failed to get video info: ${filteredStderr || stderr}`))
          return
        }
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
        const filteredStderr = stderr.trim()
        
        // Check for specific YouTube blocking errors
        if (filteredStderr.includes("Only images are available") || filteredStderr.includes("Requested format is not available")) {
          const errorMsg = "YouTube is blocking access to this video. This may be due to:\n" +
            "- Invalid or expired PO token (check YT_DLP_PO_TOKEN environment variable)\n" +
            "- Bot detection (YouTube may require a valid token)\n" +
            "- Age-restricted or region-locked content\n" +
            "- Video may be unavailable\n\n" +
            "Original error: " + filteredStderr
          reject(new Error(`Download failed: ${errorMsg}`))
          return
        }
        
        reject(new Error(`Download failed: ${filteredStderr || stderr}`))
        return
      }

      resolve({ filename, filepath: outputPath })
    })

    process.on("error", (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}. Make sure yt-dlp is installed.`))
    })
  })
}


