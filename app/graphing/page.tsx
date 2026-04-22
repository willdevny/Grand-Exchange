 "use client";

import { useEffect, useRef, useState} from "react";
import * as d3 from "d3";
import { useSession } from "next-auth/react";

//type used for stock representation
type importedStock = {
    symbol: string; //stock ticker ex. MSFT, APPL, etc.
    values: { //stores a year's worth of values, each an array of date, close
        date: string;
        close: number; //closing price for given date
    }[];
    color?: string; //stores the assigned color
};

type ExportedStock = {
    symbol: string;
    values: {
        date: string;
        close: number;
    }[];
    color?: string;
};

type Overview = Record<string, string>;

type StockApiResponseItem = {
    date: string;
    close: number;
};

//represents a single datapoint on a line
type DataPoint = {
    date: Date;
    close: number;
};

type StockQuote = {
    symbol: string;
    price: number;
    day_high: number;
    day_low: number;
    close: number;
    volume: number;
    previous_close?: number;
};

type CompanyInfo = {
    name: string;
    industry?: string;
    sector?: string;
    website?: string;
};

type Stock = {
    symbol: string;
    values: DataPoint[];
    color?: string;
    quote?: StockQuote;
    company?: CompanyInfo;
    indicators?: Indicators;
    overview?: Overview; // ✅ NEW
};

type StockFetchResult = {
    values: DataPoint[];
    quote?: StockQuote;
    company?: CompanyInfo;
    indicators?: Indicators;
    overview?: Overview; // ✅ NEW
};


type IndicatorDataPoint = {
    date: Date;
    value: number;
};

type Indicators = {
    rsi?: IndicatorDataPoint[] | null;
    sma?: IndicatorDataPoint[] | null;

};

type ViewMode = "compare" | "single";


 function normalizeDate(dateStr: string): Date {
     const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
     return new Date(y, m - 1, d); // stays consistent
 }

 type DetailItem = {
     label: string;
     value: string;
 };

 function addDetail(
     items: DetailItem[],
     label: string,
     value: string | number | null | undefined
 ) {
     if (value === null || value === undefined || value === "") {
         return;
     }

     items.push({
         label,
         value: String(value),
     });
 }

 function addDollarDetail(
     items: DetailItem[],
     label: string,
     value: string | number | null | undefined
 ) {
     if (value === null || value === undefined || value === "") {
         return;
     }

     items.push({
         label,
         value: `$${value}`,
     });
 }

 function addPercentDetail(
     items: DetailItem[],
     label: string,
     value: string | number | null | undefined
 ) {
     if (value === null || value === undefined || value === "") {
         return;
     }

     const numericValue = Number(value);
     if (Number.isNaN(numericValue)) {
         return;
     }

     items.push({
         label,
         value: `${(numericValue * 100).toFixed(2)}%`,
     });
 }

 function buildQuoteDetails(stock: Stock): DetailItem[] {
     const items: DetailItem[] = [];
     const quote = stock.quote;

     if (!quote) {
         return items;
     }

     addDollarDetail(items, "Current Price", quote.price);
     addDollarDetail(items, "Day High", quote.day_high);
     addDollarDetail(items, "Day Low", quote.day_low);
     addDetail(items, "Volume", quote.volume);
     addDollarDetail(items, "Previous Close", quote.previous_close);

     return items;
 }

 function buildOverviewDetails(stock: Stock): DetailItem[] {
     const items: DetailItem[] = [];
     const overview = stock.overview;

     if (!overview) {
         return items;
     }

     addDollarDetail(items, "Market Cap", overview.MarketCapitalization);
     addDetail(items, "P/E Ratio", overview.PERatio);
     addDetail(items, "EPS", overview.EPS);
     addPercentDetail(items, "Dividend Yield", overview.DividendYield);
     addDollarDetail(items, "Target Price", overview.AnalystTargetPrice);
     addDetail(items, "Sector", overview.Sector);
     addDetail(items, "Industry", overview.Industry);
     addDetail(items, "Country", overview.Country);
     addDetail(items, "Exchange", overview.Exchange);
     addDetail(items, "Book Value", overview.BookValue);
     addDetail(items, "P/B Ratio", overview.PriceToBookRatio);
     addDetail(items, "P/S Ratio", overview.PriceToSalesRatioTTM);
     addDetail(items, "PEG Ratio", overview.PEGRatio);
     addDetail(items, "EV/EBITDA", overview.EVToEBITDA);
     addPercentDetail(items, "Profit Margin", overview.ProfitMargin);
     addPercentDetail(items, "Op. Margin", overview.OperatingMarginTTM);
     addPercentDetail(items, "ROE", overview.ReturnOnEquityTTM);
     addPercentDetail(items, "ROA", overview.ReturnOnAssetsTTM);
     addPercentDetail(
         items,
         "Earnings Growth YoY",
         overview.QuarterlyEarningsGrowthYOY
     );
     addPercentDetail(
         items,
         "Revenue Growth YoY",
         overview.QuarterlyRevenueGrowthYOY
     );
     addDetail(items, "Beta", overview.Beta);
     addDetail(items, "Shares Out", overview.SharesOutstanding);
     addDollarDetail(items, "Dividend / Share", overview.DividendPerShare);
     addDetail(items, "Dividend Date", overview.DividendDate);
     addDetail(items, "Ex-Dividend", overview.ExDividendDate);

     return items;
 }

 function buildBaseDetails(stock: Stock): DetailItem[] {
     if (!stock.values.length) {
         return [];
     }

     const latest = stock.values[stock.values.length - 1];
     const first = stock.values[0];
     const change = latest.close - first.close;
     const percentChange = (change / first.close) * 100;
     const closes = stock.values.map((v) => v.close);
     const high = Math.max(...closes);
     const low = Math.min(...closes);
     const drawdown = ((high - latest.close) / high) * 100;

     return [
         {
             label: "Latest Close",
             value: `$${latest.close.toFixed(2)}`,
         },
         {
             label: "6M Change",
             value: `$${change.toFixed(2)}`,
         },
         {
             label: "% Change",
             value: `${percentChange.toFixed(2)}%`,
         },
         {
             label: "6M High",
             value: `$${high.toFixed(2)}`,
         },
         {
             label: "6M Low",
             value: `$${low.toFixed(2)}`,
         },
         {
             label: "Drawdown",
             value: `${drawdown.toFixed(2)}%`,
         },
     ];
 }

 function buildDetailItems(stock: Stock): DetailItem[] {
     return [
         ...buildQuoteDetails(stock),
         ...buildBaseDetails(stock),
         ...buildOverviewDetails(stock),
     ];
 }

 function StockDetails({ stock }: { stock: Stock }) {
     if (!stock.values.length) return null;

     const detailItems = buildDetailItems(stock);

     return (
         <div className="space-y-6">
             {stock.company && (
                 <div className="text-sm text-gray-600">
                     <div className="font-semibold">{stock.company.name}</div>
                     <div>{stock.company.industry}</div>
                 </div>
             )}

             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {detailItems.map((item) => (
                     <DetailItem
                         key={item.label}
                         label={item.label}
                         value={item.value}
                     />
                 ))}
             </div>
         </div>
     );
 }

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-50 p-4 rounded-xl">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
        </div>
    );
}

export default function GraphingPage() {
    // used for manipulating the chart <svg>
    const svgRef = useRef<SVGSVGElement | null>(null);

    const { data: session } = useSession();

    //stores all stocks currently on the graph
    const [stocks, setStocks] = useState<Stock[]>([]);
    //determines data time range and graph x axis
    const [selectedRangeDays, setSelectedRangeDays] = useState<number>(182);
    //controls input for stock ticker text field
    const [symbolInput, setSymbolInput] = useState("");
    //stores error messages meant for diaply
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    //controls viewmode
    const [viewMode, setViewMode] = useState<"compare" | "single">("compare");
    //stores specific stock for single viewmode
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    //controls Average toggle
    const [showAverage, setShowAverage] = useState(false);

    //chart margins
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    //chart width and height
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    //default color scale
    const colorScale = d3.scaleOrdinal<string, string>(d3.schemeCategory10);

    const averageStock = showAverage
        ? calculateAverageStock(stocks)
        : null;

    // -----------------------
    // Fetch stock data via server API
    // -----------------------
    const MAX_API_DAYS = 182; // ~6 months

    async function uploadToDrive(accessToken: string, data: ExportedStock[]) {
        const metadata = {
            name: "stock-chart.json",
            mimeType: "application/json",
        };

        const file = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: "application/json" }
        );

        const form = new FormData();
        form.append(
            "metadata",
            new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        form.append("file", file);

        const res = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            }
        );

        console.log("Drive status:", res.status);
        const text = await res.text();
        console.log("Drive response:", text);

        if (!res.ok) {
            throw new Error(text);
        }

        return JSON.parse(text);
    }

    async function fetchStockData(symbol: string): Promise<StockFetchResult | null> {
        try {
            const res = await fetch(`/api/stock/${symbol}?rangeDays=${MAX_API_DAYS}`);

            if (!res.ok) {
                const text = await res.text();
                console.error("API Error:", res.status, text);
                return null;
            }

            const raw = await res.json();

            console.log("RAW RESPONSE FULL:", JSON.stringify(raw, null, 2));

            if (!raw.data || !Array.isArray(raw.data)) {
                console.error("Unexpected API shape:", raw);
                return null;
            }

            // Convert API history into DataPoint[]
            const data: DataPoint[] = raw.data.map((item: StockApiResponseItem) => ({
                date: normalizeDate(item.date),
                close: Number(item.close),
            }));

            // Sort oldest → newest
            data.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Client range filtering
            const cutoffDate = new Date(
                Date.now() - selectedRangeDays * 24 * 60 * 60 * 1000
            );

            const slicedData = data.filter((d) => d.date >= cutoffDate);

            console.log(`Fetched ${slicedData.length} valid points for ${symbol}`);

            return {
                values: slicedData,
                quote: raw.quote ?? null,
                company: raw.company ?? null,
                indicators: raw.indicators ?? null,
                overview: raw.overview ?? null
            };
        } catch (err) {
            console.error("Failed to fetch stock data:", err);
            return null;
        }
    }

    function calculateRSI(data: DataPoint[], period = 14): IndicatorDataPoint[] {
        const result: IndicatorDataPoint[] = [];

        let gains = 0;
        let losses = 0;

        // First period
        for (let i = 1; i <= period; i++) {
            const diff = data[i].close - data[i - 1].close;
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        result.push({
            date: data[period].date,
            value: 100 - 100 / (1 + avgGain / avgLoss),
        });

        // Remaining
        for (let i = period + 1; i < data.length; i++) {
            const diff = data[i].close - data[i - 1].close;

            const gain = diff > 0 ? diff : 0;
            const loss = diff < 0 ? -diff : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            const rsi = avgLoss === 0
                ? 100
                : 100 - 100 / (1 + avgGain / avgLoss);

            result.push({
                date: data[i].date,
                value: rsi,
            });
        }

        return result;
    }

    function calculateSMA(data: DataPoint[], period: number): IndicatorDataPoint[] {
        const result: IndicatorDataPoint[] = [];

        for (let i = period - 1; i < data.length; i++) {
            const slice = data.slice(i - period + 1, i + 1);
            const avg =
                slice.reduce((sum, d) => sum + d.close, 0) / period;

            result.push({
                date: data[i].date,
                value: avg,
            });
        }

        return result;
    }

    // -----------------------
    // Add stock
    // -----------------------
    async function handleAddStock() {
        const symbol = symbolInput.toUpperCase().trim();

        if (!symbol) return;

        const result = await fetchStockData(symbol);

        if (!result || result.values.length === 0) {
            setErrorMessage(`Could not fetch data for ${symbol}.`);
            return;
        } else {
            setErrorMessage(null);
        }

        const sma = calculateSMA(result.values, 20);
        const rsi = calculateRSI(result.values, 14);

        const newStock: Stock = {
            symbol,
            values: result.values,
            quote: result.quote,
            company: result.company,
            indicators: {
                rsi,
                sma
            },
            overview: result.overview,
            color: colorScale(symbol),
        };

        if (viewMode === "single") {
            setSelectedStock(newStock);

            setStocks((prev) => {
                const exists = prev.find((s) => s.symbol === symbol);
                if (exists) return prev;
                return [...prev, newStock];
            });
        } else {
            if (stocks.find((s) => s.symbol === symbol)) return;
            setStocks((prev) => [...prev, newStock]);
        }

        setSymbolInput("");
    }

    function handleAddAverage() {
        setShowAverage(prev => !prev);
    }

    // -----------------------
    // Avg perfromance finder
    // -----------------------

    function calculateAverageStock(stocks: Stock[]): Stock | null {

        const baseStocks = stocks.filter(s => s.symbol !== "AVERAGE");

        if (baseStocks.length === 0) return null;

        const allDates = Array.from(
            new Set(baseStocks.flatMap(s => s.values.map(v => v.date.getTime())))
        )
            .sort((a, b) => a - b)
            .map(t => new Date(t));

        const averagedValues: DataPoint[] = allDates.map(date => {

            const values = baseStocks.map(
                s => s.values.find(v =>
                    v.date.getFullYear() === date.getFullYear() &&
                    v.date.getMonth() === date.getMonth() &&
                    v.date.getDate() === date.getDate()
                )
            );

            const numericValues = values
                .filter((v): v is DataPoint => v !== undefined)
                .map(v => v.close);

            if (numericValues.length === 0) return null;

            const avg =
                numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;

            return { date, close: avg };
        })
            .filter((d): d is DataPoint => d !== null);

        return {
            symbol: "AVERAGE",
            values: averagedValues,
            color: "#000000",
        };
    }

    // -----------------------
    // Export/Import JSON
    // -----------------------
    function handleExport() {
        const exportData = stocks.map((s) => ({
            symbol: s.symbol,
            values: s.values.map((v) => ({
                date: v.date.toISOString(), // serialize Date as string
                close: v.close,
            })),
            color: s.color, // include color
        }));

        const blob = new Blob(
            [JSON.stringify(exportData, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = "stock-chart.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleImportJSON(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const text = await file.text();
                const json = JSON.parse(text);

                // Validate json format: must be an array of { symbol, values }
                if (!Array.isArray(json)) {
                    setErrorMessage(`File ${file.name} is not valid JSON array`);
                    continue;
                }
                else{
                    setErrorMessage(null);
                }

                const importedStocks: Stock[] = (json as importedStock[]).map((s) => ({
                    symbol: s.symbol,
                    values: s.values.map((v) => ({
                        date: normalizeDate(v.date),
                        close: v.close,
                    })),
                    color: s.color || colorScale(s.symbol) || "#000000", // use imported color if available
                }));

                // Add imported stocks to existing stocks (avoid duplicates)
                setStocks((prev) => {
                    const newStocks = [...prev];
                    importedStocks.forEach((s) => {
                        if (!newStocks.find((st) => st.symbol === s.symbol)) {
                            newStocks.push(s);
                        }
                    });
                    setErrorMessage(null);
                    return newStocks;
                });
            } catch (err) {
                console.error("Failed to import JSON:", err);
                setErrorMessage(`Failed to import file ${file.name}: ${err}`);
            }
        }

        // Clear the file input so same file can be re-imported if needed
        event.target.value = "";
    }

    // -----------------------
    // Chart Rendering
    // -----------------------

    const activeStocks =
        viewMode === "single" && selectedStock
            ? [selectedStock]
            : stocks;

    const stocksToRender = averageStock
        ? [...activeStocks, averageStock]
        : activeStocks;

    useEffect(() => {
        if (viewMode === "single") {
            setShowAverage(false);
        }
    }, [viewMode]);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // clear previous chart

        if (stocksToRender.length === 0) return;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        if (stocks.length > 0 && stocks[0].values.length > 0) {
            console.log(
                "Date test:",
                stocks[0].values[0].date,
                isNaN(stocks[0].values[0].date.getTime())
            );
        }

        const cutoffRaw = new Date(
            Date.now() - selectedRangeDays * 24 * 60 * 60 * 1000
        );

        const cutoffDate = new Date(
            cutoffRaw.getFullYear(),
            cutoffRaw.getMonth(),
            cutoffRaw.getDate()
        );

        const filteredStocks = stocksToRender.map(stock => ({
            ...stock,
            values: stock.values
                .filter(v => v.date >= cutoffDate)
                .filter(v => !isNaN(v.date.getTime())),
        }));

        const allValues = filteredStocks.flatMap(s => s.values);
        if (allValues.length === 0) {
            console.warn("No valid data points to render chart.");
            return;
        }

        console.log("SMA DATA:", filteredStocks[0]?.indicators?.sma);

        // ----- X SCALE -----
        const dates = allValues.map(d => d.date);
        const xExtent = d3.extent(dates) as [Date, Date];
        if (!xExtent[0] || !xExtent[1]) {
            console.warn("Invalid xExtent:", xExtent);
            return;
        }

        const xScale = d3.scaleTime().domain(xExtent).range([0, width]);

        // ----- Y SCALE -----
        const yMin = d3.min(allValues, d => d.close) ?? 0;
        const yMax = d3.max(allValues, d => d.close) ?? 1;
        const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]).nice();



        // ----- LINE GENERATOR -----
        const line = d3.line<DataPoint>()
            .defined(d => d.date instanceof Date && !isNaN(d.date.getTime()))
            .x(d => xScale(d.date))
            .y(d => yScale(d.close));

        // ----- AXES -----
        const formatDay = d3.timeFormat("%b %d");
        const formatMonth = d3.timeFormat("%b '%y");
        const tickInterval =
            selectedRangeDays <= 7
                ? d3.timeDay.every(1)
                : selectedRangeDays <= 30
                    ? d3.timeDay.every(3)
                    : d3.timeMonth.every(1);

        const xAxis = d3.axisBottom<Date>(xScale)
            .ticks(tickInterval)
            .tickFormat(d =>
                selectedRangeDays <= 60 ? formatDay(d as Date) : formatMonth(d as Date)
            );

        g.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
        g.append("g").call(d3.axisLeft(yScale));

        // Grid
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
            .selectAll("line")
            .attr("stroke", "#e5e7eb");

        // ----- DRAW LINES -----
        filteredStocks.forEach(stock => {
            if (stock.values.length === 0) {
                console.warn(`Skipping ${stock.symbol}, no points to draw`);
                return;
            }

            g.append("path")
                .datum(stock.values)
                .attr("fill", "none")
                .attr("stroke", stock.color || "#000000")
                .attr("stroke-width", stock.symbol === "AVERAGE" ? 3 : 2)
                .attr("d", line)
                .attr("opacity", 0)
                .transition()
                .duration(500)
                .attr("opacity", 1);
        });

        // ----- INTERACTION LAYER -----

// Tooltip container
        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("padding", "6px 10px")
            .style("border", "1px solid #ccc")
            .style("border-radius", "6px")
            .style("pointer-events", "none")
            .style("opacity", 0);

// Vertical crosshair line
        const crosshair = g.append("line")
            .attr("stroke", "#999")
            .attr("stroke-width", 1)
            .attr("y1", 0)
            .attr("y2", height)
            .style("opacity", 0);

// Overlay rectangle to capture mouse
        svg.append("rect")
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "transparent")
            .on("mousemove", function (event) {
                const [mouseX] = d3.pointer(event, this);
                const x0 = xScale.invert(mouseX);


                // Get closest point from first stock (can improve later)
                const bisect = d3.bisector((d: DataPoint) => d.date).left;

                const tooltipData = filteredStocks
                    .map(stock => {
                        if (!stock.values.length) return null;

                        const index = bisect(stock.values, x0, 1);

                        const d0 = stock.values[index - 1];
                        const d1 = stock.values[index];

                        const d =
                            !d0 ? d1 :
                                !d1 ? d0 :
                                    x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime()
                                        ? d1
                                        : d0;

                        if (!d) return null;

                        return {
                            symbol: stock.symbol,
                            date: d.date,
                            price: d.close,
                            color: stock.color
                        };
                    })
                    .filter(Boolean);

                // Move crosshair
                const reference = tooltipData[0];

                if (reference) {
                    crosshair
                        .attr("x1", xScale(reference.date))
                        .attr("x2", xScale(reference.date))
                        .style("opacity", 1);
                }

                tooltip
                    .style("opacity", 1)
                    .html(`
                    <div style="font-weight:600;margin-bottom:6px;">
                        ${reference ? reference.date.toDateString() : ""}
                    </div>
                ${tooltipData
                        .map(
                            d => `
                        <div style="display:flex;justify-content:space-between;gap:12px;">
                            <span style="color:${d?.color || '#000'};font-weight:500;">
                                ${d?.symbol}
                            </span>
                            <span>
                                $${d?.price.toFixed(2)}
                            </span>
                        </div>
                        `
                        )
                        .join("")}
                    `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseleave", () => {
                tooltip.style("opacity", 0);
                crosshair.style("opacity", 0);
            });

        console.log("Chart rendered for stocks:", stocksToRender.map(s => s.symbol));

        return () => {
            d3.selectAll("body > div").filter(function () {
                return d3.select(this).style("pointer-events") === "none";
            }).remove();
        };
    }, [stocksToRender, selectedRangeDays, viewMode]);

    function SMAChart({ data }: { data: IndicatorDataPoint[] }) {
        const ref = useRef<SVGSVGElement | null>(null);

        useEffect(() => {
            if (!ref.current || data.length === 0) return;

            const width = 800;
            const height = 150;
            const margin = { top: 10, right: 20, bottom: 30, left: 40 };

            const svg = d3.select(ref.current);
            svg.selectAll("*").remove();

            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date) as [Date, Date])
                .range([margin.left, width - margin.right]);

            const y = d3.scaleLinear()
                .domain(d3.extent(data, d => d.value) as [number, number])
                .range([height - margin.bottom, margin.top]);

            const line = d3.line<IndicatorDataPoint>()
                .x(d => x(d.date))
                .y(d => y(d.value));

            // X Axis
            svg.append("g")
                .attr("transform", `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x));

            // Y Axis
            svg.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));

            svg.selectAll(".domain")
                .attr("stroke", "#9ca3af");

            svg.selectAll(".tick line")
                .attr("stroke", "#e5e7eb");

            svg.selectAll(".tick text")
                .attr("fill", "#6b7280")
                .style("font-size", "10px");

            // X label
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .attr("fill", "#6b7280")
                .text("Date");

            // Y label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", 12)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .attr("fill", "#6b7280")
                .text("SMA");

            svg.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(
                    d3.axisLeft(y)
                        .tickSize(-(width - margin.left - margin.right))
                        .tickFormat(() => "")
                )
                .selectAll("line")
                .attr("stroke", "#e5e7eb")
                .attr("stroke-dasharray", "2,2");

            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "orange")
                .attr("stroke-width", 2)
                .attr("d", line);

        }, [data]);

        return <svg ref={ref} width={800} height={150} />;
    }

    function RSIChart({ data }: { data: IndicatorDataPoint[] }) {
        const ref = useRef<SVGSVGElement | null>(null);

        useEffect(() => {
            if (!ref.current || data.length === 0) return;

            const width = 800;
            const height = 150;
            const margin = { top: 10, right: 20, bottom: 30, left: 40 };

            const svg = d3.select(ref.current);
            svg.selectAll("*").remove();

            const x = d3.scaleTime()
                .domain(d3.extent(data, d => d.date) as [Date, Date])
                .range([margin.left, width - margin.right]);

            const y = d3.scaleLinear()
                .domain([0, 100])
                .range([height - margin.bottom, margin.top]);

            const line = d3.line<IndicatorDataPoint>()
                .x(d => x(d.date))
                .y(d => y(d.value));

            // X Axis
            svg.append("g")
                .attr("transform", `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x));

            // Y Axis
            svg.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));

            svg.selectAll(".domain")
                .attr("stroke", "#9ca3af");

            svg.selectAll(".tick line")
                .attr("stroke", "#e5e7eb");

            svg.selectAll(".tick text")
                .attr("fill", "#6b7280")
                .style("font-size", "10px");

            // X label
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .attr("fill", "#6b7280")
                .text("Date");

            // Y label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", 12)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .attr("fill", "#6b7280")
                .text("RSI (0–100)");

            svg.append("g")
                .attr("transform", `translate(${margin.left},0)`)
                .call(
                    d3.axisLeft(y)
                        .tickSize(-(width - margin.left - margin.right))
                        .tickFormat(() => "")
                )
                .selectAll("line")
                .attr("stroke", "#e5e7eb")
                .attr("stroke-dasharray", "2,2");

            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", "purple")
                .attr("stroke-width", 2)
                .attr("d", line);

            // Zones
            [70, 30].forEach(level => {
                svg.append("line")
                    .attr("x1", margin.left)
                    .attr("x2", width - margin.right)
                    .attr("y1", y(level))
                    .attr("y2", y(level))
                    .attr("stroke", level === 70 ? "red" : "green")
                    .attr("stroke-dasharray", "4");
            });

        }, [data]);

        return <svg ref={ref} width={800} height={150} />;
    }

    // -----------------------
    // UI
    // -----------------------
    const ranges = [
        { label: "7D", days: 7 },
        { label: "30D", days: 30 },
        { label: "6M", days: 182 }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                        Stock Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Visualize and compare stock performance over time
                    </p>
                </div>

                {/*viewmode select card*/}
                <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    <button
                        onClick={() => {
                            setViewMode("compare");
                        }}
                        className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                            viewMode === "compare"
                                ? "bg-white shadow text-black"
                                : "text-gray-600 hover:text-black"
                        }`}
                    >
                        Compare
                    </button>

                    <button
                        onClick={() => {
                            setViewMode("single");

                            if (stocks.length > 0) {
                                setSelectedStock(stocks[stocks.length - 1]);
                            }
                        }}
                        className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                            viewMode === "single"
                                ? "bg-white shadow text-black"
                                : "text-gray-600 hover:text-black"
                        }`}
                    >
                        Single Stock
                    </button>
                </div>

                {/* Controls Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">

                    {/* Add Stock */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add Stock
                        </label>

                        <div className="flex rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-black">
                            <input
                                value={symbolInput}
                                onChange={(e) => setSymbolInput(e.target.value)}
                                placeholder="Enter ticker (AAPL)"
                                className="flex-1 px-4 py-2 outline-none"
                            />
                            <button
                                onClick={handleAddStock}
                                className="px-6 bg-black text-white hover:bg-gray-800 transition"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-2">
                            <span className="text-sm text-red-700">{errorMessage}</span>
                            <button
                                onClick={() => setErrorMessage(null)}
                                className="text-xs font-medium text-red-500 hover:text-red-700"
                            >
                                Dismiss
                            </button>
                        </div>
                    )}

                    {/* Range Selector + Average Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-4">

                        {/* Segmented Range Control */}
                        <div className="inline-flex rounded-lg bg-gray-100 p-1">
                            {ranges.map((range) => (
                                <button
                                    key={range.label}
                                    onClick={() => setSelectedRangeDays(range.days)}
                                    className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                                        selectedRangeDays === range.days
                                            ? "bg-white shadow text-black"
                                            : "text-gray-600 hover:text-black"
                                    }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        {/* Add Average Button */}
                        <button
                            onClick={handleAddAverage}
                            disabled={viewMode === "single"}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition
                                ${viewMode === "single"
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "border-gray-300 hover:bg-gray-100"
                            }`}
                        >
                            Toggle Average
                        </button>
                    </div>

                    {/* Legend */}
                    {stocks.length > 0 && (
                        <div className="flex flex-wrap gap-6 pt-2 border-t border-gray-100">
                            {stocks.map((stock) => (
                                <div
                                    key={stock.symbol}
                                    className="flex items-center gap-2"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: stock.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                  {stock.symbol}
                </span>

                                    {/* Color Picker */}
                                    <input
                                        type="color"
                                        value={stock.color || "#000000"}
                                        onChange={(e) =>
                                            setStocks((prev) =>
                                                prev.map((s) =>
                                                    s.symbol === stock.symbol
                                                        ? { ...s, color: e.target.value }
                                                        : s
                                                )
                                            )
                                        }
                                        className="w-5 h-5 p-0 border-0 cursor-pointer"
                                    />

                                    {stock.symbol !== "AVERAGE" && (
                                        <button
                                            onClick={() => {
                                                setStocks((prev) => {
                                                    const updated = prev.filter((s) => s.symbol !== stock.symbol);

                                                    if (selectedStock?.symbol === stock.symbol) {
                                                        setSelectedStock(updated.length > 0 ? updated[updated.length - 1] : null);
                                                    }

                                                    return updated;
                                                });
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chart Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    {stocks.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <p className="text-lg font-medium">
                                No stocks added yet
                            </p>
                            <p className="text-sm mt-2">
                                Add a ticker above to start visualizing performance.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <svg
                                ref={svgRef}
                                width={800}
                                height={400}
                                className="rounded-lg"
                            />
                        </div>
                    )}
                </div>

                {viewMode === "single" && selectedStock && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold">
                            {selectedStock.symbol} Overview
                        </h2>

                        <StockDetails stock={selectedStock} />
                    </div>
                )}

                {viewMode === "single" && selectedStock && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <div className="flex flex-col gap-6">

                            {selectedStock.indicators?.sma && (
                                <SMAChart data={selectedStock.indicators.sma} />
                            )}

                            {selectedStock.indicators?.rsi && (
                                <RSIChart data={selectedStock.indicators.rsi} />
                            )}

                        </div>
                    </div>
                )}

                {/* Import / Export Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-wrap items-center justify-between gap-4">

                    <div className="flex gap-3">
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition text-sm"
                        >
                            Export JSON
                        </button>

                        <button
                            onClick={async () => {
                                if (!session?.accessToken) {
                                    alert("You must be signed in");
                                    return;
                                }

                                const exportData = stocks.map((s) => ({
                                    symbol: s.symbol,
                                    values: s.values.map((v) => ({
                                        date: v.date.toISOString(),
                                        close: v.close,
                                    })),
                                    color: s.color,
                                }));
                                const result = await uploadToDrive(session.accessToken, exportData);
                                console.log("Uploaded to Drive:", result);
                                alert("Saved to Google Drive!");
                            }}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm"
                        >
                            Save to Google Drive
                        </button>

                        <label className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition text-sm cursor-pointer">
                            Import JSON
                            <input
                                type="file"
                                accept=".json"
                                multiple
                                onChange={handleImportJSON}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <p className="text-xs text-gray-400">
                        Save and load your custom chart configurations
                    </p>
                </div>

            </div>
        </div>
    );
}
