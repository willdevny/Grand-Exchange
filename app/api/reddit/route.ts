import { NextResponse } from 'next/server'
import { fetchYouTubeComments } from '@/lib/youtube/youtubeSentiment'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'AAPL'
  const data = await fetchYouTubeComments(symbol)

  return NextResponse.json(data)
}
