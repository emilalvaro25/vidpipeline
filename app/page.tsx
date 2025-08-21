"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Play, Sparkles, ImageIcon, Mic, Music, Video, User } from "lucide-react"
import type { UnsplashImage, VideoBeat } from "@/lib/types"

const DEMO_EXAMPLES = [
  {
    title: "Nature Documentary",
    topic:
      "Majestic mountain landscapes, pristine forests, wildlife in natural habitat, serene lakes, golden sunsets, ancient trees, flowing rivers, peaceful meadows",
  },
  {
    title: "Urban Architecture",
    topic:
      "Modern skyscrapers, city skylines, architectural details, glass buildings, urban design, contemporary structures, metropolitan views, geometric patterns",
  },
  {
    title: "Ocean Adventure",
    topic:
      "Ocean waves, tropical beaches, underwater coral reefs, marine life, sailing boats, coastal cliffs, sunset over water, beach landscapes",
  },
]

export default function VideoPipelinePage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState("")
  const [topic, setTopic] = useState("")
  const [imageCount, setImageCount] = useState("15")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [voiceEngine, setVoiceEngine] = useState("d-id") // Default to D-ID for avatar support
  const [avatarId, setAvatarId] = useState("default") // Updated default value to be a non-empty string
  const [images, setImages] = useState<UnsplashImage[]>([])
  const [beats, setBeats] = useState<VideoBeat[]>([])
  const [error, setError] = useState("")
  const [assemblyResult, setAssemblyResult] = useState<any>(null)
  const [scriptResult, setScriptResult] = useState<any>(null)
  const [voiceResult, setVoiceResult] = useState<any>(null)
  const [avatarResult, setAvatarResult] = useState<any>(null) // Added avatar result state
  const [finalVideoResult, setFinalVideoResult] = useState<any>(null)

  const handleDemoExample = (example: (typeof DEMO_EXAMPLES)[0]) => {
    setTopic(example.topic)
    setError("")
    setImages([])
    setAssemblyResult(null)
    setScriptResult(null)
    setVoiceResult(null)
    setAvatarResult(null) // Reset avatar result
    setFinalVideoResult(null)
  }

  const getStageIcon = () => {
    if (currentStage.includes("images")) return <ImageIcon className="w-4 h-4" />
    if (currentStage.includes("script")) return <Sparkles className="w-4 h-4" />
    if (currentStage.includes("voice") || currentStage.includes("avatar")) return <Mic className="w-4 h-4" /> // Added avatar stage icon
    if (currentStage.includes("audio")) return <Music className="w-4 h-4" />
    if (currentStage.includes("video") || currentStage.includes("assembly")) return <Video className="w-4 h-4" />
    return <Play className="w-4 h-4" />
  }

  const handleGenerate = async () => {
    setIsProcessing(true)
    setProgress(0)
    setError("")
    setCurrentStage("Initializing video pipeline...")

    try {
      const config = {
        topic,
        imageCount: Number.parseInt(imageCount),
        clipDuration: 4.0,
        crossfadeDuration: 0.5,
        outputWidth: aspectRatio === "16:9" ? 1920 : 1080,
        outputHeight: aspectRatio === "16:9" ? 1080 : 1920,
        aspectRatio,
        fps: 30,
        voiceEngine,
        minDuration: 60,
      }

      setProgress(10)
      setCurrentStage("Generating AI script for minimum 1-minute video...")

      const scriptResponse = await fetch("/api/pipeline/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })

      let scriptData
      try {
        const responseText = await scriptResponse.text()
        scriptData = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("Server returned invalid response format")
      }

      if (!scriptResponse.ok) {
        throw new Error(scriptData.error || "Failed to generate script")
      }

      setScriptResult(scriptData)
      setProgress(25)
      setCurrentStage("Script generated! Searching for matching images...")

      const imageResponse = await fetch("/api/pipeline/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      let imageData
      try {
        const responseText = await imageResponse.text()
        imageData = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("Server returned invalid response format")
      }

      if (!imageResponse.ok) {
        throw new Error(imageData.error || "Failed to process images")
      }

      setImages(imageData.beats.map((beat: VideoBeat) => beat.image!))
      setBeats(imageData.beats)
      setProgress(40)
      setCurrentStage("Images processed! Assembling video clips...")

      const assemblyResponse = await fetch("/api/pipeline/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          beats: imageData.beats,
          scripts: scriptData.scripts,
        }),
      })

      let assemblyData
      try {
        const responseText = await assemblyResponse.text()
        assemblyData = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("Server returned invalid response format")
      }

      if (!assemblyResponse.ok) {
        throw new Error(assemblyData.error || "Failed to assemble video")
      }

      setAssemblyResult(assemblyData)
      setProgress(55)

      if (voiceEngine === "d-id") {
        setCurrentStage("Generating AI avatar presenter videos...")

        const avatarResponse = await fetch("/api/pipeline/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            beats: imageData.beats,
            scripts: scriptData.scripts,
            avatarId: avatarId || undefined,
          }),
        })

        let avatarData
        try {
          const responseText = await avatarResponse.text()
          avatarData = JSON.parse(responseText)
        } catch (parseError) {
          throw new Error("Server returned invalid response format")
        }

        if (!avatarResponse.ok) {
          throw new Error(avatarData.error || "Failed to generate avatar videos")
        }

        setAvatarResult(avatarData)
        setProgress(70)
        setCurrentStage("Avatar videos generated! Creating final video with avatar overlay...")
      } else {
        setCurrentStage("Video clips assembled! Generating AI voice narration...")
      }

      const voiceResponse = await fetch("/api/pipeline/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          beats: imageData.beats,
          scripts: scriptData.scripts,
        }),
      })

      let voiceData
      try {
        const responseText = await voiceResponse.text()
        voiceData = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("Server returned invalid response format")
      }

      if (!voiceResponse.ok) {
        throw new Error(voiceData.error || "Failed to generate voice")
      }

      setVoiceResult(voiceData)
      setProgress(85)
      setCurrentStage("Voice narration complete! Creating final video with BGM...")

      const finalResponse = await fetch("/api/pipeline/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          beats: imageData.beats,
          scripts: scriptData.scripts,
          audioData: voiceData.audioData,
          videoPaths: assemblyData.videoPaths,
          avatarVideos: avatarResult ? avatarResult.avatarVideos : undefined,
        }),
      })

      let finalData
      try {
        const responseText = await finalResponse.text()
        finalData = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("Server returned invalid response format")
      }

      if (!finalResponse.ok) {
        throw new Error(finalData.error || "Failed to create final video")
      }

      setFinalVideoResult(finalData)
      setProgress(95)
      setCurrentStage("Final video created! Processing complete...")

      setTimeout(() => {
        setProgress(100)
        setCurrentStage("🎉 Video pipeline complete! Ready for download.")
        setIsProcessing(false)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setIsProcessing(false)
      setProgress(0)
      setCurrentStage("")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Video className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI Video Pipeline Generator
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Create professional videos with AI avatars, generated scripts, voice narration, and stunning visuals.{" "}
            {/* Updated description to mention avatars */}
            Minimum 1-minute duration guaranteed.
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Quick Start Examples
            </CardTitle>
            <CardDescription>Try these pre-configured examples to see the pipeline in action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEMO_EXAMPLES.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-4 text-left justify-start bg-transparent"
                  onClick={() => handleDemoExample(example)}
                  disabled={isProcessing}
                >
                  <div>
                    <p className="font-medium">{example.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {example.topic.split(",").slice(0, 3).join(", ")}...
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Video Configuration</CardTitle>
            <CardDescription>Configure your AI video generation settings with avatar presenters</CardDescription>{" "}
            {/* Updated description */}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic">Video Topic & Keywords</Label>
              <Textarea
                id="topic"
                placeholder="Describe your video topic in detail... (e.g., 'mountain landscapes, serene lakes, golden sunsets, peaceful nature, wildlife, forest scenes')"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>💡 Tip: More detailed descriptions create better AI scripts and image selection</span>
                <span>{topic.length} characters</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {" "}
              {/* Changed to 2 columns to fit avatar selection */}
              <div className="space-y-2">
                <Label htmlFor="imageCount">Video Length</Label>
                <Select value={imageCount} onValueChange={setImageCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 scenes (~60s video)</SelectItem>
                    <SelectItem value="18">18 scenes (~75s video)</SelectItem>
                    <SelectItem value="20">20 scenes (~85s video)</SelectItem>
                    <SelectItem value="25">25 scenes (~105s video)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape/YouTube)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait/TikTok)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voiceEngine">AI Voice & Presenter</Label>
                <Select value={voiceEngine} onValueChange={setVoiceEngine}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="d-id">D-ID Avatar Presenter (Recommended)</SelectItem>
                    <SelectItem value="gemini-tts">Gemini TTS (Voice Only)</SelectItem>
                    <SelectItem value="openai-tts">OpenAI TTS-HD (Legacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {voiceEngine === "d-id" && (
                <div className="space-y-2">
                  <Label htmlFor="avatarId">Avatar Presenter</Label>
                  <Select value={avatarId} onValueChange={setAvatarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default Avatar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Female Avatar</SelectItem>
                      <SelectItem value="amy">Amy - Professional Female</SelectItem>
                      <SelectItem value="david">David - Professional Male</SelectItem>
                      <SelectItem value="sarah">Sarah - Friendly Female</SelectItem>
                      <SelectItem value="michael">Michael - Confident Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="space-y-3">
                <Label>Generation Progress</Label>
                <Progress value={progress} className="w-full h-2" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getStageIcon()}
                  <span>{currentStage}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!topic || isProcessing}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating AI Video...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Generate AI Video (Min 1 Min)
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Selected Images ({images.length})
              </CardTitle>
              <CardDescription>High-quality images from Unsplash matched to your script</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={image.id} className="group relative space-y-2">
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={image.urls.small || "/placeholder.svg"}
                        alt={image.alt_description || `Image ${index + 1}`}
                        className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                      />
                      <Badge className="absolute top-1 left-1 text-xs">{index + 1}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">by {image.user.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {scriptResult && (
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Sparkles className="w-5 h-5" />
                AI-Generated Script ({scriptResult.totalDuration}s)
              </CardTitle>
              <CardDescription>Professional narrative script generated by Google Gemini 2.0 Flash</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {scriptResult.scripts.map((script: string, index: number) => (
                  <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="text-xs">
                        Scene {index + 1}
                      </Badge>
                      <p className="text-sm text-green-800 leading-relaxed">{script}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {avatarResult && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <User className="w-5 h-5" />
                AI Avatar Presenter Videos ({avatarResult.avatarVideos.length} clips)
              </CardTitle>
              <CardDescription>Professional avatar presenter videos generated by D-ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {avatarResult.avatarVideos.slice(0, 6).map((videoUrl: string, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="relative overflow-hidden rounded-lg bg-orange-50 border border-orange-200">
                      <video
                        className="w-full h-24 object-cover"
                        src={videoUrl}
                        muted
                        loop
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                      <Badge className="absolute top-1 left-1 text-xs bg-orange-600">Clip {index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-orange-600">
                Total Duration: {avatarResult.totalDuration.toFixed(1)}s • Format: MP4 • Quality: HD
              </p>
            </CardContent>
          </Card>
        )}

        {voiceResult && (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Mic className="w-5 h-5" />
                AI Voice Narration ({voiceResult.duration.toFixed(1)}s)
              </CardTitle>
              <CardDescription>High-quality voice narration generated by Gemini TTS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">Audio Preview</p>
                </div>
                <audio controls className="w-full" src={`data:audio/wav;base64,${voiceResult.audioData}`}>
                  Your browser does not support the audio element.
                </audio>
                <p className="text-xs text-blue-600 mt-2">
                  Duration: {voiceResult.duration.toFixed(1)}s • Format: WAV • Quality: HD
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {finalVideoResult && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <Video className="w-5 h-5" />🎉 Final Video Complete!
              </CardTitle>
              <CardDescription>Your AI-generated video with voice narration and background music</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{finalVideoResult.duration.toFixed(1)}s</p>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{aspectRatio}</p>
                  <p className="text-sm text-muted-foreground">Aspect Ratio</p>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">MP4</p>
                  <p className="text-sm text-muted-foreground">Format</p>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">HD</p>
                  <p className="text-sm text-muted-foreground">Quality</p>
                </div>
              </div>

              <div className="p-4 bg-white/50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-800">Video Preview</p>
                </div>
                <video
                  controls
                  className="w-full rounded-lg"
                  src={finalVideoResult.videoUrl}
                  poster={finalVideoResult.thumbnailUrl}
                >
                  Your browser does not support the video element.
                </video>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="flex-1">
                    <Video className="w-4 h-4 mr-2" />
                    Download MP4
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Download Thumbnail
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {assemblyResult && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Video className="w-5 h-5" />
                Video Assembly Results
              </CardTitle>
              <CardDescription>Picture lock completed successfully - ready for final processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{assemblyResult.report.totalBeats}</p>
                  <p className="text-sm text-muted-foreground">Total Clips</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{assemblyResult.report.totalDuration.toFixed(1)}s</p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {assemblyResult.report.config.outputWidth}x{assemblyResult.report.config.outputHeight}
                  </p>
                  <p className="text-sm text-muted-foreground">Resolution</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{assemblyResult.report.config.fps} FPS</p>
                  <p className="text-sm text-muted-foreground">Frame Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
