import { classifySentiment } from '@/lib/sentiment/basicSentiment'

export type YouTubeComment = {
  id: string
  videoId: string
  videoTitle: string
  channelTitle: string
  author: string
  likes: number
  createdAt: string
  text: string
  sentiment: 'positive' | 'neutral' | 'negative'
  url: string
}

export type YouTubeSentimentResponse = {
  symbol: string
  summary: {
    positive: number
    neutral: number
    negative: number
  }
  posts: YouTubeComment[]
  source: string
  generatedAt: string
  banner: string
}

type SearchResponse = {
  items?: Array<{
    id?: { videoId?: string }
    snippet?: {
      title?: string
      channelTitle?: string
    }
  }>
}

type CommentThreadsResponse = {
  items?: Array<{
    id?: string
    snippet?: {
      videoId?: string
      topLevelComment?: {
        snippet?: {
          authorDisplayName?: string
          likeCount?: number
          publishedAt?: string
          textDisplay?: string
          textOriginal?: string
        }
      }
    }
  }>
}

function buildSummary(comments: YouTubeComment[]) {
  const total = comments.length || 1
  const positiveCount = comments.filter((item) => item.sentiment === 'positive').length
  const negativeCount = comments.filter((item) => item.sentiment === 'negative').length
  const neutralCount = comments.length - positiveCount - negativeCount

  return {
    positive: Math.round((positiveCount / total) * 100),
    neutral: Math.round((neutralCount / total) * 100),
    negative: Math.round((negativeCount / total) * 100),
  }
}

function buildDemoComments(symbol: string): YouTubeComment[] {
  const upper = symbol.toUpperCase()
  const demo = [
    {
      id: `${upper}-yt-1`,
      videoId: 'demo-video-1',
      videoTitle: `${upper} Stock Analysis and Price Outlook`,
      channelTitle: 'Market Demo',
      author: 'MarketWatcher101',
      likes: 14,
      createdAt: new Date().toISOString(),
      text: `${upper} still looks bullish to me after the recent move. I would buy dips and stay long.`,
    },
    {
      id: `${upper}-yt-2`,
      videoId: 'demo-video-2',
      videoTitle: `Is ${upper} Overvalued Right Now?`,
      channelTitle: 'Trader Demo',
      author: 'ValueCheck',
      likes: 8,
      createdAt: new Date().toISOString(),
      text: `${upper} feels overvalued here and I might sell if momentum slows down.`,
    },
    {
      id: `${upper}-yt-3`,
      videoId: 'demo-video-3',
      videoTitle: `${upper} Earnings Preview`,
      channelTitle: 'Finance Demo',
      author: 'CalmInvestor',
      likes: 5,
      createdAt: new Date().toISOString(),
      text: `I am waiting for earnings before making a move on ${upper}.`,
    },
  ]

  return demo.map((item) => ({
    ...item,
    sentiment: classifySentiment(item.text),
    url: `https://www.youtube.com/watch?v=${item.videoId}`,
  }))
}

export async function fetchYouTubeComments(symbol: string): Promise<YouTubeSentimentResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const upper = symbol.toUpperCase()

  if (!apiKey) {
    const posts = buildDemoComments(upper)
    return {
      symbol: upper,
      summary: buildSummary(posts),
      posts,
      source: 'demo-youtube',
      generatedAt: new Date().toISOString(),
      banner: 'YOUTUBE_API_KEY was not found, so demo YouTube comments are being shown.',
    }
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('maxResults', '3')
    searchUrl.searchParams.set('order', 'relevance')
    searchUrl.searchParams.set('q', `${upper} stock`)
    searchUrl.searchParams.set('key', apiKey)

    const searchRes = await fetch(searchUrl.toString(), { cache: 'no-store' })
    if (!searchRes.ok) {
      throw new Error(`YouTube search failed with status ${searchRes.status}`)
    }

    const searchData = (await searchRes.json()) as SearchResponse
    const videos = (searchData.items ?? [])
      .map((item) => ({
        videoId: item.id?.videoId,
        videoTitle: item.snippet?.title ?? 'Untitled video',
        channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      }))
      .filter((item): item is { videoId: string; videoTitle: string; channelTitle: string } => Boolean(item.videoId))

    const commentResponses = await Promise.all(
      videos.map(async (video) => {
        const commentsUrl = new URL('https://www.googleapis.com/youtube/v3/commentThreads')
        commentsUrl.searchParams.set('part', 'snippet')
        commentsUrl.searchParams.set('videoId', video.videoId)
        commentsUrl.searchParams.set('maxResults', '8')
        commentsUrl.searchParams.set('order', 'relevance')
        commentsUrl.searchParams.set('textFormat', 'plainText')
        commentsUrl.searchParams.set('key', apiKey)

        const commentsRes = await fetch(commentsUrl.toString(), { cache: 'no-store' })
        if (!commentsRes.ok) return [] as YouTubeComment[]

        const commentsData = (await commentsRes.json()) as CommentThreadsResponse
        return (commentsData.items ?? []).map((item) => {
          const snippet = item.snippet?.topLevelComment?.snippet
          const text = snippet?.textOriginal ?? snippet?.textDisplay ?? ''
          return {
            id: item.id ?? `${video.videoId}-${Math.random().toString(36).slice(2)}`,
            videoId: video.videoId,
            videoTitle: video.videoTitle,
            channelTitle: video.channelTitle,
            author: snippet?.authorDisplayName ?? 'Unknown author',
            likes: Number(snippet?.likeCount ?? 0),
            createdAt: snippet?.publishedAt ?? new Date().toISOString(),
            text,
            sentiment: classifySentiment(text),
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
          }
        })
      }),
    )

    const posts = commentResponses.flat().filter((item) => item.text.trim().length > 0)

    if (posts.length === 0) {
      const demoPosts = buildDemoComments(upper)
      return {
        symbol: upper,
        summary: buildSummary(demoPosts),
        posts: demoPosts,
        source: 'demo-youtube',
        generatedAt: new Date().toISOString(),
        banner: 'No live YouTube comments were returned for that search, so demo comments are being shown.',
      }
    }

    return {
      symbol: upper,
      summary: buildSummary(posts),
      posts,
      source: 'youtube-data-api-v3',
      generatedAt: new Date().toISOString(),
      banner: 'Using live YouTube comments from YouTube Data API v3.',
    }
  } catch (error) {
    console.error(error)
    const posts = buildDemoComments(upper)
    return {
      symbol: upper,
      summary: buildSummary(posts),
      posts,
      source: 'demo-youtube',
      generatedAt: new Date().toISOString(),
      banner: 'YouTube comments could not be loaded live, so demo comments are being shown.',
    }
  }
}
