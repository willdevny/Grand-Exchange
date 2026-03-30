import { analyzeSentimentText } from '@/lib/sentiment/newsSentiment'
import type { BlueskyAgentPost } from '@/lib/social/blueskyAgent'

export type SocialSentimentSummary = {
    score: number
    keywordBalanceScore: number
    positives: number
    negatives: number
    neutral: number
    total: number
    positiveKeywords: number
    negativeKeywords: number
}

export function analyzeBlueskySentiment(
    posts: BlueskyAgentPost[]
): SocialSentimentSummary {
    let positives = 0
    let negatives = 0
    let neutral = 0
    let totalScore = 0
    let positiveKeywords = 0
    let negativeKeywords = 0

    for (const post of posts) {
        const sentiment = analyzeSentimentText(post.text, true)

        totalScore += sentiment.score
        positiveKeywords += sentiment.positiveKeywordHits
        negativeKeywords += sentiment.negativeKeywordHits

        if (sentiment.label === 'positive') positives++
        else if (sentiment.label === 'negative') negatives++
        else neutral++
    }

    const total = posts.length

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
    }
}