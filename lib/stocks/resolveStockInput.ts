export type ResolvedStockInput = {
    ticker: string
    companyName: string
    displayName: string
    searchQuery: string
    originalQuery: string
    matchedBy: 'ticker' | 'company' | 'fallback'
}

type StockAliasRecord = {
    ticker: string
    companyName: string
    aliases: string[]
}

const STOCK_ALIASES: StockAliasRecord[] = [
    { ticker: 'AAPL', companyName: 'Apple', aliases: ['apple', 'apple inc', 'apple stock', 'aapl'] },
    { ticker: 'MSFT', companyName: 'Microsoft', aliases: ['microsoft', 'microsoft corp', 'msft'] },
    { ticker: 'NVDA', companyName: 'NVIDIA', aliases: ['nvidia', 'nvidia corp', 'nvda'] },
    { ticker: 'GOOGL', companyName: 'Alphabet', aliases: ['google', 'alphabet', 'google stock', 'googl', 'goog'] },
    { ticker: 'AMZN', companyName: 'Amazon', aliases: ['amazon', 'amazon stock', 'amazoncom', 'amzn'] },
    { ticker: 'META', companyName: 'Meta', aliases: ['meta', 'facebook', 'fb', 'meta stock'] },

    { ticker: 'TSLA', companyName: 'Tesla', aliases: ['tesla', 'tesla inc', 'tsla'] },
    { ticker: 'AMD', companyName: 'AMD', aliases: ['amd', 'advanced micro devices'] },
    { ticker: 'INTC', companyName: 'Intel', aliases: ['intel', 'intel corp', 'intc'] },
    { ticker: 'NFLX', companyName: 'Netflix', aliases: ['netflix', 'nflx'] },
    { ticker: 'PLTR', companyName: 'Palantir', aliases: ['palantir', 'pltr'] },
    { ticker: 'SNOW', companyName: 'Snowflake', aliases: ['snowflake', 'snow'] },
    { ticker: 'CRM', companyName: 'Salesforce', aliases: ['salesforce', 'crm'] },
    { ticker: 'ORCL', companyName: 'Oracle', aliases: ['oracle', 'orcl'] },
    { ticker: 'CSCO', companyName: 'Cisco', aliases: ['cisco', 'csco'] },
    { ticker: 'IBM', companyName: 'IBM', aliases: ['ibm'] },

    { ticker: 'JPM', companyName: 'JPMorgan', aliases: ['jpmorgan', 'jp morgan', 'jpm'] },
    { ticker: 'BAC', companyName: 'Bank of America', aliases: ['bank of america', 'bac'] },
    { ticker: 'C', companyName: 'Citigroup', aliases: ['citigroup', 'citi'] },
    { ticker: 'GS', companyName: 'Goldman Sachs', aliases: ['goldman sachs', 'gs'] },
    { ticker: 'SCHW', companyName: 'Charles Schwab', aliases: ['schwab', 'charles schwab'] },
    { ticker: 'HOOD', companyName: 'Robinhood', aliases: ['robinhood', 'hood'] },
    { ticker: 'COIN', companyName: 'Coinbase', aliases: ['coinbase', 'coin'] },
    { ticker: 'V', companyName: 'Visa', aliases: ['visa'] },
    { ticker: 'MA', companyName: 'Mastercard', aliases: ['mastercard'] },

    { ticker: 'TGT', companyName: 'Target', aliases: ['target', 'tgt'] },
    { ticker: 'COST', companyName: 'Costco', aliases: ['costco'] },
    { ticker: 'WMT', companyName: 'Walmart', aliases: ['walmart'] },
    { ticker: 'HD', companyName: 'Home Depot', aliases: ['home depot'] },
    { ticker: 'NKE', companyName: 'Nike', aliases: ['nike'] },
    { ticker: 'SBUX', companyName: 'Starbucks', aliases: ['starbucks'] },

    { ticker: 'XOM', companyName: 'ExxonMobil', aliases: ['exxon', 'exxonmobil'] },
    { ticker: 'CVX', companyName: 'Chevron', aliases: ['chevron'] },
    { ticker: 'OXY', companyName: 'Occidental', aliases: ['occidental petroleum', 'oxy'] },
    { ticker: 'BA', companyName: 'Boeing', aliases: ['boeing'] },
    { ticker: 'CAT', companyName: 'Caterpillar', aliases: ['caterpillar'] },
    { ticker: 'GE', companyName: 'General Electric', aliases: ['ge', 'general electric'] },

    { ticker: 'UNH', companyName: 'UnitedHealth', aliases: ['unitedhealth'] },
    { ticker: 'LLY', companyName: 'Eli Lilly', aliases: ['eli lilly', 'lilly'] },
    { ticker: 'JNJ', companyName: 'Johnson & Johnson', aliases: ['jnj', 'johnson and johnson'] },
    { ticker: 'ABBV', companyName: 'AbbVie', aliases: ['abbvie'] },
    { ticker: 'ABT', companyName: 'Abbott', aliases: ['abbott'] },
    { ticker: 'AMGN', companyName: 'Amgen', aliases: ['amgen'] },
    { ticker: 'MRK', companyName: 'Merck', aliases: ['merck'] },

    { ticker: 'VZ', companyName: 'Verizon', aliases: ['verizon'] },
    { ticker: 'T', companyName: 'AT&T', aliases: ['att', 'at&t'] },
    { ticker: 'TMUS', companyName: 'T-Mobile', aliases: ['t-mobile', 'tmobile'] },

    { ticker: 'AVGO', companyName: 'Broadcom', aliases: ['broadcom'] },
    { ticker: 'QCOM', companyName: 'Qualcomm', aliases: ['qualcomm'] },
    { ticker: 'TXN', companyName: 'Texas Instruments', aliases: ['texas instruments'] },
    { ticker: 'LRCX', companyName: 'Lam Research', aliases: ['lam research'] },
    { ticker: 'AMAT', companyName: 'Applied Materials', aliases: ['applied materials'] },
    { ticker: 'ADI', companyName: 'Analog Devices', aliases: ['analog devices'] },
    { ticker: 'MRVL', companyName: 'Marvell', aliases: ['marvell'] },
    { ticker: 'PANW', companyName: 'Palo Alto Networks', aliases: ['palo alto networks'] },

    { ticker: 'MSTR', companyName: 'MicroStrategy', aliases: ['microstrategy'] },
    { ticker: 'RKLB', companyName: 'Rocket Lab', aliases: ['rocket lab'] },
    { ticker: 'ASTS', companyName: 'AST SpaceMobile', aliases: ['ast spacemobile'] },
    { ticker: 'SOFI', companyName: 'SoFi', aliases: ['sofi'] },
    { ticker: 'RIVN', companyName: 'Rivian', aliases: ['rivian'] },
]

function normalizeInput(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[.,]/g, '')
        .replace(/stock|shares|price/g, '')   // 👈 NEW
        .replace(/\s+/g, ' ')
}

export function resolveStockInput(input: string): ResolvedStockInput {
    const originalQuery = input.trim()
    const normalized = normalizeInput(input)
    const upper = originalQuery.toUpperCase()

    const tickerMatch = STOCK_ALIASES.find(
        (record) => record.ticker === upper || record.aliases.includes(normalized)
    )

    if (tickerMatch) {
        return {
            ticker: tickerMatch.ticker,
            companyName: tickerMatch.companyName,
            displayName: `${tickerMatch.companyName} (${tickerMatch.ticker})`,
            searchQuery: `${tickerMatch.companyName} ${tickerMatch.ticker} stock`,
            originalQuery,
            matchedBy:
                tickerMatch.ticker === upper ? 'ticker' : 'company',
        }
    }

    const uppercaseTicker = upper.match(/\b[A-Z]{1,5}\b/)
    if (uppercaseTicker) {
        const ticker = uppercaseTicker[0]

        return {
            ticker,
            companyName: ticker,
            displayName: ticker,
            searchQuery: `${ticker} stock`,
            originalQuery,
            matchedBy: 'fallback',
        }
    }

    return {
        ticker: originalQuery,
        companyName: originalQuery,
        displayName: originalQuery,
        searchQuery: `${originalQuery} stock`,
        originalQuery,
        matchedBy: 'fallback',
    }
}