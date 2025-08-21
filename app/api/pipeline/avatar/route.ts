import { type NextRequest, NextResponse } from "next/server"
import { DIDService } from "@/lib/did-service"
import type { VideoConfig, VideoBeat } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    let requestData: { config: VideoConfig; beats: VideoBeat[]; scripts: string[]; avatarId?: string }
    try {
      requestData = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { config, beats, scripts, avatarId } = requestData

    if (!scripts || scripts.length === 0) {
      return NextResponse.json({ error: "No scripts provided for avatar generation" }, { status: 400 })
    }

    const didApiKey = process.env.DID_API_KEY
    if (!didApiKey) {
      return NextResponse.json({ error: "D-ID API key not configured" }, { status: 500 })
    }

    const didService = new DIDService(didApiKey)

    // Generate avatar videos for each script segment
    const avatarVideos: string[] = []

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i]
      console.log(`[v0] Generating avatar video ${i + 1}/${scripts.length}`)

      const videoUrl = await didService.generateAvatarVideo(script, avatarId)
      avatarVideos.push(videoUrl)
    }

    return NextResponse.json({
      avatarVideos,
      totalDuration: beats[beats.length - 1]?.end || 0,
      success: true,
    })
  } catch (error) {
    console.error("Avatar generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate avatar videos", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
