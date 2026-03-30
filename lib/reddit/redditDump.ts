import fs from 'fs'
import path from 'path'
import type { RedditDump } from '@/lib/reddit/types'

function readDumpFile(name: string): RedditDump | null {
  const filePath = path.join(process.cwd(), 'public', 'reddit-dumps', name)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RedditDump
}

export function loadDump(symbol: string): RedditDump {
  const upper = symbol.trim().toUpperCase()
  return (
    readDumpFile(`${upper}.json`) ??
    readDumpFile('SAMPLE.json') ?? {
      symbol: upper,
      summary: { positive: 50, neutral: 30, negative: 20 },
      posts: [],
      source: 'local-demo',
      generatedAt: new Date().toISOString(),
    }
  )
}
