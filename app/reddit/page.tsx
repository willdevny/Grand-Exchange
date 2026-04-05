'use client'

import { useEffect, useMemo, useState } from 'react'

type SentimentSummary = {
  positive: number
  neutral: number
  negative: number
}

type YouTubeComment = {
  id: string
  videoId: string
  videoTitle: string
  channelTitle: string
  author: string
  likes: number
  createdAt: string
  text: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  url: string
}

function formatDate(value?: string) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function SentimentBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-4 rounded-full border border-black/15 dark:border-white/15 overflow-hidden bg-gray-200 dark:bg-gray-800">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function SentimentChart({ summary }: { summary: SentimentSummary }) {
  const positiveHeight = Math.max(12, summary.positive)
  const negativeHeight = Math.max(12, summary.negative)

  return (
    <div className="rounded-2xl border border-black/15 dark:border-white/15 p-4 space-y-4">
      <div>
        <h3 className="text-lg font-extrabold">Sentiment Chart</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">Positive vs. negative YouTube comment sentiment for the selected ticker.</p>
      </div>

      <div className="flex items-end justify-center gap-8 h-52">
        <div className="flex flex-col items-center gap-3 w-28">
          <div className="text-sm font-bold">{summary.positive}%</div>
          <div className="w-16 rounded-t-2xl bg-emerald-500" style={{ height: `${positiveHeight * 1.4}px` }} />
          <div className="text-sm font-semibold">Positive</div>
        </div>
        <div className="flex flex-col items-center gap-3 w-28">
          <div className="text-sm font-bold">{summary.negative}%</div>
          <div className="w-16 rounded-t-2xl bg-rose-500" style={{ height: `${negativeHeight * 1.4}px` }} />
          <div className="text-sm font-semibold">Negative</div>
        </div>
      </div>
    </div>
  )
}

export default function RedditPage() {
  const [symbolInput, setSymbolInput] = useState('AAPL')
  const [symbol, setSymbol] = useState('AAPL')
  const [summary, setSummary] = useState<SentimentSummary | null>(null)
  const [comments, setComments] = useState<YouTubeComment[]>([])
  const [youtubeBanner, setYouTubeBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const positiveCount = useMemo(
    () => comments.filter((item) => item.sentiment === 'positive').length,
    [comments],
  )
  const negativeCount = useMemo(
    () => comments.filter((item) => item.sentiment === 'negative').length,
    [comments],
  )

  async function loadData(nextSymbol: string) {
    setLoading(true)
    setError(null)
    try {
      const youtubeRes = await fetch(`/api/reddit?symbol=${encodeURIComponent(nextSymbol)}`)
      if (!youtubeRes.ok) throw new Error(`YouTube sentiment failed (${youtubeRes.status})`)

      const youtubeData = await youtubeRes.json()
      setSummary(youtubeData.summary)
      setComments(youtubeData.posts ?? [])
      setYouTubeBanner(youtubeData.banner ?? '')
      setSymbol(nextSymbol)
    } catch (e) {
      console.error(e)
      setError('Could not load YouTube sentiment data right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData('AAPL')
  }, [])

  function submitSymbol() {
    const cleaned = symbolInput.trim().toUpperCase()
    if (!cleaned) return
    loadData(cleaned)
  }

  return (
    <div className="space-y-8">
      <section className="card p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div>
            <h1 className="text-4xl font-extrabold">YouTube Sentiment</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mt-2">
              Live YouTube comment sentiment for <span className="font-bold underline">{symbol}</span>, using the YouTube API when available.
            </p>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && submitSymbol()}
              placeholder="Enter symbol"
              className="flex-1 lg:w-48 px-4 py-2 rounded-xl border border-black/20 dark:border-white/20 bg-white dark:bg-gray-950"
            />
            <button
              onClick={submitSymbol}
              className="px-5 py-2 rounded-xl border-2 border-black bg-sky-500 text-white font-bold hover:brightness-110"
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Load'}
            </button>
          </div>
        </div>

        {youtubeBanner && (
          <div className="p-3 rounded-xl border border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/20 dark:text-sky-200">
            {youtubeBanner}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl border border-red-400 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-200">
            {error}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-2xl font-extrabold">Sentiment Snapshot</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">Built from YouTube comments returned for videos related to the selected stock symbol.</p>
          {summary && (
            <div className="space-y-4">
              <SentimentBar label="Positive" value={summary.positive} tone="bg-emerald-500" />
              <SentimentBar label="Neutral" value={summary.neutral} tone="bg-gray-500" />
              <SentimentBar label="Negative" value={summary.negative} tone="bg-rose-500" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-black/15 dark:border-white/15 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Comments analyzed</div>
              <div className="text-2xl font-extrabold">{comments.length}</div>
            </div>
            <div className="rounded-xl border border-black/15 dark:border-white/15 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Positive / Negative</div>
              <div className="text-2xl font-extrabold">{positiveCount} / {negativeCount}</div>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          {summary ? <SentimentChart summary={summary} /> : null}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold">What YouTube commenters are saying about {symbol}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            Top-level comments are grouped from a few related videos and labeled with simple positive, neutral, or negative sentiment.
          </p>
        </div>

        <div className="space-y-4">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl border border-black/15 dark:border-white/15 p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <a
                    href={comment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-2xl font-extrabold leading-tight hover:underline"
                  >
                    {comment.videoTitle}
                  </a>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {comment.channelTitle} • {formatDate(comment.createdAt)}
                  </div>
                </div>
                <span className="text-xs uppercase font-bold rounded-full px-3 py-1 border border-black/15 dark:border-white/15">
                  {comment.sentiment ?? 'neutral'}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                @{comment.author} • {comment.likes} likes
              </div>
              <p className="text-base text-gray-800 dark:text-gray-200">{comment.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
