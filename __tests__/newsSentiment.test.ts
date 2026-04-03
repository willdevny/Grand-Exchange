import { scoreNewsSentiment } from '@/lib/sentiment/newsSentiment'
import type { NewsItem } from '@/lib/news/googleNews'

describe('scoreNewsSentiment', () => {
  it('scores positive headlines correctly', () => {
    const items: NewsItem[] = [
      { title: 'Apple beats estimates with strong growth', link: 'a' },
    ]
    const result = scoreNewsSentiment(items)
    expect(result.positives).toBe(1)
    expect(result.negatives).toBe(0)
    expect(result.score).toBe(1)
    expect(result.positiveKeywords).toBeGreaterThan(0)
  })

  it('scores negative headlines correctly', () => {
    const items: NewsItem[] = [
      { title: 'Apple faces antitrust lawsuit and weak demand', link: 'a' },
    ]
    const result = scoreNewsSentiment(items)
    expect(result.positives).toBe(0)
    expect(result.negatives).toBe(1)
    expect(result.score).toBe(-1)
    expect(result.negativeKeywords).toBeGreaterThan(0)
  })

  it('returns neutral when positive and negative hits tie', () => {
    const items: NewsItem[] = [
      { title: 'Apple growth offset by lawsuit', link: 'a' },
    ]
    const result = scoreNewsSentiment(items)
    expect(result.neutral).toBe(1)
    expect(result.score).toBe(0)
  })

  it('uses description text in addition to title', () => {
    const items: NewsItem[] = [
      { title: 'Apple update', description: 'record high and bullish outlook', link: 'a' },
    ]
    const result = scoreNewsSentiment(items)
    expect(result.positives).toBe(1)
    expect(result.positiveKeywords).toBeGreaterThanOrEqual(2)
  })

  it('aggregates mixed news across multiple items', () => {
    const items: NewsItem[] = [
      { title: 'Apple beats estimates', link: '1' },
      { title: 'Apple hit with downgrade', link: '2' },
      { title: 'Apple hosts developer event', link: '3' },
    ]
    const result = scoreNewsSentiment(items)
    expect(result.total).toBe(3)
    expect(result.positives).toBe(1)
    expect(result.negatives).toBe(1)
    expect(result.neutral).toBe(1)
    expect(result.score).toBe(0)
  })

  it('returns zeroed summary for empty news', () => {
    const result = scoreNewsSentiment([])
    expect(result).toEqual({
      score: 0,
      positives: 0,
      negatives: 0,
      neutral: 0,
      total: 0,
      positiveKeywords: 0,
      negativeKeywords: 0,
    })
  })
})
