import { NextResponse } from 'next/server'
import { fetchGoogleNewsRSS } from '@/lib/news/googleNews'
import { scoreNewsSentiment } from '@/lib/sentiment/newsSentiment'
import { fetchRedditMentions } from '@/lib/reddit/redditClient'
import { scoreRedditSentiment } from '@/lib/sentiment/redditSentiment'

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

        const [news, redditMentions] = await Promise.all([
            fetchGoogleNewsRSS(ticker, 5),
            fetchRedditMentions(ticker, 10).catch((error) => {
                console.error('Reddit fetch failed:', error)
                return []
            }),
        ])

        const newsSentiment = scoreNewsSentiment(news)
        const redditSentiment = scoreRedditSentiment(redditMentions)

        return NextResponse.json({
            ticker,
            news,
            newsSentiment,
            reddit: {
                mentions: redditMentions,
                sentiment: redditSentiment,
            },
        })
    } catch (error) {
        console.error('Agent context error:', error)

        return NextResponse.json(
            { error: 'Failed to fetch agent context' },
            { status: 500 }
        )
    }
}