import type { PriceBar } from '@/lib/market_historicalPrices'

export type IndicatorSnapshot = {
  barsAnalyzed: number
  latestClose: number | null
  latestDate: string | null
  change1D: number | null
  return5D: number | null
  return20D: number | null
  sma20: number | null
  sma50: number | null
  ema12: number | null
  ema26: number | null
  rsi14: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  avgVolume20: number | null
  latestVolume: number | null
  volumeVsAvg20: number | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  return average(values.slice(-period))
}

function ema(values: number[], period: number): number | null {
  if (values.length < period) return null

  const multiplier = 2 / (period + 1)
  let current = average(values.slice(0, period)) as number

  for (let i = period; i < values.length; i += 1) {
    current = (values[i] - current) * multiplier + current
  }

  return current
}

function pctChange(current: number, previous: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0
  }
  return ((current - previous) / previous) * 100
}

function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1]
    if (delta >= 0) gains += delta
    else losses += Math.abs(delta)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1]
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? Math.abs(delta) : 0
    avgGain = ((avgGain * (period - 1)) + gain) / period
    avgLoss = ((avgLoss * (period - 1)) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

export function calculateIndicators(bars: PriceBar[]): IndicatorSnapshot {
  const closes = bars.map((bar) => bar.close)
  const volumes = bars.map((bar) => bar.volume)
  const latest = bars.at(-1) ?? null
  const previous = bars.at(-2) ?? null

  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  const macd = ema12 !== null && ema26 !== null ? ema12 - ema26 : null

  const macdSeries: number[] = []
  for (let i = 26; i <= closes.length; i += 1) {
    const partial = closes.slice(0, i)
    const shortEma = ema(partial, 12)
    const longEma = ema(partial, 26)
    if (shortEma !== null && longEma !== null) {
      macdSeries.push(shortEma - longEma)
    }
  }

  const macdSignal = macdSeries.length >= 9 ? ema(macdSeries, 9) : null
  const avgVolume20 = volumes.length >= 20 ? average(volumes.slice(-20)) : average(volumes)

  return {
    barsAnalyzed: bars.length,
    latestClose: latest?.close ?? null,
    latestDate: latest?.date ?? null,
    change1D: latest && previous ? pctChange(latest.close, previous.close) : null,
    return5D: closes.length >= 6 ? pctChange(closes.at(-1) as number, closes.at(-6) as number) : null,
    return20D: closes.length >= 21 ? pctChange(closes.at(-1) as number, closes.at(-21) as number) : null,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    ema12,
    ema26,
    rsi14: rsi(closes, 14),
    macd,
    macdSignal,
    macdHistogram: macd !== null && macdSignal !== null ? macd - macdSignal : null,
    avgVolume20,
    latestVolume: latest?.volume ?? null,
    volumeVsAvg20: latest && avgVolume20 && avgVolume20 !== 0 ? latest.volume / avgVolume20 : null,
  }
}
