export class GeminiService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
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
      console.log("[v0] Generating enhanced script with Gemini for topic:", topic)
      console.log("[v0] Target duration:", totalDuration, "seconds with", imageCount, "scenes")

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Gemini response received")

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!content) {
        throw new Error("No content received from Gemini")
      }

      console.log("[v0] Raw Gemini content:", content)

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
            .filter((line: string) => line.trim())
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
      console.error("[v0] Gemini script generation error:", error)
      throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async generateSpeech(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova",
  ): Promise<ArrayBuffer> {
    try {
      console.log("[v0] Generating speech using Gemini TTS API")

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:streamGenerateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: text,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["audio"],
              temperature: 1,
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Kore", // High-quality voice
                  },
                },
              },
            },
          }),
        },
      )

      if (!response.ok) {
        console.log("[v0] Gemini TTS API failed, falling back to Web Speech API")
        return await this.fallbackToWebSpeech(text, voice)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const chunks: Uint8Array[] = []
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          chunks.push(value)
        }
      }

      // Combine all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      console.log("[v0] Successfully generated speech using Gemini TTS")
      return result.buffer
    } catch (error) {
      console.error("[v0] Gemini TTS error:", error)
      console.log("[v0] Falling back to Web Speech API")
      return await this.fallbackToWebSpeech(text, voice)
    }
  }

  private async fallbackToWebSpeech(
    text: string,
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova",
  ): Promise<ArrayBuffer> {
    try {
      console.log("[v0] Using Web Speech API fallback")

      // Check if Web Speech API is available
      if ("speechSynthesis" in window) {
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text)

          // Configure voice settings
          utterance.rate = 0.9
          utterance.pitch = 1.0
          utterance.volume = 1.0

          // Try to find a suitable voice
          const voices = speechSynthesis.getVoices()
          const preferredVoice =
            voices.find(
              (v) =>
                v.name.toLowerCase().includes("female") ||
                v.name.toLowerCase().includes("nova") ||
                v.name.toLowerCase().includes("samantha"),
            ) || voices[0]

          if (preferredVoice) {
            utterance.voice = preferredVoice
          }

          // Create audio context to capture speech
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const destination = audioContext.createMediaStreamDestination()
          const mediaRecorder = new MediaRecorder(destination.stream)
          const chunks: Blob[] = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data)
            }
          }

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: "audio/wav" })
            const arrayBuffer = await audioBlob.arrayBuffer()
            resolve(arrayBuffer)
          }

          utterance.onstart = () => {
            mediaRecorder.start()
          }

          utterance.onend = () => {
            setTimeout(() => {
              mediaRecorder.stop()
            }, 100)
          }

          utterance.onerror = (error) => {
            console.error("[v0] Speech synthesis error:", error)
            reject(new Error("Speech synthesis failed"))
          }

          speechSynthesis.speak(utterance)
        })
      } else {
        // Final fallback: Create audio with estimated duration but add some tone
        console.log("[v0] Web Speech API not available, creating toned placeholder")

        const sampleRate = 44100
        const duration = Math.max(text.length * 0.08, 2) // More realistic duration estimate
        const numSamples = Math.floor(sampleRate * duration)

        const buffer = new ArrayBuffer(44 + numSamples * 2)
        const view = new DataView(buffer)

        // WAV header
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
          }
        }

        writeString(0, "RIFF")
        view.setUint32(4, 36 + numSamples * 2, true)
        writeString(8, "WAVE")
        writeString(12, "fmt ")
        view.setUint32(16, 16, true)
        view.setUint16(20, 1, true)
        view.setUint16(22, 1, true)
        view.setUint32(24, sampleRate, true)
        view.setUint32(28, sampleRate * 2, true)
        view.setUint16(32, 2, true)
        view.setUint16(34, 16, true)
        writeString(36, "data")
        view.setUint32(40, numSamples * 2, true)

        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate
          const frequency = 440 + Math.sin(t * 0.5) * 100 // Varying tone
          const amplitude = Math.sin(t * Math.PI * 2 * frequency) * 0.1 * Math.exp(-t * 0.5)
          const sample = Math.floor(amplitude * 32767)
          view.setInt16(44 + i * 2, sample, true)
        }

        console.log("[v0] Generated toned placeholder audio file with duration:", duration, "seconds")
        return buffer
      }
    } catch (error) {
      console.error("[v0] Fallback TTS generation error:", error)
      throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async generateFullNarration(scripts: string[]): Promise<ArrayBuffer> {
    // Combine all scripts into one narration
    const fullScript = scripts.join(" ")
    return await this.generateSpeech(fullScript)
  }
}
