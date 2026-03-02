import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const fmpKey = process.env.FMP_API_KEY;
  const newsKey = process.env.NEWSAPI_KEY;

  if (!fmpKey) {
    return NextResponse.json({ error: "Missing FMP_API_KEY in .env.local" }, { status: 500 });
  }
  if (!newsKey) {
    return NextResponse.json({ error: "Missing NEWSAPI_KEY in .env.local" }, { status: 500 });
  }

  const symbolsRaw = searchParams.get("symbols") || "AAPL,TSLA,NVDA";
  const newsSymbol = searchParams.get("newsSymbol") || "AAPL";

  const symbols = symbolsRaw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

 // --- FINNHUB quotes ---
const finnhubKey = process.env.FINNHUB_API_KEY;

if (!finnhubKey) {
  return NextResponse.json({ error: "Missing FINNHUB_API_KEY in .env.local" }, { status: 500 });
}

const quotes = await Promise.all(
  symbols.map(async (sym) => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(
      finnhubKey
    )}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        symbol: sym,
        error: `Finnhub quote failed (${res.status})`,
        details: body,
      };
    }

    const data = await res.json();
    return {
      symbol: sym,
      price: data.c,          // current price
      changePercent: data.dp, // percent change
    };
  })
);

  // --- NewsAPI ---
  const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
    newsSymbol
  )}&pageSize=10&sortBy=publishedAt&apiKey=${encodeURIComponent(newsKey)}`;

  const newsRes = await fetch(newsUrl, { cache: "no-store" });

  if (!newsRes.ok) {
    const body = await newsRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: `NewsAPI request failed (${newsRes.status})`,
        details: body,
        usedUrl: newsUrl,
        quotes,
      },
      { status: 502 }
    );
  }

  const newsJson = await newsRes.json();
  const articles = Array.isArray(newsJson?.articles) ? newsJson.articles : [];

  return NextResponse.json({
    quotes,
    news: articles.map((a: any) => ({
      headline: a.title,
      url: a.url,
      source: a.source?.name,
      publishedAt: a.publishedAt,
    })),
  });
}