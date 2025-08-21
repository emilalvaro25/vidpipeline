// Utility functions for the video pipeline

import type { VideoBeat, VideoConfig } from "./types"

export function calculateTotalDuration(config: VideoConfig): number {
  const { imageCount, clipDuration, crossfadeDuration } = config
  return imageCount * clipDuration - (imageCount - 1) * crossfadeDuration
}

export function generateBeatSheet(config: VideoConfig): VideoBeat[] {
  const beats: VideoBeat[] = []
  const { imageCount, clipDuration, crossfadeDuration } = config

  for (let i = 0; i < imageCount; i++) {
    const start = i * (clipDuration - crossfadeDuration)
    const end = start + clipDuration

    beats.push({
      idx: i + 1,
      dur: clipDuration,
      start,
      end,
    })
  }

  return beats
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .toLowerCase()
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function validateConfig(config: Partial<VideoConfig>): string[] {
  const errors: string[] = []

  if (!config.topic?.trim()) {
    errors.push("Topic is required")
  }

  if (!config.imageCount || config.imageCount < 3 || config.imageCount > 20) {
    errors.push("Image count must be between 3 and 20")
  }

  if (!config.clipDuration || config.clipDuration < 2 || config.clipDuration > 10) {
    errors.push("Clip duration must be between 2 and 10 seconds")
  }

  return errors
}

export function extractKeywords(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/[,\s]+/)
    .filter((word) => word.length > 2)
    .slice(0, 10) // Limit to 10 keywords
}
