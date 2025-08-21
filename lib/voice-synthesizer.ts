// Voice synthesis system using OpenAI TTS

import type { ScriptLine, VoiceConfig } from "./types"
import { exec } from "child_process"
import { promisify } from "util"
import { writeFile, existsSync, mkdir } from "fs"

const execAsync = promisify(exec)
const writeFileAsync = promisify(writeFile)

export interface VoiceSynthesisJob {
  id: string
  lines: ScriptLine[]
  config: VoiceConfig
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  currentStep: string
  outputPath?: string
  error?: string
}

export class VoiceSynthesizer {
  private config: VoiceConfig
  private apiKey: string

  constructor(config: VoiceConfig, apiKey: string) {
    this.config = config
    this.apiKey = apiKey
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = ["cache/audio", "cache/voice", "build"]
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await promisify(mkdir)(dir, { recursive: true })
      }
    }
  }

  async synthesizeLineToAudio(line: ScriptLine, index: number): Promise<string> {
    const outputPath = `cache/voice/line_${String(index).padStart(2, "0")}.wav`

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          input: line.text,
          voice: this.config.voice || "alloy",
          response_format: "wav",
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI TTS API error: ${response.statusText}`)
      }

      const audioBuffer = await response.arrayBuffer()
      await writeFileAsync(outputPath, Buffer.from(audioBuffer))

      console.log(`[v0] Generated TTS audio: ${outputPath}`)
      return outputPath
    } catch (error) {
      console.error(`[v0] Failed to synthesize line ${index}:`, error)
      throw error
    }
  }

  async processVoiceSynthesis(lines: ScriptLine[]): Promise<VoiceSynthesisJob> {
    const jobId = `voice_${Date.now()}`
    const job: VoiceSynthesisJob = {
      id: jobId,
      lines,
      config: this.config,
      status: "processing",
      progress: 0,
      currentStep: "Starting voice synthesis...",
    }

    try {
      await this.ensureDirectories()

      // Generate individual audio files
      const audioPaths: string[] = []

      for (let i = 0; i < lines.length; i++) {
        job.currentStep = `Synthesizing line ${i + 1} of ${lines.length}...`
        job.progress = (i / lines.length) * 80

        const audioPath = await this.synthesizeLineToAudio(lines[i], i + 1)
        audioPaths.push(audioPath)
      }

      job.currentStep = "Assembling voice track..."
      job.progress = 90

      const finalAudioPath = "build/narration.wav"
      await this.assembleVoiceTrack(audioPaths, lines, finalAudioPath)

      job.status = "completed"
      job.progress = 100
      job.currentStep = "Voice synthesis complete!"
      job.outputPath = finalAudioPath

      return job
    } catch (error) {
      job.status = "failed"
      job.error = error instanceof Error ? error.message : "Unknown error"
      job.currentStep = "Voice synthesis failed"
      return job
    }
  }

  private async assembleVoiceTrack(audioPaths: string[], lines: ScriptLine[], outputPath: string): Promise<void> {
    const inputs = audioPaths.map((path) => `-i "${path}"`).join(" ")

    // Build filter complex for timing and concatenation
    let filterComplex = ""
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const delay = line.start * 1000 // Convert to milliseconds
      filterComplex += `[${i}:a]adelay=${delay}|${delay}[a${i}];`
    }

    // Mix all delayed audio tracks
    const mixInputs = audioPaths.map((_, i) => `[a${i}]`).join("")
    filterComplex += `${mixInputs}amix=inputs=${audioPaths.length}:duration=longest[out]`

    const command = [
      "ffmpeg",
      inputs,
      "-filter_complex",
      `"${filterComplex}"`,
      "-map",
      "[out]",
      "-y",
      `"${outputPath}"`,
    ].join(" ")

    console.log(`[v0] Assembling voice track: ${command}`)
    await execAsync(command)
  }
}
