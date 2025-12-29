import { Router, type Request, type Response } from "express"
import { downloadRequestSchema } from "../types/index.js"
import { downloadVideo, getVideoInfo } from "../services/youtube.js"

const router = Router()

router.post("/", async (req: Request, res: Response) => {
  const parseResult = downloadRequestSchema.safeParse(req.body)

  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      message: "Invalid request",
      errors: parseResult.error.errors,
    })
    return
  }

  const request = parseResult.data

  try {
    console.log(`Processing download request for: ${request.url}`)

    const { filename, filepath } = await downloadVideo(request)

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error sending file:", err)
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Failed to send file",
          })
        }
      }
    })
  } catch (error) {
    console.error("Download error:", error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Download failed",
    })
  }
})

router.post("/info", async (req: Request, res: Response) => {
  const { url } = req.body

  if (!url) {
    res.status(400).json({
      success: false,
      message: "URL is required",
    })
    return
  }

  try {
    const info = await getVideoInfo(url)
    res.json({
      success: true,
      data: info,
    })
  } catch (error) {
    console.error("Info error:", error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get video info",
    })
  }
})

export default router


