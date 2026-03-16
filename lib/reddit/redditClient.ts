type RedditAccessTokenResponse = {
    access_token: string
    token_type: string
    expires_in: number
    scope: string
}

export type RedditMention = {
    title: string
    url: string
    subreddit: string
    createdUtc: number
    text: string
}

let cachedToken: string | null = null
let cachedTokenExpiresAt = 0

async function getRedditAccessToken(): Promise<string> {
    const now = Date.now()

    if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
        return cachedToken
    }

    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET
    const userAgent = process.env.REDDIT_USER_AGENT

    if (!clientId || !clientSecret || !userAgent) {
        throw new Error('Missing Reddit API environment variables')
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
    })

    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': userAgent,
        },
        body: body.toString(),
        cache: 'no-store',
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Reddit token request failed: ${res.status} ${text}`)
    }

    const data = (await res.json()) as RedditAccessTokenResponse

    cachedToken = data.access_token
    cachedTokenExpiresAt = now + data.expires_in * 1000

    return data.access_token
}

type RedditListingChild = {
    data?: {
        title?: string
        selftext?: string
        permalink?: string
        subreddit?: string
        created_utc?: number
    }
}

type RedditSearchResponse = {
    data?: {
        children?: RedditListingChild[]
    }
}

export async function fetchRedditMentions(
    query: string,
    limit = 10
): Promise<RedditMention[]> {
    const token = await getRedditAccessToken()
    const userAgent = process.env.REDDIT_USER_AGENT

    if (!userAgent) {
        throw new Error('Missing REDDIT_USER_AGENT')
    }

    const url =
        `https://oauth.reddit.com/search` +
        `?q=${encodeURIComponent(query)}` +
        `&sort=new&t=month&limit=${limit}&type=link`

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': userAgent,
        },
        cache: 'no-store',
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Reddit search failed: ${res.status} ${text}`)
    }

    const json = (await res.json()) as RedditSearchResponse
    const children = json.data?.children ?? []

    return children
        .map((child) => child.data)
        .filter(
            (
                item
            ): item is {
                title: string
                selftext?: string
                permalink?: string
                subreddit?: string
                created_utc?: number
            } => typeof item?.title === 'string'
        )
        .map((item) => ({
            title: item.title,
            url: item.permalink
                ? `https://www.reddit.com${item.permalink}`
                : 'https://www.reddit.com',
            subreddit: item.subreddit ?? 'unknown',
            createdUtc: item.created_utc ?? 0,
            text: `${item.title} ${item.selftext ?? ''}`.trim(),
        }))
}