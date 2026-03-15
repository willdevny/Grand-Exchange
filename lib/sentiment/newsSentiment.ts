import type { NewsItem } from '@/lib/news/googleNews'

export type NewsSentimentSummary = {
    score: number
    positives: number
    negatives: number
    neutral: number
    total: number
    positiveKeywords: number
    negativeKeywords: number
}

const POSITIVE_KEYWORDS = [
    'beat',
    'beats',
    'beats estimates',
    'surge',
    'surges',
    'rise',
    'rises',
    'gains',
    'growth',
    'strong',
    'stronger',
    'upgrade',
    'upgrades',
    'bullish',
    'profit',
    'profits',
    'record',
    'record high',
    'partnership',
    'approval',
    'outperform',
    'buy rating',
    'raises guidance',
    'raised guidance',
    'expands',
    'expansion',
    'rebound',
    'momentum',
    'tailwind',
]

const NEGATIVE_KEYWORDS = [
    'miss',
    'misses',
    'drop',
    'drops',
    'fall',
    'falls',
    'decline',
    'declines',
    'downgrade',
    'downgrades',
    'bearish',
    'lawsuit',
    'probe',
    'investigation',
    'fraud',
    'recall',
    'cuts guidance',
    'cut guidance',
    'warning',
    'sell-off',
    'loss',
    'losses',
    'delay',
    'delays',
    'postpone',
    'postpones',
    'pressure',
    'regulatory pressure',
    'weak',
    'slump',
    'headwinds',
    'antitrust',
    'tariff',
]

export function scoreNewsSentiment(
    items: NewsItem[]
): NewsSentimentSummary {
    let positives = 0
    let negatives = 0
    let neutral = 0
    let positiveKeywords = 0
    let negativeKeywords = 0

    for (const item of items) {
        const text = `${item.title} ${item.description ?? ''}`.toLowerCase()

        let posHits = 0
        let negHits = 0

        for (const keyword of POSITIVE_KEYWORDS) {
            if (text.includes(keyword)) posHits++
        }

        for (const keyword of NEGATIVE_KEYWORDS) {
            if (text.includes(keyword)) negHits++
        }

        positiveKeywords += posHits
        negativeKeywords += negHits

        if (posHits > negHits) {
            positives++
        } else if (negHits > posHits) {
            negatives++
        } else {
            neutral++
        }
    }

    const total = items.length
    const score = total > 0 ? (positives - negatives) / total : 0

    return {
        score,
        positives,
        negatives,
        neutral,
        total,
        positiveKeywords,
        negativeKeywords,
    }
}