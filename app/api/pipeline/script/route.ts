import { type NextRequest, NextResponse } from "next/server"
import { GeminiService } from "@/lib/gemini-service"
import type { VideoConfig, VideoBeat } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    let requestData: { config: VideoConfig; beats?: VideoBeat[] }
    try {
      requestData = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { config } = requestData

    if (!config || !config.topic || typeof config.topic !== "string" || config.topic.trim() === "") {
      return NextResponse.json({ error: "Valid topic is required for script generation" }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyDUT4pW4RM0FqX8-f502BXTCods9HPnc4Y"
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    const gemini = new GeminiService(geminiApiKey)
    const scriptResult = await gemini.generateScript(config.topic.trim(), config.imageCount, config.minDuration || 60)

    // Create beats based on the generated script
    const clipDuration = scriptResult.totalDuration / config.imageCount
    const beats: VideoBeat[] = scriptResult.scripts.map((script, index) => ({
      id: `beat-${index}`,
      start: index * clipDuration,
      end: (index + 1) * clipDuration,
      duration: clipDuration,
      script: script,
      image: null, // Will be populated by image pipeline
    }))

    return NextResponse.json({
      beats,
      scripts: scriptResult.scripts,
      totalDuration: scriptResult.totalDuration,
      success: true,
    })
  } catch (error) {
    console.error("Script generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate script", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
