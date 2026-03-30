import { NextResponse } from 'next/server'
import { loadDump } from '@/lib/reddit/redditDump'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol') || 'AAPL'
  const data = loadDump(symbol)

  return NextResponse.json({
    ...data,
    mode: 'demo',
    banner: 'Using simulated Reddit data for demonstration.',
  })
}
