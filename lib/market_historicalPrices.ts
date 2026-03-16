export type PriceBar = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function unixToDateString(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

export async function fetchHistoricalPrices(symbol: string, resolution = 'D', count = 90): Promise<PriceBar[]> {
  const finnhubKey = process.env.FINNHUB_API_KEY

  if (!finnhubKey) {
    console.warn('Missing FINNHUB_API_KEY for historical prices')
    return []
  }

  const now = Math.floor(Date.now() / 1000)
  const lookbackSeconds = Math.max(count, 90) * 24 * 60 * 60
  const from = now - lookbackSeconds

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(
    symbol
  )}&resolution=${encodeURIComponent(resolution)}&from=${from}&to=${now}&token=${encodeURIComponent(finnhubKey)}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('Finnhub historical price request failed:', res.status, body)
      return []
    }

    const data = (await res.json()) as {
      s?: string
      t?: number[]
      o?: number[]
      h?: number[]
      l?: number[]
      c?: number[]
      v?: number[]
    }

    if (data.s !== 'ok' || !Array.isArray(data.t)) {
      return []
    }

    const bars: PriceBar[] = data.t.map((timestamp, index) => ({
      date: unixToDateString(timestamp),
      open: Number(data.o?.[index] ?? 0),
      high: Number(data.h?.[index] ?? 0),
      low: Number(data.l?.[index] ?? 0),
      close: Number(data.c?.[index] ?? 0),
      volume: Number(data.v?.[index] ?? 0),
    }))
    .filter((bar) => Number.isFinite(bar.close) && bar.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

    return bars.slice(-count)
  } catch (error) {
    console.error('Failed to fetch historical prices:', error)
    return []
  }
}
