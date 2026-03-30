import { NextResponse } from 'next/server'
import { fetchHistoricalPrices } from '@/lib/market_historicalPrices'

function makeMockSeries(symbol: string, days: number) {
  const seed = symbol.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  let price = 80 + (seed % 120)
  const data: Array<{ date: string; close: number }> = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - i)
    const day = date.getUTCDay()
    if (day === 0 || day === 6) continue
    const drift = Math.sin((days - i) / 8) * 1.8
    const noise = ((seed + i * 17) % 7) - 3
    price = Math.max(10, price + drift + noise * 0.35)
    data.push({ date: date.toISOString().slice(0, 10), close: Number(price.toFixed(2)) })
  }

  return data
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params
  const upper = symbol.toUpperCase()
  const bars = await fetchHistoricalPrices(upper, 'D', 182)

  if (bars.length > 0) {
    return NextResponse.json({ symbol: upper, source: 'finnhub', data: bars.map(({ date, close }) => ({ date, close })) })
  }

  return NextResponse.json({
    symbol: upper,
    source: 'mock-demo',
    note: 'Using generated demo prices because no live stock API key was found.',
    data: makeMockSeries(upper, 182),
  })
}
