// lib/reddit/redditClient.ts
export type RedditMention = {
    title: string;
    url: string;
    subreddit: string;
    createdUtc: number;
    text: string; // title + snippet (for sentiment)
};

export async function fetchRedditMentions(_query: string, _limit = 25): Promise<RedditMention[]> {
    // TODO: implement via official Reddit OAuth API
    return [];
}