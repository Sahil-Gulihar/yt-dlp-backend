import { z } from "zod"

export const OutputFormat = {
  MP4: "mp4",
  MP3: "mp3",
} as const

export const VideoQuality = {
  BEST: "best",
  HIGH: "1080",
  MEDIUM: "720",
  LOW: "480",
  LOWEST: "360",
} as const

export const downloadRequestSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
      return youtubeRegex.test(url)
    },
    { message: "Invalid YouTube URL" }
  ),
  quality: z.enum(["best", "1080", "720", "480", "360"]).default("best"),
  format: z.enum(["mp4", "mp3"]).default("mp4"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export type DownloadRequest = z.infer<typeof downloadRequestSchema>

export interface DownloadResponse {
  success: boolean
  message: string
  filename?: string
  downloadUrl?: string
}

export interface VideoInfo {
  title: string
  duration: number
  thumbnail: string
  formats: string[]
}


