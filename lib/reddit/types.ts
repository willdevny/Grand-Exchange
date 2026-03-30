export type RedditPost = {
  id: string
  title: string
  subreddit: string
  author: string
  score: number
  comments: number
  createdAt: string
  body?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export type SentimentSummary = {
  positive: number
  neutral: number
  negative: number
}

export type RedditDump = {
  symbol: string
  summary: SentimentSummary
  posts: RedditPost[]
  source: string
  generatedAt: string
}

export type SocialPost = {
  id: string
  source: 'bluesky' | 'mastodon' | 'demo'
  author: string
  text: string
  createdAt?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  link?: string
}
