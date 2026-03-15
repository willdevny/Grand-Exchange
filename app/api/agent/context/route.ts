// app/api/agent/context/route.ts
import { NextResponse } from "next/server";
import { fetchGoogleNewsRSS } from "@/lib/news/googleNews";
import { fetchRedditMentions } from "@/lib/reddit/redditClient";
import { scoreSentiment } from "@/lib/sentiment/basicSentiment";

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? "").trim();

    if (!query) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // naive ticker extraction: can improve this later if needed
    const tickerMatch = query.match(/\b[A-Z]{1,5}\b/);
    const ticker = tickerMatch?.[0] ?? query;

    const [news, reddit] = await Promise.all([
        fetchGoogleNewsRSS(ticker, 5),
        fetchRedditMentions(ticker, 25),
    ]);

    const redditTexts = reddit.map(r => r.text);
    const redditSentiment = scoreSentiment(redditTexts);

    return NextResponse.json({
        ticker,
        news,
        reddit: {
            mentions: reddit.slice(0, 10),
            sentiment: redditSentiment,
        },
    });
}