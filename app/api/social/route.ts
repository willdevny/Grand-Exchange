import { NextResponse } from 'next/server'
import { fetchBlueskyPosts, getDemoSocialPosts } from '@/lib/social/bluesky'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol') || 'AAPL').toUpperCase()
  const posts = await fetchBlueskyPosts(symbol, 6)
  const usingDemo = posts.length === 0

  return NextResponse.json({
    symbol,
    source: usingDemo ? 'demo-social' : 'bluesky-public-api',
    banner: usingDemo
      ? 'Using free demo social posts because no live free source responded.'
      : 'Using free public Bluesky search results.',
    posts: usingDemo ? getDemoSocialPosts(symbol) : posts,
  })
}
