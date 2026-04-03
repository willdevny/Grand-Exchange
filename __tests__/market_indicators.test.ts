import { calculateIndicators } from '@/lib/market_indicators'
import type { PriceBar } from '@/lib/market_historicalPrices'

function makeBars(closes: number[], volumes?: number[]): PriceBar[] {
  return closes.map((close, index) => ({
    date: `2025-01-${String(index + 1).padStart(2, '0')}`,
    open: close - 1,
    high: close + 1,
    low: close - 2,
    close,
    volume: volumes?.[index] ?? 1000 + index * 10,
  }))
}

describe('calculateIndicators', () => {
  it('returns null long-window indicators when insufficient bars exist', () => {
    const result = calculateIndicators(makeBars([10, 11, 12, 13, 14]))
    expect(result.sma20).toBeNull()
    expect(result.sma50).toBeNull()
    expect(result.rsi14).toBeNull()
    expect(result.macd).toBeNull()
  })

  it('calculates 1-day change correctly', () => {
    const result = calculateIndicators(makeBars([100, 110]))
    expect(result.change1D).toBeCloseTo(10)
  })

  it('calculates 5-day return correctly', () => {
    const result = calculateIndicators(makeBars([100, 101, 102, 103, 104, 110]))
    expect(result.return5D).toBeCloseTo(10)
  })

  it('calculates 20-day return correctly', () => {
    const closes = Array.from({ length: 21 }, (_, i) => 100 + i)
    const result = calculateIndicators(makeBars(closes))
    expect(result.return20D).toBeCloseTo(20)
  })

  it('calculates SMA20 correctly for sequential values', () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1)
    const result = calculateIndicators(makeBars(closes))
    expect(result.sma20).toBeCloseTo(10.5)
  })

  it('calculates SMA50 correctly for sequential values', () => {
    const closes = Array.from({ length: 50 }, (_, i) => i + 1)
    const result = calculateIndicators(makeBars(closes))
    expect(result.sma50).toBeCloseTo(25.5)
  })

  it('calculates EMA values when enough bars exist', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i)
    const result = calculateIndicators(makeBars(closes))
    expect(result.ema12).not.toBeNull()
    expect(result.ema26).not.toBeNull()
    expect((result.ema12 as number)).toBeGreaterThan(result.ema26 as number)
  })

  it('returns RSI of 100 when there are no losses', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i)
    const result = calculateIndicators(makeBars(closes))
    expect(result.rsi14).toBe(100)
  })

  it('calculates MACD, signal, and histogram when enough bars exist', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i)
    const result = calculateIndicators(makeBars(closes))
    expect(result.macd).not.toBeNull()
    expect(result.macdSignal).not.toBeNull()
    expect(result.macdHistogram).toBeCloseTo((result.macd as number) - (result.macdSignal as number))
  })

  it('calculates average volume and volume ratio', () => {
    const volumes = Array.from({ length: 20 }, () => 1000)
    volumes[19] = 2000
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i)
    const result = calculateIndicators(makeBars(closes, volumes))
    expect(result.avgVolume20).toBeCloseTo(1050)
    expect(result.volumeVsAvg20).toBeCloseTo(2000 / 1050)
  })
})
