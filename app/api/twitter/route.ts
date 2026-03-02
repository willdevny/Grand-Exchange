import { NextResponse } from 'next/server'

type Quote = {
  symbol: string
  price: number | null
  changePercent: number | null
}

function asNumber(x: any): number | null {
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const symbolsParam = url.searchParams.get('symbols') ?? 'AAPL,TSLA,NVDA'
  const newsSymbol = (url.searchParams.get('newsSymbol') ?? 'AAPL').toUpperCase()

  const symbols = symbolsParam
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20)

  const fmpKey = process.env.FMP_API_KEY
  const newsKey = process.env.NEWSAPI_KEY

  if (!fmpKey) {
    return NextResponse.json({ error: 'Missing FMP_API_KEY in .env.local' }, { status: 500 })
  }
  if (!newsKey) {
    return NextResponse.json({ error: 'Missing NEWSAPI_KEY in .env.local' }, { status: 500 })
  }

  // Quotes via Financial Modeling Prep
  // https://financialmodelingprep.com/developer/docs/
  const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbols.join(','))}?apikey=${encodeURIComponent(fmpKey)}`
  const quoteRes = await fetch(quoteUrl, { next: { revalidate: 30 } })
  if (!quoteRes.ok) {
    return NextResponse.json({ error: `FMP quote request failed (${quoteRes.status})` }, { status: 502 })
  }
  const quoteJson = await quoteRes.json()

  const quotes: Quote[] = (Array.isArray(quoteJson) ? quoteJson : []).map((q: any) => ({
    symbol: String(q.symbol ?? '').toUpperCase(),
    price: asNumber(q.price),
    changePercent: asNumber(q.changesPercentage),
  }))

  // News via NewsAPI
  // Use "everything" so the demo works with keyword/ticker searches.
  const newsQ = `${newsSymbol} stock OR ${newsSymbol} shares OR ${newsSymbol} earnings`
  const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQ)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${encodeURIComponent(newsKey)}`
  const newsRes = await fetch(newsUrl, { next: { revalidate: 60 } })
  if (!newsRes.ok) {
    return NextResponse.json({ error: `NewsAPI request failed (${newsRes.status})` }, { status: 502 })
  }
  const newsJson = await newsRes.json()

  const news = (newsJson?.articles ?? []).slice(0, 10).map((a: any) => ({
    title: String(a.title ?? ''),
    url: String(a.url ?? ''),
    source: String(a.source?.name ?? ''),
    publishedAt: String(a.publishedAt ?? ''),
    description: String(a.description ?? ''),
  }))

  return NextResponse.json({ quotes, news })
}
