import { type NextRequest, NextResponse } from "next/server"
import { UnsplashService } from "@/lib/unsplash"

export async function POST(request: NextRequest) {
  try {
    let requestData: { query: string; count?: number }
    try {
      requestData = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { query, count } = requestData

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const accessKey = process.env.UNSPLASH_ACCESS_KEY
    if (!accessKey) {
      return NextResponse.json({ error: "Unsplash API key not configured" }, { status: 500 })
    }

    const unsplash = new UnsplashService(accessKey)
    const images = await unsplash.searchImages(query, count || 12)

    return NextResponse.json({ images, count: images.length })
  } catch (error) {
    console.error("Unsplash API error:", error)
    return NextResponse.json(
      { error: "Failed to search images", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
