// Video processing utilities for clip generation and effects

import type { VideoConfig, VideoBeat } from "./types"

export interface KenBurnsEffect {
  startScale: number
  endScale: number
  startX: number
  startY: number
  endX: number
  endY: number
}

export class VideoProcessor {
  private config: VideoConfig

  constructor(config: VideoConfig) {
    this.config = config
  }

  generateKenBurnsEffect(): KenBurnsEffect {
    // Generate random Ken Burns pan/zoom effect
    const scales = [1.0, 1.1, 1.2, 1.3]
    const positions = [0, 0.1, 0.2, -0.1, -0.2]

    return {
      startScale: scales[Math.floor(Math.random() * scales.length)],
      endScale: scales[Math.floor(Math.random() * scales.length)],
      startX: positions[Math.floor(Math.random() * positions.length)],
      startY: positions[Math.floor(Math.random() * positions.length)],
      endX: positions[Math.floor(Math.random() * positions.length)],
      endY: positions[Math.floor(Math.random() * positions.length)],
    }
  }

  generateFFmpegClipCommand(inputPath: string, outputPath: string, effect: KenBurnsEffect, duration = 5.0): string {
    const { outputWidth, outputHeight, fps } = this.config

    // FFmpeg zoompan filter for Ken Burns effect
    const zoompanFilter = [
      `zoompan=z='if(lte(zoom,1.0),${effect.startScale},${effect.endScale})'`,
      `x='if(gte(on,1),x+${(effect.endX - effect.startX) / (duration * fps)},${effect.startX * outputWidth})'`,
      `y='if(gte(on,1),y+${(effect.endY - effect.startY) / (duration * fps)},${effect.startY * outputHeight})'`,
      `d=${duration * fps}`,
      `s=${outputWidth}x${outputHeight}`,
      `fps=${fps}`,
    ].join(":")

    return [
      "ffmpeg",
      "-i",
      `"${inputPath}"`,
      "-vf",
      `"${zoompanFilter}"`,
      "-t",
      duration.toString(),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-y",
      `"${outputPath}"`,
    ].join(" ")
  }

  generateCrossfadeCommand(clipPaths: string[], outputPath: string): string {
    const { crossfadeDuration } = this.config

    if (clipPaths.length < 2) {
      throw new Error("Need at least 2 clips for crossfade")
    }

    // Build complex filter for chaining crossfades
    const inputs = clipPaths.map((_, i) => `-i "${clipPaths[i]}"`).join(" ")

    let filterComplex = ""
    let currentLabel = "[0:v]"

    for (let i = 1; i < clipPaths.length; i++) {
      const nextLabel = i === clipPaths.length - 1 ? "[out]" : `[v${i}]`
      filterComplex += `${currentLabel}[${i}:v]xfade=transition=fade:duration=${crossfadeDuration}:offset=${(i - 1) * (this.config.clipDuration - crossfadeDuration)}${nextLabel};`
      currentLabel = nextLabel
    }

    return [
      "ffmpeg",
      inputs,
      "-filter_complex",
      `"${filterComplex}"`,
      "-map",
      '"[out]"',
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-y",
      `"${outputPath}"`,
    ].join(" ")
  }

  async processClipsBatch(
    clips: Array<{ inputPath: string; outputPath: string; duration: number }>,
  ): Promise<Array<{ success: boolean; outputPath: string; error?: string }>> {
    const results = []

    for (const clip of clips) {
      try {
        const effect = this.generateKenBurnsEffect()
        const command = this.generateFFmpegClipCommand(clip.inputPath, clip.outputPath, effect, clip.duration)

        // In a real implementation, this would execute the FFmpeg command
        console.log(`Processing clip: ${command}`)

        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 500))

        results.push({
          success: true,
          outputPath: clip.outputPath,
        })
      } catch (error) {
        results.push({
          success: false,
          outputPath: clip.outputPath,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return results
  }

  validateClipRequirements(beats: VideoBeat[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (beats.length < 2) {
      errors.push("Need at least 2 beats for video assembly")
    }

    for (const beat of beats) {
      if (!beat.image) {
        errors.push(`Beat ${beat.idx} is missing image data`)
      }

      if (beat.dur <= 0) {
        errors.push(`Beat ${beat.idx} has invalid duration: ${beat.dur}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
