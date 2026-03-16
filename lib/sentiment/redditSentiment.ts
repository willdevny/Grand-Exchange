import type { RedditMention } from '@/lib/reddit/redditClient'

export type RedditSentimentSummary = {
    score: number
    positives: number
    negatives: number
    neutral: number
    total: number
    positiveKeywords: number
    negativeKeywords: number
}

const POSITIVE_KEYWORDS = [
    'bull',
    'bullish',
    'buy',
    'long',
    'moon',
    'undervalued',
    'strong',
    'beat',
    'beats',
    'growth',
    'upside',
    'rebound',
    'momentum',
    'outperform',
    'accumulate',
]

const NEGATIVE_KEYWORDS = [
    'bear',
    'bearish',
    'sell',
    'short',
    'overvalued',
    'weak',
    'miss',
    'misses',
    'downside',
    'dump',
    'fraud',
    'lawsuit',
    'decline',
    'cuts guidance',
    'warning',
]

export function scoreRedditSentiment(
    mentions: RedditMention[]
): RedditSentimentSummary {
    let positives = 0
    let negatives = 0
    let neutral = 0
    let positiveKeywords = 0
    let negativeKeywords = 0

    for (const mention of mentions) {
        const text = mention.text.toLowerCase()

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

    const total = mentions.length
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