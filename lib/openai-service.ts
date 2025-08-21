import OpenAI from "openai"

export class OpenAIService {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    })
  }

  async generateScript(
    topic: string,
    imageCount: number,
    minDuration = 60,
  ): Promise<{ scripts: string[]; totalDuration: number }> {
    // Calculate duration per scene to meet minimum requirement
    const minDurationPerScene = Math.max(minDuration / imageCount, 4.0) // At least 4 seconds per scene
    const totalDuration = minDurationPerScene * imageCount

    const prompt = `Create a compelling, professional narrative script for a ${totalDuration}-second video about "${topic}".

The video has ${imageCount} scenes, each lasting approximately ${minDurationPerScene.toFixed(1)} seconds.

Requirements:
- Write ${imageCount} distinct narrative segments that tell a cohesive story
- Each segment should be 2-3 sentences to fill ${minDurationPerScene.toFixed(1)} seconds of narration
- Create engaging, documentary-style content with vivid descriptions
- Use professional, captivating language that complements visual imagery
- Ensure smooth transitions between scenes
- Total script should provide at least ${minDuration} seconds of narration
- Focus on storytelling that matches the visual theme

Format your response as a JSON array of strings, one narrative segment for each scene.

Example format: ["Opening narrative for scene 1...", "Continuing story for scene 2...", ...]`

    try {
      console.log("[v0] Generating enhanced script with OpenAI for topic:", topic)
      console.log("[v0] Target duration:", totalDuration, "seconds with", imageCount, "scenes")

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional scriptwriter specializing in visual storytelling for documentaries and promotional videos. Create engaging, detailed narratives that provide sufficient content for the specified duration. Always respond with valid JSON array format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000, // Increased for longer scripts
      })

      console.log("[v0] OpenAI response received")

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content received from OpenAI")
      }

      console.log("[v0] Raw OpenAI content:", content)

      let scripts: string[]
      try {
        scripts = JSON.parse(content)
      } catch (parseError) {
        console.log("[v0] JSON parse failed, attempting to extract JSON from content")
        // Try to extract JSON from markdown code blocks or other formatting
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          scripts = JSON.parse(jsonMatch[0])
        } else {
          // Fallback: split content into segments
          const segments = content
            .split("\n")
            .filter((line) => line.trim())
            .slice(0, imageCount)
          scripts = segments.length >= imageCount ? segments : Array(imageCount).fill(content)
        }
      }

      if (!Array.isArray(scripts)) {
        throw new Error("Response is not an array")
      }

      if (scripts.length < imageCount) {
        // Pad with enhanced versions of existing scripts
        while (scripts.length < imageCount) {
          const lastScript = scripts[scripts.length - 1] || "Continuing the visual journey..."
          scripts.push(`${lastScript} The story continues to unfold with breathtaking detail.`)
        }
      } else if (scripts.length > imageCount) {
        // Trim to exact count
        scripts = scripts.slice(0, imageCount)
      }

      console.log("[v0] Successfully generated", scripts.length, "script segments for", totalDuration, "seconds")
      return { scripts, totalDuration }
    } catch (error) {
      console.error("[v0] OpenAI script generation error:", error)
      throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async generateSpeech(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova",
  ): Promise<ArrayBuffer> {
    try {
      console.log("[v0] Generating speech with TTS model: tts-1-hd")

      const response = await this.client.audio.speech.create({
        model: "tts-1-hd",
        voice: voice,
        input: text,
        response_format: "mp3",
      })

      console.log("[v0] TTS response received successfully")
      return await response.arrayBuffer()
    } catch (error) {
      console.error("[v0] OpenAI TTS error:", error)
      throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async generateFullNarration(scripts: string[]): Promise<ArrayBuffer> {
    // Combine all scripts into one narration
    const fullScript = scripts.join(" ")
    return await this.generateSpeech(fullScript)
  }
}
