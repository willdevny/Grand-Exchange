'use client'

import { useEffect, useRef, useState } from 'react'

type ChatMessage = {
    id: string
    role: 'user' | 'agent'
    content: string
    timestamp: number
}

type NewsItem = {
    title?: string
    source?: string
    link?: string
    publishedAt?: string
}

type RedditMention = {
    title?: string
    text?: string
    url?: string
    subreddit?: string
    createdUtc?: number
}

type RedditSentiment = {
    score?: number
    positives?: number
    negatives?: number
    neutral?: number
    total?: number
}

type AgentContextResponse = {
    ticker?: string
    news?: NewsItem[]
    reddit?: {
        mentions?: RedditMention[]
        sentiment?: RedditSentiment
    }
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
            const redditSentiment = ctx.reddit?.sentiment
            const redditMentions = Array.isArray(ctx.reddit?.mentions)
                ? ctx.reddit.mentions
                : []

            let agentResponse = `Here is the current context I found for ${ticker}:\n\n`

            if (news.length > 0) {
                agentResponse += 'Top news headlines:\n'
                news.slice(0, 5).forEach((item, index) => {
                    const title = item.title ?? 'Untitled article'
                    const source = item.source ? ` (${item.source})` : ''
                    agentResponse += `${index + 1}. ${title}${source}\n`
                })
                agentResponse += '\n'
            } else {
                agentResponse += 'No recent Google News headlines were found.\n\n'
            }

            if (redditSentiment) {
                const score =
                    typeof redditSentiment.score === 'number'
                        ? redditSentiment.score.toFixed(2)
                        : 'N/A'

                agentResponse += 'Reddit sentiment summary:\n'
                agentResponse += `- Score: ${score}\n`
                agentResponse += `- Positive posts: ${redditSentiment.positives ?? 0}\n`
                agentResponse += `- Negative posts: ${redditSentiment.negatives ?? 0}\n`
                agentResponse += `- Neutral posts: ${redditSentiment.neutral ?? 0}\n`
                agentResponse += `- Total mentions analyzed: ${
                    redditSentiment.total ?? redditMentions.length
                }\n`
            } else {
                agentResponse += 'No Reddit sentiment data was available.\n'
            }

            const agentMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'agent',
                content: agentResponse,
                timestamp: Date.now(),
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
                       }: {
    role: 'user' | 'agent'
    content: string
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
            </div>
        </div>
    )
}