/**
 * @jest-environment node
 */

import { POST } from '@/app/api/agent/context/route'

jest.mock('@/lib/news/googleNews', () => ({
  fetchGoogleNewsRSS: jest.fn(),
}))

jest.mock('@/lib/sentiment/newsSentiment', () => ({
  scoreNewsSentiment: jest.fn(),
}))

const { fetchGoogleNewsRSS } = jest.requireMock('@/lib/news/googleNews') as {
  fetchGoogleNewsRSS: jest.Mock
}
const { scoreNewsSentiment } = jest.requireMock('@/lib/sentiment/newsSentiment') as {
  scoreNewsSentiment: jest.Mock
}

describe('POST /api/agent/context', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ latestClose: 123.45 }),
      text: async () => '',
    }) as jest.Mock
  })

  it('returns 400 when query is missing', async () => {
    const req = new Request('http://localhost/api/agent/context', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns aggregated response for a valid ticker query', async () => {
    fetchGoogleNewsRSS.mockResolvedValue([{ title: 'Apple beats estimates', link: 'x' }])
    scoreNewsSentiment.mockReturnValue({
      score: 1,
      positives: 1,
      negatives: 0,
      neutral: 0,
      total: 1,
      positiveKeywords: 2,
      negativeKeywords: 0,
    })

    const req = new Request('http://localhost/api/agent/context', {
      method: 'POST',
      body: JSON.stringify({ query: 'AAPL' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(fetchGoogleNewsRSS).toHaveBeenCalledWith('AAPL', 5)
    expect(json.ticker).toBe('AAPL')
    expect(json.marketData).toEqual({ latestClose: 123.45 })
  })

  it('uses uppercase ticker match when embedded in query', async () => {
    fetchGoogleNewsRSS.mockResolvedValue([])
    scoreNewsSentiment.mockReturnValue({
      score: 0,
      positives: 0,
      negatives: 0,
      neutral: 0,
      total: 0,
      positiveKeywords: 0,
      negativeKeywords: 0,
    })

    const req = new Request('http://localhost/api/agent/context', {
      method: 'POST',
      body: JSON.stringify({ query: 'Please analyze AAPL today' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()
    expect(json.ticker).toBe('AAPL')
  })

  it('falls back to trimmed input when no uppercase ticker is found', async () => {
    fetchGoogleNewsRSS.mockResolvedValue([])
    scoreNewsSentiment.mockReturnValue({
      score: 0,
      positives: 0,
      negatives: 0,
      neutral: 0,
      total: 0,
      positiveKeywords: 0,
      negativeKeywords: 0,
    })

    const req = new Request('http://localhost/api/agent/context', {
      method: 'POST',
      body: JSON.stringify({ query: 'apple' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()
    expect(json.ticker).toBe('apple')
  })

  it('survives market data fetch failure with null fallback', async () => {
    fetchGoogleNewsRSS.mockResolvedValue([])
    scoreNewsSentiment.mockReturnValue({
      score: 0,
      positives: 0,
      negatives: 0,
      neutral: 0,
      total: 0,
      positiveKeywords: 0,
      negativeKeywords: 0,
    })
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as jest.Mock

    const req = new Request('http://localhost/api/agent/context', {
      method: 'POST',
      body: JSON.stringify({ query: 'AAPL' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.marketData).toBeNull()
  })
})
