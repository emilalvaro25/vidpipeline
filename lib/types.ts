// Core types for the video pipeline system

export interface VideoConfig {
  topic: string
  keywords: string[]
  imageCount: number
  clipDuration: number
  crossfadeDuration: number
  outputWidth: number
  outputHeight: number
  fps: number
  voiceEngine: "openai-tts" | "d-id"
}

export interface UnsplashImage {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
  }
  user: {
    name: string
    username: string
  }
  description: string | null
  alt_description: string | null
}

export interface VideoBeat {
  idx: number
  dur: number
  start: number
  end: number
  image?: UnsplashImage
  script?: string
}

export interface ScriptLine {
  beatIndex: number
  text: string
  duration: number
  timestamp: number
}

export interface AudioTrack {
  path: string
  duration: number
  volume: number
}

export interface PipelineStatus {
  stage: "idle" | "images" | "video" | "script" | "voice" | "audio" | "final"
  progress: number
  message: string
  error?: string
}

export interface GenerationResult {
  videoPath: string
  scriptPath: string
  audioPath: string
  creditsPath: string
  duration: number
  beats: VideoBeat[]
}
