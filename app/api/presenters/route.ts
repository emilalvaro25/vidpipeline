import { type NextRequest, NextResponse } from "next/server"
import { DIDService } from "@/lib/did-service"

export async function GET(request: NextRequest) {
  try {
    const didApiKey = process.env.DID_API_KEY
    if (!didApiKey) {
      return NextResponse.json({ error: "DID_API_KEY not configured" }, { status: 500 })
    }

    const didService = new DIDService(didApiKey)
    const presenters = await didService.getAvailableAvatars()

    return NextResponse.json({ presenters })
  } catch (error) {
    console.error("Presenters API error:", error)
    return NextResponse.json({ error: "Failed to fetch presenters" }, { status: 500 })
  }
}
