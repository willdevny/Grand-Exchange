'use client'

import { useEffect, useMemo, useState } from 'react'

type Quote = {
  symbol: string
  price: number | null
  changePercent: number | null
}

type NewsItem = {
  title: string
  url: string
  source?: string
  publishedAt?: string
  description?: string
}

export default function TwitterStocksPage() {
  const [symbols, setSymbols] = useState<string[]>(['AAPL', 'TSLA', 'NVDA'])
  const [input, setInput] = useState('')
  const [selected, setSelected] = useState<string>('AAPL')
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const symbolsParam = useMemo(() => symbols.join(','), [symbols])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/twitter?symbols=${encodeURIComponent(symbolsParam)}&newsSymbol=${encodeURIComponent(selected)}`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      const nextQuotes: Record<string, Quote> = {}
      for (const q of data.quotes as Quote[]) nextQuotes[q.symbol] = q
      setQuotes(nextQuotes)
      setNews((data.news ?? []) as NewsItem[])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsParam, selected])

  function addSymbol() {
    const s = input.trim().toUpperCase()
    if (!s) return
    if (!/^[A-Z\.\-]{1,10}$/.test(s)) {
      setError('Symbol looks invalid. Use letters/numbers like AAPL or BRK.B')
      return
    }
    if (!symbols.includes(s)) {
      const next = [...symbols, s]
      setSymbols(next)
    }
    setSelected(s)
    setInput('')
  }

  function removeSymbol(s: string) {
    const next = symbols.filter(x => x !== s)
    setSymbols(next.length ? next : ['AAPL'])
    if (selected === s) setSelected(next[0] ?? 'AAPL')
  }

  return (
    <div className="space-y-10">
      <section className="card p-8 space-y-4">
        <h1 className="text-4xl font-extrabold">X/Twitter Stocks (Live)</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          This page pulls live quotes + headlines from external APIs (no live X feed).
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold mb-1">Add ticker</label>
            <input
              className="w-full px-4 py-2 rounded-lg border border-black/20 dark:border-white/20 bg-white dark:bg-gray-900"
              placeholder="e.g., MSFT"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSymbol() }}
            />
          </div>
          <button
            className="px-5 py-2 rounded-lg border-2 border-black bg-sky-500 text-white font-bold hover:brightness-110 transition"
            onClick={addSymbol}
          >
            Add
          </button>
          <button
            className="px-5 py-2 rounded-lg border-2 border-black bg-white dark:bg-gray-900 font-bold hover:brightness-110 transition"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30">
            {error}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-1 space-y-3">
          <h2 className="text-2xl font-extrabold">Watchlist</h2>

          <div className="space-y-2">
            {symbols.map((s) => {
              const q = quotes[s]
              const isSel = s === selected
              return (
                <div key={s} className={`flex items-center justify-between p-3 rounded-xl border ${isSel ? 'border-black bg-black/5 dark:bg-white/5' : 'border-black/20 dark:border-white/20'}`}>
                  <button className="text-left flex-1" onClick={() => setSelected(s)}>
                    <div className="font-extrabold">{s}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {q ? (
                        <>
                          ${q.price ?? '—'}{' '}
                          <span className="opacity-80">
                            ({q.changePercent == null ? '—' : `${q.changePercent.toFixed(2)}%`})
                          </span>
                        </>
                      ) : (
                        'Loading…'
                      )}
                    </div>
                  </button>
                  <button
                    className="ml-3 px-3 py-1 rounded-lg border border-black/30 dark:border-white/30 text-sm font-bold hover:brightness-110"
                    onClick={() => removeSymbol(s)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-extrabold">Latest headlines for <span className="underline">{selected}</span></h2>

          <div className="space-y-3">
            {news.length === 0 && (
              <div className="text-gray-700 dark:text-gray-300">No headlines returned.</div>
            )}
            {news.map((n, idx) => (
              <a
                key={idx}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block p-4 rounded-xl border border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                <div className="font-extrabold text-lg">{n.title}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {(n.source ? `${n.source} • ` : '')}{n.publishedAt ?? ''}
                </div>
                {n.description && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    {n.description}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
