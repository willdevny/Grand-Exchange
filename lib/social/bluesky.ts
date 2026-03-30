import { classifySentiment } from '@/lib/sentiment/basicSentiment'
import type { SocialPost } from '@/lib/reddit/types'

const PUBLIC_BSKY = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts'

export async function fetchBlueskyPosts(query: string, limit = 6): Promise<SocialPost[]> {
  const url = `${PUBLIC_BSKY}?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      return []
    }

    const data = (await res.json()) as {
      posts?: Array<{
        uri?: string
        indexedAt?: string
        author?: { handle?: string }
        record?: { text?: string }
      }>
    }

    const results: SocialPost[] = []
    for (const post of data.posts ?? []) {
      const text = post.record?.text?.trim() ?? ''
      if (!text) continue
      results.push({
        id: post.uri ?? `${query}-${results.length}`,
        source: 'bluesky',
        author: post.author?.handle ?? 'unknown',
        text,
        createdAt: post.indexedAt,
        sentiment: classifySentiment(text),
      })
    }

    return results
  } catch (error) {
    console.error('Bluesky fetch failed:', error)
    return []
  }
}

export function getDemoSocialPosts(symbol: string): SocialPost[] {
  const upper = symbol.toUpperCase()
  return [
    {
      id: `${upper}-b1`,
      source: 'demo',
      author: 'marketwatch_demo',
      text: `${upper} sentiment looks steady today. Traders are watching momentum and earnings commentary closely.`,
      createdAt: new Date().toISOString(),
      sentiment: classifySentiment(`${upper} sentiment looks steady today. Traders are watching momentum and earnings commentary closely.`),
    },
    {
      id: `${upper}-b2`,
      source: 'demo',
      author: 'value_demo',
      text: `Some users think ${upper} is getting expensive after the recent run, while others still see long-term upside.`,
      createdAt: new Date().toISOString(),
      sentiment: classifySentiment(`Some users think ${upper} is getting expensive after the recent run, while others still see long-term upside.`),
    },
    {
      id: `${upper}-b3`,
      source: 'demo',
      author: 'ai_demo',
      text: `${upper} keeps showing up in social chatter because people expect the next catalyst to move the stock quickly.`,
      createdAt: new Date().toISOString(),
      sentiment: classifySentiment(`${upper} keeps showing up in social chatter because people expect the next catalyst to move the stock quickly.`),
    },
  ]
}
