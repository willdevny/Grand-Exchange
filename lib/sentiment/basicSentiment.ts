// lib/sentiment/basicSentiment.ts
const POS = ["bull", "bullish", "buy", "long", "moon", "pump", "undervalued", "beats", "upgrade"];
const NEG = ["bear", "bearish", "sell", "short", "dump", "overvalued", "miss", "downgrade", "fraud"];

export type SentimentSummary = {
    score: number;        // -1..+1 approx
    positives: number;
    negatives: number;
    neutral: number;
    total: number;
};

export function scoreSentiment(texts: string[]): SentimentSummary {
    let pos = 0, neg = 0, neu = 0;

    for (const t of texts) {
        const s = t.toLowerCase();
        const p = POS.some(w => s.includes(w));
        const n = NEG.some(w => s.includes(w));

        if (p && !n) pos++;
        else if (n && !p) neg++;
        else neu++;
    }

    const total = texts.length || 1;
    const raw = (pos - neg) / total;

    return {
        score: Math.max(-1, Math.min(1, raw)),
        positives: pos,
        negatives: neg,
        neutral: neu,
        total: texts.length,
    };
}
export function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const s = scoreSentiment([text]);
    if (s.positives > s.negatives) return 'positive';
    if (s.negatives > s.positives) return 'negative';
    return 'neutral';
}
