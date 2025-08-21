import { type NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import { existsSync } from "fs"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { videoPath, audioPath } = await request.json()

    if (!videoPath || !audioPath) {
      return NextResponse.json({ error: "Video and audio paths required" }, { status: 400 })
    }

    if (!existsSync(videoPath)) {
      return NextResponse.json({ error: `Video file not found: ${videoPath}` }, { status: 400 })
    }

    if (!existsSync(audioPath)) {
      return NextResponse.json({ error: `Audio file not found: ${audioPath}` }, { status: 400 })
    }

    const outputPath = "build/master.mp4"

    const command = [
      "ffmpeg",
      "-i",
      `"${videoPath}"`,
      "-i",
      `"${audioPath}"`,
      "-c:v",
      "libx264",
      "-crf",
      "16",
      "-preset",
      "slow",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-y",
      `"${outputPath}"`,
    ].join(" ")

    console.log(`[v0] Final mux command: ${command}`)
    await execAsync(command)

    if (!existsSync(outputPath)) {
      throw new Error(`Final video not created: ${outputPath}`)
    }

    const stats = require("fs").statSync(outputPath)
    const fileSizeInBytes = stats.size
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2)

    return NextResponse.json({
      success: true,
      outputPath,
      fileSize: `${fileSizeInMB} MB`,
      message: "Final video assembly complete! Ready for download.",
    })
  } catch (error) {
    console.error("[v0] Final assembly error:", error)
    return NextResponse.json(
      {
        error: "Failed to create final video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
