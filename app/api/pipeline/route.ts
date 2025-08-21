import { type NextRequest, NextResponse } from "next/server"
import type { VideoConfig, PipelineStatus } from "@/lib/types"
import { validateConfig, extractKeywords } from "@/lib/pipeline-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const config: Partial<VideoConfig> = body

    // Validate configuration
    const errors = validateConfig(config)
    if (errors.length > 0) {
      return NextResponse.json({ error: "Invalid configuration", details: errors }, { status: 400 })
    }

    // Extract keywords from topic
    const keywords = extractKeywords(config.topic || "")

    const fullConfig: VideoConfig = {
      ...config,
      keywords,
    } as VideoConfig

    // TODO: Implement actual pipeline processing
    // For now, return a mock response
    const status: PipelineStatus = {
      stage: "idle",
      progress: 0,
      message: "Pipeline configured successfully",
    }

    return NextResponse.json({ status, config: fullConfig })
  } catch (error) {
    console.error("Pipeline API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
