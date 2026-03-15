import { XMLParser } from 'fast-xml-parser'

export type NewsItem = {
    title: string
    link: string
    source?: string
    publishedAt?: string
    description?: string
}

export async function fetchGoogleNewsRSS(
    query: string,
    limit = 5
): Promise<NewsItem[]> {
    const q = encodeURIComponent(query)
    const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'GrandExchangeBot/1.0',
        },
        cache: 'no-store',
    })

    if (!res.ok) {
        throw new Error(`Google News RSS request failed with ${res.status}`)
    }

    const xml = await res.text()
    const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: true,
        trimValues: true,
    })

    const parsed = parser.parse(xml)
    const rawItems = parsed?.rss?.channel?.item ?? []
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]

    return items.slice(0, limit).map((item: Record<string, unknown>) => {
        const sourceValue = item.source
        let source: string | undefined

        if (typeof sourceValue === 'string') {
            source = sourceValue
        } else if (
            sourceValue &&
            typeof sourceValue === 'object' &&
            '#text' in sourceValue &&
            typeof (sourceValue as { ['#text']?: unknown })['#text'] === 'string'
        ) {
            source = (sourceValue as { ['#text']: string })['#text']
        }

        return {
            title: typeof item.title === 'string' ? item.title : 'Untitled article',
            link: typeof item.link === 'string' ? item.link : '',
            source,
            publishedAt: typeof item.pubDate === 'string' ? item.pubDate : undefined,
            description:
                typeof item.description === 'string' ? item.description : undefined,
        }
    })
}