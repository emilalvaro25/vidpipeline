export class DIDService {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = "https://api.d-id.com"
  }

  async generateAvatarVideo(script: string, avatarId?: string): Promise<string> {
    try {
      console.log("[v0] Generating D-ID avatar video")
      console.log("[v0] Received avatarId:", avatarId)

      let sourceUrl = "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg"

      if (avatarId && avatarId !== "default") {
        // Map avatar IDs to actual image URLs
        const avatarMap: Record<string, string> = {
          amy: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
          david: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
          sarah: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
          michael: "https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg",
        }
        sourceUrl = avatarMap[avatarId] || sourceUrl
      }

      console.log("[v0] Final sourceUrl:", sourceUrl)

      const requestBody = {
        source_url: sourceUrl,
        script: {
          type: "text",
          subtitles: "false",
          provider: {
            type: "microsoft",
            voice_id: "Sara", // Simplified voice ID format
          },
          input: script,
          ssml: "false",
        },
        config: {
          fluent: "false", // Changed to string format as per example
        },
      }

      console.log("[v0] D-ID request body:", JSON.stringify(requestBody, null, 2))

      const response = await fetch(`${this.baseUrl}/talks`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] D-ID API error response:", errorText)
        throw new Error(`D-ID API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const talkId = data.id

      // Poll for completion
      return await this.pollForCompletion(talkId)
    } catch (error) {
      console.error("[v0] D-ID avatar generation error:", error)
      throw new Error(`Failed to generate avatar video: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // TTS is handled internally by the /talks endpoint

  private async pollForCompletion(talkId: string): Promise<string> {
    const maxAttempts = 30
    const pollInterval = 2000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/talks/${talkId}`, {
          headers: {
            Authorization: `Basic ${this.apiKey}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Poll error: ${response.status}`)
        }

        const data = await response.json()

        if (data.status === "done") {
          console.log("[v0] D-ID avatar video completed:", data.result_url)
          return data.result_url
        } else if (data.status === "error") {
          throw new Error(`D-ID processing failed: ${data.error}`)
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      } catch (error) {
        console.error(`[v0] Poll attempt ${attempt + 1} failed:`, error)
        if (attempt === maxAttempts - 1) {
          throw error
        }
      }
    }

    throw new Error("D-ID processing timeout")
  }

  async getAvailableAvatars(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/clips/presenters?limit=100`, {
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`D-ID API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Available D-ID presenters:", data.presenters?.length || 0)
      return data.presenters || []
    } catch (error) {
      console.error("[v0] Failed to fetch presenters:", error)
      return []
    }
  }

  async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tts/voices`, {
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`D-ID API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Available D-ID voices:", data.length || 0)
      return data || []
    } catch (error) {
      console.error("[v0] Failed to fetch voices:", error)
      return []
    }
  }
}
