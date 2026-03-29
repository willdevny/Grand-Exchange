import { NextRequest, NextResponse } from "next/server";

type StockDataOrgEOD = {
    date: string;
    close: number | string;
};

type StockApiResponseItem = {
    date: string;
    close: number;
};

type QuoteData = {
    price: number;
    day_high: number;
    day_low: number;
    volume: number;
    change: number;
    change_pct: number;
};

type CompanyData = {
    name: string;
    industry: string;
    exchange: string;
    country: string;
};

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const pathSegments = url.pathname.split("/").filter(Boolean);
        const symbol = pathSegments[2]?.toUpperCase();

        if (!symbol) {
            return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
        }

        const API_KEY = process.env.STOCK_API_KEY;
        if (!API_KEY) {
            return NextResponse.json(
                { error: "STOCK_API_KEY environment variable not set" },
                { status: 500 }
            );
        }

        const rangeDays = Number(url.searchParams.get("rangeDays") ?? 365);

        // ----- UTC-SAFE DATE RANGE -----
        const now = new Date();
        const endDateUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        ));

        const startDateUTC = new Date(endDateUTC);
        startDateUTC.setUTCDate(endDateUTC.getUTCDate() - rangeDays);

        //EOD data
        const apiUrl = new URL("https://api.stockdata.org/v1/data/eod");
        apiUrl.searchParams.set("symbols", symbol);
        apiUrl.searchParams.set("api_token", API_KEY);
        apiUrl.searchParams.set("date_from", startDateUTC.toISOString().split("T")[0]);
        apiUrl.searchParams.set("date_to", endDateUTC.toISOString().split("T")[0]);

        const res = await fetch(apiUrl.toString());

        if (!res.ok) {
            const text = await res.text();
            return NextResponse.json(
                { error: `StockData API returned ${res.status}: ${text}` },
                { status: 500 }
            );
        }

        const data = await res.json();

        if (!Array.isArray(data.data)) {
            return NextResponse.json(
                { error: "Unexpected API response format" },
                { status: 500 }
            );
        }

        const mapped: StockApiResponseItem[] = data.data.map((item: StockDataOrgEOD) => ({
            date: item.date,
            close: Number(item.close),
        }));

        //quote data
        const quoteUrl = new URL("https://api.stockdata.org/v1/data/quote");
        quoteUrl.searchParams.set("symbols", symbol);
        quoteUrl.searchParams.set("api_token", API_KEY);

        const quoteRes = await fetch(quoteUrl.toString());
        const quoteJson = await quoteRes.json();

        const quote = quoteJson.data?.[0] ?? null;

        //metadata
        const entityUrl = new URL("https://api.stockdata.org/v1/entity/search");
        entityUrl.searchParams.set("symbols", symbol);
        entityUrl.searchParams.set("api_token", API_KEY);

        const entityRes = await fetch(entityUrl.toString());
        const entityJson = await entityRes.json();

        const company = entityJson.data?.[0] ?? null;

        return NextResponse.json({
            data: mapped,
            quote,
            company
        });
    } catch (err) {
        console.error("Failed to fetch stock data:", err);
        return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
    }
}