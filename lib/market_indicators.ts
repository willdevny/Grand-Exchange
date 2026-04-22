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

function calculateMacd(ema12: number | null, ema26: number | null): number | null {
    if (ema12 === null || ema26 === null) {
        return null
    }

    return ema12 - ema26
}

function buildMacdSeries(closes: number[]): number[] {
    const macdSeries: number[] = []

    for (let i = 26; i <= closes.length; i += 1) {
        const partial = closes.slice(0, i)
        const shortEma = ema(partial, 12)
        const longEma = ema(partial, 26)

        if (shortEma !== null && longEma !== null) {
            macdSeries.push(shortEma - longEma)
        }
    }

    return macdSeries
}

function calculateMacdSignal(macdSeries: number[]): number | null {
    if (macdSeries.length < 9) {
        return null
    }

    return ema(macdSeries, 9)
}

function calculateMacdHistogram(
    macd: number | null,
    macdSignal: number | null
): number | null {
    if (macd === null || macdSignal === null) {
        return null
    }

    return macd - macdSignal
}

function calculateReturn(closes: number[], lookbackDays: number): number | null {
    const latest = closes.at(-1)
    const prior = closes.at(-(lookbackDays + 1))

    if (latest === undefined || prior === undefined) {
        return null
    }

    return pctChange(latest, prior)
}

function calculateChange1D(
    latest: PriceBar | null,
    previous: PriceBar | null
): number | null {
    if (!latest || !previous) {
        return null
    }

    return pctChange(latest.close, previous.close)
}

function calculateAverageVolume20(volumes: number[]): number | null {
    if (volumes.length >= 20) {
        return average(volumes.slice(-20))
    }

    return average(volumes)
}

function calculateVolumeVsAverage(
    latest: PriceBar | null,
    avgVolume20: number | null
): number | null {
    if (!latest || avgVolume20 === null || avgVolume20 === 0) {
        return null
    }

    return latest.volume / avgVolume20
}

export function calculateIndicators(bars: PriceBar[]): IndicatorSnapshot {
    const closes = bars.map((bar) => bar.close)
    const volumes = bars.map((bar) => bar.volume)
    const latest = bars.at(-1) ?? null
    const previous = bars.at(-2) ?? null

    const ema12 = ema(closes, 12)
    const ema26 = ema(closes, 26)
    const macd = calculateMacd(ema12, ema26)
    const macdSeries = buildMacdSeries(closes)
    const macdSignal = calculateMacdSignal(macdSeries)
    const avgVolume20 = calculateAverageVolume20(volumes)

    return {
        barsAnalyzed: bars.length,
        latestClose: latest?.close ?? null,
        latestDate: latest?.date ?? null,
        change1D: calculateChange1D(latest, previous),
        return5D: calculateReturn(closes, 5),
        return20D: calculateReturn(closes, 20),
        sma20: sma(closes, 20),
        sma50: sma(closes, 50),
        ema12,
        ema26,
        rsi14: rsi(closes, 14),
        macd,
        macdSignal,
        macdHistogram: calculateMacdHistogram(macd, macdSignal),
        avgVolume20,
        latestVolume: latest?.volume ?? null,
        volumeVsAvg20: calculateVolumeVsAverage(latest, avgVolume20),
    }
}