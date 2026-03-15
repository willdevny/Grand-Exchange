// lib/news/googleNews.ts
import { XMLParser } from "fast-xml-parser";

export type NewsItem = {
    title: string;
    link: string;
    source?: string;
    publishedAt?: string;
};

export async function fetchGoogleNewsRSS(query: string, limit = 5): Promise<NewsItem[]> {
    const q = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(url, {
        headers: { "User-Agent": "GrandExchangeBot/1.0" },
        // avoid caching during dev
        cache: "no-store",
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(xml);

    const items = data?.rss?.channel?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];

    return arr.slice(0, limit).map((it: any) => ({
        title: it.title,
        link: it.link,
        source: it.source?.["#text"] ?? it.source,
        publishedAt: it.pubDate,
    }));
}