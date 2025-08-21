import { type NextRequest, NextResponse } from "next/server"
import { UnsplashService } from "@/lib/unsplash"
import { VideoProcessor } from "@/lib/video-processor"
import { generateBeatSheet } from "@/lib/pipeline-utils"
import type { VideoConfig, VideoBeat } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    let config: VideoConfig
    try {
      config = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      return NextResponse.json({ error: "Unsplash API key not configured" }, { status: 500 })
    }

    // Search for images
    const unsplash = new UnsplashService(accessKey)
    const images = await unsplash.searchImages(config.topic, config.imageCount)

    if (images.length === 0) {
      return NextResponse.json({ error: "No images found for the given topic" }, { status: 404 })
    }

    // Generate beat sheet with images
    const beats = generateBeatSheet(config)
    const beatsWithImages: VideoBeat[] = beats.map((beat, index) => ({
      ...beat,
      image: images[index] || images[images.length - 1], // Fallback to last image if not enough
    }))

    // Generate video processing commands
    const processor = new VideoProcessor(config)
    const processingCommands = beatsWithImages.map((beat, index) => {
      const effect = processor.generateKenBurnsEffect()
      const inputPath = `cache/images/image_${index + 1}.jpg`
      const outputPath = `cache/clips/${String(index + 1).padStart(2, "0")}.mp4`

      return {
        beatIndex: index + 1,
        downloadUrl: beat.image!.urls.raw + "&w=2200&fit=max&q=85",
        inputPath,
        outputPath,
        command: processor.generateFFmpegClipCommand(inputPath, outputPath, effect, beat.dur),
        effect,
      }
    })

    // Generate credits
    const credits = unsplash.getImageCredits(images)

    return NextResponse.json({
      beats: beatsWithImages,
      processingCommands,
      credits,
      totalDuration: beatsWithImages[beatsWithImages.length - 1]?.end || 0,
    })
  } catch (error) {
    console.error("Image pipeline error:", error)
    return NextResponse.json(
      { error: "Failed to process images", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
