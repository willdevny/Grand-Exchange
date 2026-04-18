import { NextRequest, NextResponse } from "next/server";

type StockDataOrgEOD = {
    date: string;
    close: number | string;
};

type StockApiResponseItem = {
    date: string;
    close: number;
};

type Overview = {
    MarketCapitalization?: string;
    PERatio?: string;
    EPS?: string;
    DividendYield?: string;
    AnalystTargetPrice?: string;
    Sector?: string;
};

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const pathSegments = url.pathname.split("/").filter(Boolean);
        const symbol = pathSegments[2]?.toUpperCase();

        if (!symbol) {
            return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
        }

        const STOCK_API_KEY = process.env.STOCK_API_KEY;
        const ALPHA_KEY = process.env.ALPHAVANTAGE_API_KEY;

        if (!STOCK_API_KEY) {
            return NextResponse.json(
                { error: "STOCK_API_KEY not set" },
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

        // ----- STOCKDATA URLS -----
        const eodUrl = new URL("https://api.stockdata.org/v1/data/eod");
        eodUrl.searchParams.set("symbols", symbol);
        eodUrl.searchParams.set("api_token", STOCK_API_KEY);
        eodUrl.searchParams.set("date_from", startDateUTC.toISOString().split("T")[0]);
        eodUrl.searchParams.set("date_to", endDateUTC.toISOString().split("T")[0]);

        const quoteUrl = new URL("https://api.stockdata.org/v1/data/quote");
        quoteUrl.searchParams.set("symbols", symbol);
        quoteUrl.searchParams.set("api_token", STOCK_API_KEY);

        const entityUrl = new URL("https://api.stockdata.org/v1/entity/search");
        entityUrl.searchParams.set("symbols", symbol);
        entityUrl.searchParams.set("api_token", STOCK_API_KEY);

        let overviewPromise: Promise<Overview| null> = Promise.resolve(null);

        if (ALPHA_KEY) {
            const overviewUrl = new URL("https://www.alphavantage.co/query");
            overviewUrl.searchParams.set("function", "OVERVIEW");
            overviewUrl.searchParams.set("symbol", symbol);
            overviewUrl.searchParams.set("apikey", ALPHA_KEY);

            overviewPromise = fetch(overviewUrl.toString())
                .then(res => res.json())
                .then(json => {
                    if (json["Note"] || json["Error Message"]) {
                        console.warn("Overview error:", json);
                        return null;
                    }

                    return {
                        MarketCapitalization: json.MarketCapitalization,
                        PERatio: json.PERatio,
                        EPS: json.EPS,
                        DividendYield: json.DividendYield,
                        AnalystTargetPrice: json.AnalystTargetPrice,
                        Sector: json.Sector,
                        Industry: json.Industry,
                        Beta: json.Beta,
                        PriceToBookRatio: json.PriceToBookRatio,
                        PriceToSalesRatioTTM: json.PriceToSalesRatioTTM,
                        BookValue: json.BookValue,
                        EVToEBITDA: json.EVToEBITDA,
                        PEGRatio: json.PEGRatio,
                        ProfitMargin: json.ProfitMargin,
                        OperatingMarginTTM: json.OperatingMarginTTM,
                        ReturnOnEquityTTM: json.ReturnOnEquityTTM,
                        ReturnOnAssetsTTM: json.ReturnOnAssetsTTM,
                        FiftyTwoWeekHigh: json["52WeekHigh"],
                        FiftyTwoWeekLow: json["52WeekLow"],
                    };
                })
                .catch(err => {
                    console.warn("Overview fetch failed:", err);
                    return null;
                });
        }

        // ----- PARALLEL FETCH -----
        const [eodRes, quoteRes, entityRes, overview] = await Promise.all([
            fetch(eodUrl.toString()),
            fetch(quoteUrl.toString()),
            fetch(entityUrl.toString()),
            // rsiPromise,
            overviewPromise,
            // smaPromise
        ]);

        // ----- EOD DATA -----
        if (!eodRes.ok) {
            const text = await eodRes.text();
            return NextResponse.json(
                { error: `StockData EOD error ${eodRes.status}: ${text}` },
                { status: 500 }
            );
        }

        const eodJson = await eodRes.json();

        if (!Array.isArray(eodJson.data)) {
            return NextResponse.json(
                { error: "Unexpected EOD format" },
                { status: 500 }
            );
        }

        const mapped: StockApiResponseItem[] = eodJson.data.map((item: StockDataOrgEOD) => ({
            date: item.date,
            close: Number(item.close),
        }));

        // ----- QUOTE -----
        let quote = null;
        try {
            const quoteJson = await quoteRes.json();
            quote = quoteJson.data?.[0] ?? null;
        } catch {
            console.warn("Quote fetch failed");
        }

        // ----- COMPANY -----
        let company = null;
        try {
            const entityJson = await entityRes.json();
            company = entityJson.data?.[0] ?? null;
        } catch {
            console.warn("Company fetch failed");
        }

        // ----- FINAL RESPONSE -----
        return NextResponse.json({
            data: mapped,
            quote,
            company,
            overview
        });

    } catch (err) {
        console.error("Route error:", err);
        return NextResponse.json(
            { error: "Failed to fetch stock data" },
            { status: 500 }
        );
    }
}
