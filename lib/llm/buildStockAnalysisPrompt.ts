type NewsSentiment = {
    score?: number
    keywordBalanceScore?: number
    positives?: number
    negatives?: number
    neutral?: number
    total?: number
    positiveKeywords?: number
    negativeKeywords?: number
    articlesAnalyzed?: number
    headlinesOnly?: number
}

type SocialSentiment = {
    score?: number
    keywordBalanceScore?: number
    positives?: number
    negatives?: number
    neutral?: number
    total?: number
    positiveKeywords?: number
    negativeKeywords?: number
}

type HistoricalPricePoint = {
    date: string
    close: number
    volume: number
}

type MarketData = {
    latestClose?: number | null
    sma20?: number | null
    sma50?: number | null
    rsi14?: number | null
    volatility30?: number | null
    trend?: string
    recentPrices?: HistoricalPricePoint[]
}

type NewsItem = {
    title?: string
    source?: string
    publishedAt?: string
    articleSentiment?: {
        label?: 'positive' | 'negative' | 'neutral'
        score?: number
        positiveKeywordHits?: number
        negativeKeywordHits?: number
        matchedPositiveKeywords?: string[]
        matchedNegativeKeywords?: string[]
        usedFullArticle?: boolean
    }
}

type BuildPromptInput = {
    ticker: string
    companyName?: string
    displayName?: string
    matchedBy?: string
    marketData?: MarketData | null
    newsSentiment?: NewsSentiment
    socialSentiment?: SocialSentiment
    news?: NewsItem[]
}

export function buildStockAnalysisPrompt({
                                             ticker,
                                             companyName,
                                             displayName,
                                             matchedBy,
                                             marketData,
                                             newsSentiment,
                                             socialSentiment,
                                             news = [],
                                         }: BuildPromptInput): string {
    const topNews = news.slice(0, 5).map((item, index) => {
        return [
            `Article ${index + 1}:`,
            `- Title: ${item.title ?? 'N/A'}`,
            `- Source: ${item.source ?? 'N/A'}`,
            `- Published: ${item.publishedAt ?? 'N/A'}`,
            `- Sentiment label: ${item.articleSentiment?.label ?? 'N/A'}`,
            `- Sentiment score: ${
                typeof item.articleSentiment?.score === 'number'
                    ? item.articleSentiment.score.toFixed(2)
                    : 'N/A'
            }`,
            `- Full article used: ${
                item.articleSentiment?.usedFullArticle === true ? 'yes' : 'no'
            }`,
            `- Positive keyword hits: ${item.articleSentiment?.positiveKeywordHits ?? 0}`,
            `- Negative keyword hits: ${item.articleSentiment?.negativeKeywordHits ?? 0}`,
        ].join('\n')
    })

    return `
You are a cautious stock analysis assistant.

Your job is to write a structured stock analysis report using only the supplied data.
Do not fabricate missing values.
Do not claim certainty.
Do not provide personalized financial advice.
If data is incomplete, say so explicitly.
Separate factual observations from inference.

Stock identity:
- Display name: ${displayName ?? ticker}
- Ticker: ${ticker}
- Company name: ${companyName ?? ticker}
- Match type: ${matchedBy ?? 'unknown'}

Market indicator data:
- Latest close: ${marketData?.latestClose ?? 'N/A'}
- SMA 20: ${marketData?.sma20 ?? 'N/A'}
- SMA 50: ${marketData?.sma50 ?? 'N/A'}
- RSI 14: ${marketData?.rsi14 ?? 'N/A'}
- 30-day volatility: ${marketData?.volatility30 ?? 'N/A'}
- Trend: ${marketData?.trend ?? 'N/A'}

News sentiment summary:
- Article-average score: ${newsSentiment?.score ?? 'N/A'}
- Keyword-balance score: ${newsSentiment?.keywordBalanceScore ?? 'N/A'}
- Positive articles: ${newsSentiment?.positives ?? 0}
- Negative articles: ${newsSentiment?.negatives ?? 0}
- Neutral articles: ${newsSentiment?.neutral ?? 0}
- Positive keyword hits: ${newsSentiment?.positiveKeywords ?? 0}
- Negative keyword hits: ${newsSentiment?.negativeKeywords ?? 0}
- Full articles analyzed: ${newsSentiment?.articlesAnalyzed ?? 0}
- Headline-only fallbacks: ${newsSentiment?.headlinesOnly ?? 0}

Social sentiment summary:
- Post-average score: ${socialSentiment?.score ?? 'N/A'}
- Keyword-balance score: ${socialSentiment?.keywordBalanceScore ?? 'N/A'}
- Positive posts: ${socialSentiment?.positives ?? 0}
- Negative posts: ${socialSentiment?.negatives ?? 0}
- Neutral posts: ${socialSentiment?.neutral ?? 0}
- Positive keyword hits: ${socialSentiment?.positiveKeywords ?? 0}
- Negative keyword hits: ${socialSentiment?.negativeKeywords ?? 0}
- Total posts analyzed: ${socialSentiment?.total ?? 0}

Top news items:
${topNews.length > 0 ? topNews.join('\n\n') : 'No news items available.'}

Write the response with these exact section headings:
1. Overview
2. Technical Signals
3. News Sentiment
4. Social Sentiment
5. Overall Interpretation
6. Short-Term Trend Prediction

In the final section, include:
- Direction: Bullish, Bearish, or Neutral
- Confidence: Low, Medium, or High
- A short reason based only on the supplied data
`.trim()
}