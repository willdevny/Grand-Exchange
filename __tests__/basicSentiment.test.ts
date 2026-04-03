import { scoreSentiment } from '@/lib/sentiment/basicSentiment'

describe('scoreSentiment', () => {
  it('classifies bullish language as positive', () => {
    const result = scoreSentiment(['AAPL looks bullish and undervalued'])
    expect(result.positives).toBe(1)
    expect(result.negatives).toBe(0)
    expect(result.neutral).toBe(0)
    expect(result.score).toBe(1)
  })

  it('classifies bearish language as negative', () => {
    const result = scoreSentiment(['This stock looks bearish and overvalued'])
    expect(result.positives).toBe(0)
    expect(result.negatives).toBe(1)
    expect(result.neutral).toBe(0)
    expect(result.score).toBe(-1)
  })

  it('classifies mixed language as neutral', () => {
    const result = scoreSentiment(['Bullish momentum but possible fraud concerns'])
    expect(result.neutral).toBe(1)
    expect(result.score).toBe(0)
  })

  it('classifies text with no keywords as neutral', () => {
    const result = scoreSentiment(['Apple announced a new event date'])
    expect(result.neutral).toBe(1)
    expect(result.total).toBe(1)
  })

  it('aggregates multiple texts correctly', () => {
    const result = scoreSentiment([
      'Buy this stock, it looks bullish',
      'Sell now, this seems bearish',
      'No clear signal today',
    ])

    expect(result).toEqual({
      score: 0,
      positives: 1,
      negatives: 1,
      neutral: 1,
      total: 3,
    })
  })

  it('returns zero score for an empty input array', () => {
    const result = scoreSentiment([])
    expect(result.score).toBe(0)
    expect(result.total).toBe(0)
    expect(result.positives).toBe(0)
    expect(result.negatives).toBe(0)
    expect(result.neutral).toBe(0)
  })
})
