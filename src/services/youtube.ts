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
    // Add PO token via extractor args
    // Format: youtube:player_client=web;po_token=web+TOKEN
    // Combine player_client and po_token in a single extractor-args
    args.push("--extractor-args", `youtube:player_client=web;po_token=web+${poToken}`)
    hasToken.value = true
    console.log("PO token detected and will be used for authentication")
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

  // Use multiple player clients as fallback only if no token
  // When token is present, it's already combined with player_client=web in addTokenArgs
  if (!hasToken.value) {
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

    // Use multiple player clients as fallback only if no token
    // When token is present, it's already combined with player_client=web in addTokenArgs
    if (!hasToken.value) {
      args.push("--extractor-args", "youtube:player_client=web,ios,android")
    }
    args.push(url)
    
    // Capture token status before spawning process
    const poToken = process.env.YT_DLP_PO_TOKEN
    const ytDlpProcess = spawn("yt-dlp", args)

    let stdout = ""
    let stderr = ""

    ytDlpProcess.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    ytDlpProcess.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    ytDlpProcess.on("close", (code) => {
      if (code !== 0) {
        const filteredStderr = stderr.trim()
        
        // Check for bot detection errors (most common)
        if (filteredStderr.includes("Sign in to confirm you're not a bot") || 
            filteredStderr.includes("Only images are available") || 
            filteredStderr.includes("Requested format is not available")) {
          const tokenStatus = poToken ? "PO token is set" : "No PO token set"
          const errorMsg = "YouTube is blocking access to this video (bot detection).\n" +
            `Current status: ${tokenStatus}\n` +
            "Possible solutions:\n" +
            "- Extract a fresh PO token from your browser (see TOKEN.md)\n" +
            "- PO tokens expire quickly - try extracting a new one\n" +
            "- Ensure the token was extracted from the same session\n" +
            "- Server IP might be flagged - try from a different IP\n" +
            "- Age-restricted or region-locked content\n\n" +
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
    // Log args but mask sensitive token
    const maskedArgs = args.map(arg => {
      if (arg.includes("po_token=")) {
        const parts = arg.split("=")
        if (parts.length > 1) {
          const token = parts[1].split("+")[1] || ""
          const masked = token.length > 8 ? token.substring(0, 4) + "..." + token.substring(token.length - 4) : "***"
          return parts[0] + "=web+" + masked
        }
      }
      return arg
    })
    console.log(`Starting download: yt-dlp ${maskedArgs.join(" ")}`)

    // Capture token status before spawning process
    const poToken = process.env.YT_DLP_PO_TOKEN
    const ytDlpProcess = spawn("yt-dlp", args)

    let stderr = ""

    ytDlpProcess.stdout.on("data", (data) => {
      console.log(`yt-dlp: ${data.toString()}`)
    })

    ytDlpProcess.stderr.on("data", (data) => {
      stderr += data.toString()
      console.error(`yt-dlp error: ${data.toString()}`)
    })

    ytDlpProcess.on("close", (code) => {
      if (code !== 0) {
        const filteredStderr = stderr.trim()
        
        // Check for bot detection errors (most common)
        if (filteredStderr.includes("Sign in to confirm you're not a bot") || 
            filteredStderr.includes("Only images are available") || 
            filteredStderr.includes("Requested format is not available")) {
          const tokenStatus = poToken ? "PO token is set" : "No PO token set"
          const errorMsg = "YouTube is blocking access to this video (bot detection).\n" +
            `Current status: ${tokenStatus}\n` +
            "Possible solutions:\n" +
            "- Extract a fresh PO token from your browser (see TOKEN.md)\n" +
            "- PO tokens expire quickly - try extracting a new one\n" +
            "- Ensure the token was extracted from the same session\n" +
            "- Server IP might be flagged - try from a different IP\n" +
            "- Age-restricted or region-locked content\n\n" +
            "Original error: " + filteredStderr
          reject(new Error(`Download failed: ${errorMsg}`))
          return
        }
        
        reject(new Error(`Download failed: ${filteredStderr || stderr}`))
        return
      }

      resolve({ filename, filepath: outputPath })
    })

    ytDlpProcess.on("error", (error) => {
      reject(new Error(`Failed to start yt-dlp: ${error.message}. Make sure yt-dlp is installed.`))
    })
  })
}


