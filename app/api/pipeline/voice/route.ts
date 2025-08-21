import { type NextRequest, NextResponse } from "next/server"
import type { VideoConfig, VideoBeat } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    let requestData: { config: VideoConfig; beats: VideoBeat[]; scripts: string[] }
    try {
      requestData = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { config, beats, scripts } = requestData

    if (!scripts || scripts.length === 0) {
      return NextResponse.json({ error: "No scripts provided for voice generation" }, { status: 400 })
    }

    if (config.voiceEngine === "d-id") {
      const didApiKey = process.env.DID_API_KEY
      if (!didApiKey) {
        return NextResponse.json({ error: "D-ID API key not configured" }, { status: 500 })
      }

      const { DIDService } = await import("@/lib/did-service")
      const didService = new DIDService(didApiKey)
      const audioBuffer = await didService.generateTTS(scripts.join(" "))

      // Convert ArrayBuffer to base64 for JSON response
      const audioBase64 = Buffer.from(audioBuffer).toString("base64")

      return NextResponse.json({
        audioData: audioBase64,
        audioFormat: "wav",
        duration: beats[beats.length - 1]?.end || 0,
        success: true,
      })
    } else {
      // Use existing Gemini TTS
      const geminiApiKey = process.env.GEMINI_API_KEY
      if (!geminiApiKey) {
        return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
      }

      const { GeminiService } = await import("@/lib/gemini-service")
      const gemini = new GeminiService(geminiApiKey)
      const audioBuffer = await gemini.generateFullNarration(scripts)

      // Convert ArrayBuffer to base64 for JSON response
      const audioBase64 = Buffer.from(audioBuffer).toString("base64")

      return NextResponse.json({
        audioData: audioBase64,
        audioFormat: "wav",
        duration: beats[beats.length - 1]?.end || 0,
        success: true,
      })
    }
  } catch (error) {
    console.error("Voice generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate voice", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
