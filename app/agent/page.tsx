'use client'

import { useEffect, useRef, useState } from 'react'

type ChatLink = {
    label: string
    href: string
}

type ChatMessage = {
    id: string
    role: 'user' | 'agent'
    content: string
    timestamp: number
    links?: ChatLink[]
}

type ArticleSentimentDetails = {
    score?: number
    label?: 'positive' | 'negative' | 'neutral'
    positiveKeywordHits?: number
    negativeKeywordHits?: number
    matchedPositiveKeywords?: string[]
    matchedNegativeKeywords?: string[]
    usedFullArticle?: boolean
}

type NewsItem = {
    title?: string
    source?: string
    link?: string
    publishedAt?: string
    description?: string
    articleUrl?: string
    articleText?: string
    articleTitle?: string
    articleSentiment?: ArticleSentimentDetails
}

type NewsSentiment = {
    score?: number
    keywordBalanceScore?: number
    positives?: number
    negatives?: number
    neutral?: number
    total?: number
    positiveKeywords?: number
    negativeKeywords?: number
    articlesAnalyzed?: number
    headlinesOnly?: number
}

type HistoricalPricePoint = {
    date: string
    close: number
    volume: number
}

type MarketData = {
    latestClose?: number | null
    sma20?: number | null
    sma50?: number | null
    rsi14?: number | null
    volatility30?: number | null
    trend?: string
    recentPrices?: HistoricalPricePoint[]
}

type AgentContextResponse = {
    ticker?: string
    news?: NewsItem[]
    newsSentiment?: NewsSentiment
    marketData?: MarketData | null
    error?: string
}

export default function AgentPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'agent',
            content:
                "Welcome to the Stock Agent. Ask me about a stock ticker or company name, and I'll pull together supporting context.",
            timestamp: 0,
        },
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const logRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        logRef.current?.scrollTo({
            top: logRef.current.scrollHeight,
            behavior: 'smooth',
        })
    }, [messages, isLoading])

    async function sendMessage() {
        const text = input.trim()
        if (!text || isLoading) return

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        try {
            const res = await fetch('/api/agent/context', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: text }),
            })

            if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`)
            }

            const ctx: AgentContextResponse = await res.json()

            const ticker = ctx.ticker ?? 'Unknown'
            const news = Array.isArray(ctx.news) ? ctx.news : []
            const newsSentiment = ctx.newsSentiment
            const marketData = ctx.marketData

            let agentResponse = `Here is the current context I found for ${ticker}:\n\n`

            if (marketData) {
                agentResponse += `Historical price + indicator summary:\n`
                agentResponse += `- Latest close: ${
                    typeof marketData.latestClose === 'number'
                        ? marketData.latestClose.toFixed(2)
                        : 'N/A'
                }\n`
                agentResponse += `- SMA 20: ${
                    typeof marketData.sma20 === 'number'
                        ? marketData.sma20.toFixed(2)
                        : 'N/A'
                }\n`
                agentResponse += `- SMA 50: ${
                    typeof marketData.sma50 === 'number'
                        ? marketData.sma50.toFixed(2)
                        : 'N/A'
                }\n`
                agentResponse += `- RSI 14: ${
                    typeof marketData.rsi14 === 'number'
                        ? marketData.rsi14.toFixed(2)
                        : 'N/A'
                }\n`
                agentResponse += `- 30-day volatility: ${
                    typeof marketData.volatility30 === 'number'
                        ? `${marketData.volatility30.toFixed(2)}%`
                        : 'N/A'
                }\n`
                agentResponse += `- Trend: ${marketData.trend ?? 'unknown'}\n`
            } else {
                agentResponse += `No historical market data was available.\n`
            }

            agentResponse += '\n'

            if (news.length > 0) {
                agentResponse += `I found ${news.slice(0, 5).length} relevant news article(s).\n`

                if (newsSentiment) {
                    const articleAverageScore =
                        typeof newsSentiment.score === 'number'
                            ? newsSentiment.score.toFixed(2)
                            : 'N/A'

                    const keywordBalanceScore =
                        typeof newsSentiment.keywordBalanceScore === 'number'
                            ? newsSentiment.keywordBalanceScore.toFixed(2)
                            : 'N/A'

                    agentResponse += `News sentiment summary:\n`
                    agentResponse += `- Article-average score: ${articleAverageScore}\n`
                    agentResponse += `- Keyword-balance score: ${keywordBalanceScore}\n`
                    agentResponse += `- Positive articles: ${newsSentiment.positives ?? 0}\n`
                    agentResponse += `- Negative articles: ${newsSentiment.negatives ?? 0}\n`
                    agentResponse += `- Neutral articles: ${newsSentiment.neutral ?? 0}\n`
                    agentResponse += `- Positive keyword hits: ${newsSentiment.positiveKeywords ?? 0}\n`
                    agentResponse += `- Negative keyword hits: ${newsSentiment.negativeKeywords ?? 0}\n`
                    agentResponse += `- Full articles analyzed: ${newsSentiment.articlesAnalyzed ?? 0}\n`
                    agentResponse += `- Headline-only fallbacks: ${newsSentiment.headlinesOnly ?? 0}\n\n`
                }
            } else {
                agentResponse += 'No recent Google News headlines were found.\n\n'
            }

            const newsLinks = news
                .slice(0, 5)
                .filter(
                    (item): item is NewsItem & { title: string; link: string } =>
                        typeof item.title === 'string' &&
                        item.title.length > 0 &&
                        typeof item.link === 'string' &&
                        item.link.length > 0
                )
                .map((item) => {
                    const sentimentLabel = item.articleSentiment?.label
                        ? ` - ${item.articleSentiment.label}`
                        : ''

                    const extractionLabel =
                        item.articleSentiment?.usedFullArticle === true
                            ? ' [full article]'
                            : ' [headline fallback]'

                    return {
                        label:
                            item.source && !item.title.includes(item.source)
                                ? `${item.title} (${item.source})${sentimentLabel}${extractionLabel}`
                                : `${item.title}${sentimentLabel}${extractionLabel}`,
                        href: item.articleUrl || item.link,
                    }
                })

            const agentMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'agent',
                content: agentResponse,
                timestamp: Date.now(),
                links: newsLinks,
            }

            setMessages((prev) => [...prev, agentMsg])
        } catch (error) {
            console.error('Failed to fetch agent context:', error)

            const errorMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'agent',
                content:
                    'Sorry — I was unable to retrieve news and sentiment data for that request.',
                timestamp: Date.now(),
            }

            setMessages((prev) => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void sendMessage()
        }
    }

    return (
        <div className="space-y-10">
            <section className="card p-8">
                <h1 className="text-4xl font-extrabold mb-4">Stock Agent</h1>

                <p className="text-lg mb-2 text-gray-700 dark:text-gray-300">
                    Ask our customized agent questions about stocks you may be interested
                    in.
                </p>

                <p className="text-sm text-gray-700 dark:text-gray-400">
                    The agent can be extended to combine market news, Reddit sentiment,
                    and other research signals.
                </p>
            </section>

            <section className="card p-6 space-y-4">
                <div
                    ref={logRef}
                    className="h-[420px] overflow-y-auto rounded-xl border-4 border-black dark:border-white/20 bg-white dark:bg-gray-950 p-4 space-y-3"
                >
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            role={msg.role}
                            content={msg.content}
                            links={msg.links}
                        />
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-xl border-4 border-black dark:border-white/20 px-4 py-3 text-sm bg-gray-100 dark:bg-gray-900">
                                <div className="text-xs font-bold mb-1">Agent</div>
                                <div>Thinking...</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about a stock (e.g., 'Analyze AAPL sentiment and recent news')"
                        className="flex-1 min-h-[52px] max-h-[140px] resize-y bg-white dark:bg-gray-900 dark:text-white border-4 border-black dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none"
                        disabled={isLoading}
                    />

                    <button
                        onClick={() => void sendMessage()}
                        disabled={isLoading}
                        className="bg-white dark:bg-gray-900 dark:text-white border-4 border-black dark:border-white/20 rounded-xl px-5 py-3 font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-400">
                    Press <span className="font-semibold">Enter</span> to send. Hold{' '}
                    <span className="font-semibold">Shift + Enter</span> for a new line.
                </p>
            </section>
        </div>
    )
}

function MessageBubble({
                           role,
                           content,
                           links,
                       }: {
    role: 'user' | 'agent'
    content: string
    links?: ChatLink[]
}) {
    const isUser = role === 'user'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={[
                    'max-w-[80%] rounded-xl border-4 border-black dark:border-white/20 px-4 py-3 text-sm',
                    isUser
                        ? 'bg-sky-200 dark:bg-sky-900/40'
                        : 'bg-gray-100 dark:bg-gray-900',
                ].join(' ')}
            >
                <div className="text-xs font-bold mb-1">{isUser ? 'You' : 'Agent'}</div>

                <div className="whitespace-pre-wrap">{content}</div>

                {!isUser && links && links.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <div className="text-xs font-semibold">Top news headlines:</div>
                        <ul className="space-y-1">
                            {links.map((link, index) => (
                                <li key={`${link.href}-${index}`}>
                                    <a
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 underline hover:opacity-80"
                                    >
                                        {index + 1}. {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    )
}