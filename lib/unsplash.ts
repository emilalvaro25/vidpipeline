// Unsplash API integration for image search and download

import type { UnsplashImage } from "./types"

interface UnsplashSearchResponse {
  results: UnsplashImage[]
  total: number
  total_pages: number
}

export class UnsplashService {
  private accessKey: string

  constructor(accessKey: string) {
    this.accessKey = accessKey
  }

  async searchImages(query: string, count = 12): Promise<UnsplashImage[]> {
    const url = new URL("https://api.unsplash.com/search/photos")
    url.searchParams.set("query", query)
    url.searchParams.set("per_page", Math.min(count, 30).toString())
    url.searchParams.set("orientation", "landscape")
    url.searchParams.set("order_by", "relevant")

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${this.accessKey}`,
        "Accept-Version": "v1",
      },
    })

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`)
    }

    let data: UnsplashSearchResponse
    try {
      data = await response.json()
    } catch (parseError) {
      throw new Error("Unsplash API returned invalid JSON response")
    }

    return data.results.slice(0, count)
  }

  async downloadImage(image: UnsplashImage, width = 2200): Promise<ArrayBuffer> {
    const imageUrl = `${image.urls.raw}&w=${width}&fit=max&q=85`

    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`)
    }

    return response.arrayBuffer()
  }

  getImageCredits(images: UnsplashImage[]): Array<{ photographer: string; username: string; imageId: string }> {
    return images.map((image) => ({
      photographer: image.user.name,
      username: image.user.username,
      imageId: image.id,
    }))
  }
}
