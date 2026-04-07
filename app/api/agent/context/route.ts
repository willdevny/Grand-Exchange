import { NextResponse } from 'next/server'
import {
    enrichNewsWithArticleContent,
    fetchGoogleNewsRSS,
} from '@/lib/news/googleNews'
import {
    attachArticleSentiment,
    scoreNewsSentiment,
} from '@/lib/sentiment/newsSentiment'
import { fetchBlueskyAgentPosts } from '@/lib/social/blueskyAgent'
import { analyzeBlueskySentiment } from '@/lib/sentiment/socialSentiment'
import { resolveStockInput } from '@/lib/stocks/resolveStockInput'

type RequestBody = {
    query?: string
}

async function fetchPythonMarketData(ticker: string) {
    const baseUrl =
        process.env.PYTHON_MARKET_SERVICE_URL ?? 'http://127.0.0.1:8001'

    const url = `${baseUrl}/market?ticker=${encodeURIComponent(ticker)}&period=6mo`

    const res = await fetch(url, {
        cache: 'no-store',
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Python market service failed: ${res.status} ${text}`)
    }

    return res.json()
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

        const resolved = resolveStockInput(query)

        const [rawNews, marketData, blueskyPosts] = await Promise.all([
            fetchGoogleNewsRSS(resolved.searchQuery, 5).catch((error) => {
                console.error('Google News fetch failed:', error)
                return []
            }),
            fetchPythonMarketData(resolved.ticker).catch((error) => {
                console.error('Python market fetch failed:', error)
                return null
            }),
            fetchBlueskyAgentPosts(resolved.searchQuery, 25).catch((error) => {
                console.error('Bluesky agent fetch failed:', error)
                return []
            }),
        ])

        const newsWithArticles = await enrichNewsWithArticleContent(rawNews)
        const news = attachArticleSentiment(newsWithArticles)
        const newsSentiment = scoreNewsSentiment(news)
        const socialSentiment = analyzeBlueskySentiment(blueskyPosts)

        return NextResponse.json({
            ticker: resolved.ticker,
            companyName: resolved.companyName,
            displayName: resolved.displayName,
            searchQuery: resolved.searchQuery,
            matchedBy: resolved.matchedBy,
            news,
            newsSentiment,
            socialSentiment,
            blueskyPosts,
            marketData,
        })
    } catch (error) {
        console.error('Agent context error:', error)

        return NextResponse.json(
            { error: 'Failed to fetch agent context' },
            { status: 500 }
        )
    }
}