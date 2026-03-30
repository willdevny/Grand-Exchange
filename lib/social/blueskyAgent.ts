export type BlueskyAgentPost = {
    text: string
    author?: string
    createdAt?: string
    uri?: string
}

export async function fetchBlueskyAgentPosts(
    query: string,
    limit = 25
): Promise<BlueskyAgentPost[]> {
    try {
        const url =
            `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts` +
            `?q=${encodeURIComponent(query)}&limit=${limit}`

        const res = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'GrandExchangeBot/1.0',
            },
            cache: 'no-store',
        })

        if (!res.ok) {
            throw new Error(`Bluesky fetch failed with ${res.status}`)
        }

        const data = await res.json()
        const posts = Array.isArray(data?.posts) ? data.posts : []

        return posts
            .map((post: any) => ({
                text: typeof post?.record?.text === 'string' ? post.record.text : '',
                author:
                    typeof post?.author?.handle === 'string'
                        ? post.author.handle
                        : undefined,
                createdAt:
                    typeof post?.record?.createdAt === 'string'
                        ? post.record.createdAt
                        : undefined,
                uri: typeof post?.uri === 'string' ? post.uri : undefined,
            }))
            .filter((post: BlueskyAgentPost) => post.text.trim().length > 0)
    } catch (error) {
        console.error('Bluesky agent fetch error:', error)
        return []
    }
}