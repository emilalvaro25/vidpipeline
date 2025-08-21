import { type NextRequest, NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("file")

    if (!filePath) {
      return NextResponse.json({ error: "File path required" }, { status: 400 })
    }

    if (!filePath.startsWith("build/")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 })
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const fileBuffer = readFileSync(filePath)
    const fileName = filePath.split("/").pop() || "video.mp4"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("[v0] Download error:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}
