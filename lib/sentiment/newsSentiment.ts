import type {
    ArticleSentimentDetails,
    NewsItem,
} from '@/lib/news/googleNews'

export type NewsSentimentSummary = {
    score: number
    keywordBalanceScore: number
    positives: number
    negatives: number
    neutral: number
    total: number
    positiveKeywords: number
    negativeKeywords: number
    articlesAnalyzed: number
    headlinesOnly: number
}

const POSITIVE_KEYWORDS = [
    'beat',
    'beats',
    'beats estimates',
    'surge',
    'surges',
    'rise',
    'rises',
    'gain',
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
    'demand',
    'demand growth',
    'margin expansion',
    'cash flow',
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
    'layoffs',
    'debt',
    'cash burn',
    'missed expectations',
]

function escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countKeywordOccurrences(text: string, keyword: string): number {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi')
    const matches = text.match(pattern)
    return matches ? matches.length : 0
}

export function analyzeSentimentText(
    rawText: string,
    usedFullArticle: boolean
): ArticleSentimentDetails {
    const text = rawText.toLowerCase()

    let positiveKeywordHits = 0
    let negativeKeywordHits = 0
    const matchedPositiveKeywords = new Set<string>()
    const matchedNegativeKeywords = new Set<string>()

    for (const keyword of POSITIVE_KEYWORDS) {
        const count = countKeywordOccurrences(text, keyword)
        if (count > 0) {
            positiveKeywordHits += count
            matchedPositiveKeywords.add(keyword)
        }
    }

    for (const keyword of NEGATIVE_KEYWORDS) {
        const count = countKeywordOccurrences(text, keyword)
        if (count > 0) {
            negativeKeywordHits += count
            matchedNegativeKeywords.add(keyword)
        }
    }

    const totalHits = positiveKeywordHits + negativeKeywordHits
    const rawScore =
        totalHits === 0
            ? 0
            : (positiveKeywordHits - negativeKeywordHits) / totalHits

    let label: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (rawScore >= 0.15) label = 'positive'
    else if (rawScore <= -0.15) label = 'negative'

    return {
        score: Number(rawScore.toFixed(4)),
        label,
        positiveKeywordHits,
        negativeKeywordHits,
        matchedPositiveKeywords: [...matchedPositiveKeywords],
        matchedNegativeKeywords: [...matchedNegativeKeywords],
        usedFullArticle,
    }
}

export function attachArticleSentiment(items: NewsItem[]): NewsItem[] {
    return items.map((item) => {
        const hasFullArticle =
            typeof item.articleText === 'string' && item.articleText.length >= 250

        const textToScore = hasFullArticle
            ? item.articleText!
            : `${item.title} ${item.description ?? ''}`

        return {
            ...item,
            articleSentiment: analyzeSentimentText(textToScore, hasFullArticle),
        }
    })
}

export function scoreNewsSentiment(items: NewsItem[]): NewsSentimentSummary {
    let positives = 0
    let negatives = 0
    let neutral = 0
    let positiveKeywords = 0
    let negativeKeywords = 0
    let totalScore = 0
    let articlesAnalyzed = 0
    let headlinesOnly = 0

    for (const item of items) {
        const sentiment = item.articleSentiment
        if (!sentiment) continue

        totalScore += sentiment.score
        positiveKeywords += sentiment.positiveKeywordHits
        negativeKeywords += sentiment.negativeKeywordHits

        if (sentiment.label === 'positive') positives++
        else if (sentiment.label === 'negative') negatives++
        else neutral++

        if (sentiment.usedFullArticle) articlesAnalyzed++
        else headlinesOnly++
    }

    const total = items.length

    const articleAverageScore = total > 0 ? totalScore / total : 0

    const keywordBalanceScore =
        positiveKeywords + negativeKeywords > 0
            ? (positiveKeywords - negativeKeywords) /
            (positiveKeywords + negativeKeywords)
            : 0

    return {
        score: Number(articleAverageScore.toFixed(4)),
        keywordBalanceScore: Number(keywordBalanceScore.toFixed(4)),
        positives,
        negatives,
        neutral,
        total,
        positiveKeywords,
        negativeKeywords,
        articlesAnalyzed,
        headlinesOnly,
    }
}