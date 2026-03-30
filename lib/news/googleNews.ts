import { XMLParser } from 'fast-xml-parser'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export type ArticleSentimentDetails = {
    score: number
    label: 'positive' | 'negative' | 'neutral'
    positiveKeywordHits: number
    negativeKeywordHits: number
    matchedPositiveKeywords: string[]
    matchedNegativeKeywords: string[]
    usedFullArticle: boolean
}

export type NewsItem = {
    title: string
    link: string
    source?: string
    publishedAt?: string
    description?: string
    articleUrl?: string
    articleText?: string
    articleTitle?: string
    articleSentiment?: ArticleSentimentDetails
}

const DEFAULT_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    timeoutMs = 12000
) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
            cache: 'no-store',
        })
    } finally {
        clearTimeout(timer)
    }
}

function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim()
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/&#34;/gi, '"')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
}

function stripHtml(html?: string): string {
    if (!html) return ''
    return normalizeWhitespace(
        decodeHtmlEntities(
            html
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
        )
    )
}

function extractPublisherUrlFromDescription(description?: string): string | undefined {
    if (!description) return undefined

    const hrefMatches = [
        ...description.matchAll(/href="([^"]+)"/gi),
        ...description.matchAll(/href='([^']+)'/gi),
    ]

    for (const match of hrefMatches) {
        const url = match[1]
        if (
            url &&
            /^https?:\/\//i.test(url) &&
            !url.includes('news.google.com')
        ) {
            return url
        }
    }

    const plainTextUrlMatch = description.match(/https?:\/\/[^\s"'<>]+/i)
    if (
        plainTextUrlMatch?.[0] &&
        !plainTextUrlMatch[0].includes('news.google.com')
    ) {
        return plainTextUrlMatch[0]
    }

    return undefined
}

async function resolveGoogleNewsRssArticleUrl(
    googleRssUrl: string
): Promise<string | undefined> {
    try {
        const pageRes = await fetchWithTimeout(googleRssUrl, {
            headers: DEFAULT_HEADERS,
            redirect: 'follow',
        })

        const html = await pageRes.text()

        const dataMatch = html.match(/<c-wiz[^>]*data-p="([^"]+)"/i)
        if (!dataMatch?.[1]) {
            return undefined
        }

        const decoded = decodeHtmlEntities(dataMatch[1])
        const raw = decoded.replace('%.@.', '["garturlreq",')

        let parsed: unknown
        try {
            parsed = JSON.parse(raw)
        } catch {
            return undefined
        }

        if (!Array.isArray(parsed) || parsed.length < 8) {
            return undefined
        }

        const payloadData = [
            ...parsed.slice(0, -6),
            ...parsed.slice(-2),
        ]

        const payload = {
            'f.req': JSON.stringify([
                [
                    [
                        'Fbv4je',
                        JSON.stringify(payloadData),
                        'null',
                        'generic',
                    ],
                ],
            ]),
        }

        const postRes = await fetchWithTimeout(
            'https://news.google.com/_/DotsSplashUi/data/batchexecute',
            {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': DEFAULT_HEADERS['User-Agent'],
                },
                body: new URLSearchParams(payload).toString(),
            }
        )

        const body = await postRes.text()
        const cleaned = body.replace(/^\)\]\}'\n?/, '').trim()

        let topLevel: unknown
        try {
            topLevel = JSON.parse(cleaned)
        } catch {
            return undefined
        }

        if (!Array.isArray(topLevel)) {
            return undefined
        }

        const arrayString = topLevel?.[0]?.[2]
        if (typeof arrayString !== 'string') {
            return undefined
        }

        let resolvedPayload: unknown
        try {
            resolvedPayload = JSON.parse(arrayString)
        } catch {
            return undefined
        }

        const articleUrl =
            Array.isArray(resolvedPayload) && typeof resolvedPayload[1] === 'string'
                ? resolvedPayload[1]
                : undefined

        if (articleUrl && /^https?:\/\//i.test(articleUrl)) {
            return articleUrl
        }

        return undefined
    } catch {
        return undefined
    }
}

async function resolveArticleUrl(item: NewsItem): Promise<string> {
    const descriptionUrl = extractPublisherUrlFromDescription(item.description)
    if (descriptionUrl) return descriptionUrl

    if (
        /^https?:\/\//i.test(item.link) &&
        !item.link.includes('news.google.com/rss/articles/') &&
        !item.link.includes('news.google.com/articles/')
    ) {
        return item.link
    }

    const decodedGoogleUrl = await resolveGoogleNewsRssArticleUrl(item.link)
    if (decodedGoogleUrl) return decodedGoogleUrl

    try {
        const res = await fetchWithTimeout(item.link, {
            method: 'GET',
            redirect: 'follow',
            headers: DEFAULT_HEADERS,
        })

        return res.url || item.link
    } catch {
        return item.link
    }
}

async function extractReadableArticle(
    url: string
): Promise<{ articleTitle?: string; articleText?: string }> {
    try {
        const res = await fetchWithTimeout(url, {
            headers: DEFAULT_HEADERS,
            redirect: 'follow',
        })

        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.includes('text/html')) {
            return {}
        }

        const html = await res.text()
        const dom = new JSDOM(html, { url })
        const document = dom.window.document

        const parsed = new Readability(document).parse()

        const articleTitle = normalizeWhitespace(parsed?.title ?? '')
        const articleText = normalizeWhitespace(parsed?.textContent ?? '')

        let fallbackBody = ''
        if (!articleText || articleText.length < 250) {
            fallbackBody = normalizeWhitespace(document.body?.textContent ?? '')
        }

        dom.window.close()

        if (articleText.length >= 250) {
            return {
                articleTitle: articleTitle || undefined,
                articleText: articleText.slice(0, 20000),
            }
        }

        if (fallbackBody.length >= 250) {
            return {
                articleTitle: articleTitle || undefined,
                articleText: fallbackBody.slice(0, 12000),
            }
        }

        return {}
    } catch (error) {
        console.error(`Article extraction failed for ${url}:`, error)
        return {}
    }
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

export async function enrichNewsWithArticleContent(
    items: NewsItem[]
): Promise<NewsItem[]> {
    return Promise.all(
        items.map(async (item) => {
            const articleUrl = await resolveArticleUrl(item)
            const { articleTitle, articleText } =
                await extractReadableArticle(articleUrl)

            return {
                ...item,
                articleUrl,
                articleTitle,
                articleText,
                description: stripHtml(item.description),
            }
        })
    )
}