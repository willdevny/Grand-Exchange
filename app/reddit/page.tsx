'use client'

import { useEffect, useMemo, useState } from 'react'

type SentimentSummary = {
  positive: number
  neutral: number
  negative: number
}

type RedditPost = {
  id: string
  title: string
  subreddit: string
  author: string
  score: number
  comments: number
  createdAt: string
  body?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

type SocialPost = {
  id: string
  source: 'bluesky' | 'mastodon' | 'demo'
  author: string
  text: string
  createdAt?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
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

function SourceBadge({ source }: { source: string }) {
  const label = source === 'bluesky' ? 'Bluesky' : source === 'demo' ? 'Demo social' : source
  return <span className="px-2 py-1 rounded-full text-xs font-bold border border-black/20 dark:border-white/20">{label}</span>
}

export default function RedditPage() {
  const [symbolInput, setSymbolInput] = useState('AAPL')
  const [symbol, setSymbol] = useState('AAPL')
  const [summary, setSummary] = useState<SentimentSummary | null>(null)
  const [posts, setPosts] = useState<RedditPost[]>([])
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([])
  const [redditBanner, setRedditBanner] = useState('')
  const [socialBanner, setSocialBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPosts = useMemo(() => posts.length + socialPosts.length, [posts.length, socialPosts.length])

  async function loadData(nextSymbol: string) {
    setLoading(true)
    setError(null)
    try {
      const [redditRes, socialRes] = await Promise.all([
        fetch(`/api/reddit?symbol=${encodeURIComponent(nextSymbol)}`),
        fetch(`/api/social?symbol=${encodeURIComponent(nextSymbol)}`),
      ])

      if (!redditRes.ok) throw new Error(`Reddit sentiment failed (${redditRes.status})`)
      if (!socialRes.ok) throw new Error(`Social sentiment failed (${socialRes.status})`)

      const redditData = await redditRes.json()
      const socialData = await socialRes.json()

      setSummary(redditData.summary)
      setPosts(redditData.posts ?? [])
      setSocialPosts(socialData.posts ?? [])
      setRedditBanner(redditData.banner ?? '')
      setSocialBanner(socialData.banner ?? '')
      setSymbol(nextSymbol)
    } catch (e) {
      console.error(e)
      setError('Could not load sentiment data right now.')
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
            <h1 className="text-4xl font-extrabold">Reddit + Social Sentiment</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mt-2">
              Demo sentiment for <span className="font-bold underline">{symbol}</span>, with a free social-source experiment added on top.
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

        {redditBanner && (
          <div className="p-3 rounded-xl border border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            {redditBanner}
          </div>
        )}
        {socialBanner && (
          <div className="p-3 rounded-xl border border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/20 dark:text-sky-200">
            {socialBanner}
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
          <p className="text-sm text-gray-700 dark:text-gray-300">Based on local Reddit demo posts for consistent capstone demos.</p>
          {summary && (
            <div className="space-y-4">
              <SentimentBar label="Positive" value={summary.positive} tone="bg-emerald-500" />
              <SentimentBar label="Neutral" value={summary.neutral} tone="bg-gray-500" />
              <SentimentBar label="Negative" value={summary.negative} tone="bg-rose-500" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-black/15 dark:border-white/15 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Reddit posts</div>
              <div className="text-2xl font-extrabold">{posts.length}</div>
            </div>
            <div className="rounded-xl border border-black/15 dark:border-white/15 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500">Total social items</div>
              <div className="text-2xl font-extrabold">{totalPosts}</div>
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold">What people are saying about {symbol}</h2>
            <SourceBadge source="demo" />
          </div>
          <div className="space-y-4">
            {posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-black/15 dark:border-white/15 p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl font-extrabold leading-tight">{post.title}</h3>
                  <span className="text-xs uppercase font-bold rounded-full px-3 py-1 border border-black/15 dark:border-white/15">
                    {post.sentiment ?? 'neutral'}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  r/{post.subreddit} • u/{post.author} • score {post.score} • {post.comments} comments • {formatDate(post.createdAt)}
                </div>
                {post.body && <p className="text-base text-gray-800 dark:text-gray-200">{post.body}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold">Free social-source experiment</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              This section tries a free public social source first, then falls back to demo posts so the page still works.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <SourceBadge source={socialPosts[0]?.source ?? 'demo'} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {socialPosts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-black/15 dark:border-white/15 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <SourceBadge source={post.source} />
                <span className="text-xs uppercase font-bold rounded-full px-2 py-1 border border-black/15 dark:border-white/15">
                  {post.sentiment ?? 'neutral'}
                </span>
              </div>
              <div className="font-bold">@{post.author}</div>
              <p className="text-sm text-gray-800 dark:text-gray-200">{post.text}</p>
              <div className="text-xs text-gray-500">{formatDate(post.createdAt)}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
