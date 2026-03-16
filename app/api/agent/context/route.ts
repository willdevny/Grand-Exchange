import { NextResponse } from 'next/server'
import { fetchGoogleNewsRSS } from '@/lib/news/googleNews'
import { scoreNewsSentiment } from '@/lib/sentiment/newsSentiment'

type RequestBody = {
    query?: string
}

function extractTickerOrQuery(input: string): string {
    const upperTicker = input.match(/\b[A-Z]{1,5}\b/)
    if (upperTicker) return upperTicker[0]
    return input.trim()
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

        const ticker = extractTickerOrQuery(query)

        const [news, marketData] = await Promise.all([
            fetchGoogleNewsRSS(ticker, 5).catch((error) => {
                console.error('Google News fetch failed:', error)
                return []
            }),
            fetchPythonMarketData(ticker).catch((error) => {
                console.error('Python market fetch failed:', error)
                return null
            }),
        ])

        const newsSentiment = scoreNewsSentiment(news)

        return NextResponse.json({
            ticker,
            news,
            newsSentiment,
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