import { type NextRequest, NextResponse } from "next/server"
import { VideoAssembler } from "@/lib/video-assembler"
import { UnsplashService } from "@/lib/unsplash"
import type { VideoConfig, VideoBeat } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    let requestData: { config: VideoConfig; beats: VideoBeat[] }
    try {
      requestData = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { config, beats } = requestData

    if (!beats || beats.length === 0) {
      return NextResponse.json({ error: "No beats provided for assembly" }, { status: 400 })
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      return NextResponse.json({ error: "Unsplash API key not configured" }, { status: 500 })
    }

    // Download images for assembly
    const unsplash = new UnsplashService(accessKey)
    const imageBuffers: ArrayBuffer[] = []

    for (const beat of beats) {
      if (!beat.image) {
        throw new Error(`Beat ${beat.idx} missing image data`)
      }

      const buffer = await unsplash.downloadImage(beat.image, 2200)
      imageBuffers.push(buffer)
    }

    // Create assembler and process
    const assembler = new VideoAssembler(config)
    const job = await assembler.processFullAssembly(beats, imageBuffers)

    // Generate assembly report
    const report = assembler.generateAssemblyReport(job)

    return NextResponse.json({
      job,
      report,
      success: job.status === "completed",
    })
  } catch (error) {
    console.error("Video assembly error:", error)
    return NextResponse.json(
      { error: "Failed to assemble video", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
