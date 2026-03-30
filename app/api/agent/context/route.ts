import { NextResponse } from 'next/server'
import { fetchGoogleNewsRSS } from '@/lib/news/googleNews'
import { scoreNewsSentiment } from '@/lib/sentiment/newsSentiment'
import { fetchHistoricalPrices } from '@/lib/market_historicalPrices'
import { calculateIndicators } from '@/lib/market_indicators'
import { loadDump } from '@/lib/reddit/redditDump'
import { fetchBlueskyPosts, getDemoSocialPosts } from '@/lib/social/bluesky'

type RequestBody = {
    query?: string
}

function extractTickerOrQuery(input: string): string {
    const upperTicker = input.match(/\b[A-Z]{1,5}\b/)
    if (upperTicker) return upperTicker[0]

    return input.trim()
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as RequestBody
        const query = body.query?.trim()

        if (!query) {
            return NextResponse.json(
                { error: 'Missing query' },
                { status: 400 }
            )
        }

        const ticker = extractTickerOrQuery(query)

        const news = await fetchGoogleNewsRSS(ticker, 5)
        const newsSentiment = scoreNewsSentiment(news)
        const historicalPrices = await fetchHistoricalPrices(ticker, 'D', 90)
        const indicators = calculateIndicators(historicalPrices)
        const redditSentiment = loadDump(ticker)
        const socialPosts = (await fetchBlueskyPosts(ticker, 4)).slice(0, 4)
        const socialSnapshot =
            socialPosts.length > 0 ? socialPosts : getDemoSocialPosts(ticker)

        return NextResponse.json({
            ticker,
            news,
            newsSentiment,
            historicalPrices,
            indicators,
            redditSentiment,
            socialSnapshot,
        })
    } catch (error) {
        console.error('Agent context error:', error)

        return NextResponse.json(
            { error: 'Failed to fetch agent context' },
            { status: 500 }
        )
    }
}
