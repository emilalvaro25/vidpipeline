// Configuration constants for the video pipeline

interface VideoConfig {
  topic: string
  keywords: string[]
  imageCount: number
  clipDuration: number
  crossfadeDuration: number
  outputWidth: number
  outputHeight: number
  fps: number
  voiceEngine: string
}

export const DEFAULT_CONFIG: VideoConfig = {
  topic: "",
  keywords: [],
  imageCount: 12,
  clipDuration: 5.0,
  crossfadeDuration: 0.8,
  outputWidth: 1920,
  outputHeight: 1080,
  fps: 30,
  voiceEngine: "openai-tts",
}

export const API_ENDPOINTS = {
  unsplash: "https://api.unsplash.com/search/photos",
  openai: "https://api.openai.com/v1",
  did: "https://api.d-id.com",
} as const

export const DIRECTORIES = {
  cache: "cache",
  clips: "cache/clips",
  audio: "cache/audio",
  vo: "cache/vo",
  build: "build",
  logs: "logs",
} as const

export const AUDIO_SETTINGS = {
  sampleRate: 48000,
  channels: 1,
  format: "wav",
  normalizationLUFS: -16,
  compressionThreshold: 0.015,
  compressionRatio: 8,
  compressionAttack: 6,
  compressionRelease: 250,
} as const

export const VIDEO_SETTINGS = {
  codec: "libx264",
  crf: 16,
  preset: "slow",
  audioCodec: "aac",
  audioBitrate: "192k",
} as const
