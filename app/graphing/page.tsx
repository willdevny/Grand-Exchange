"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

//type used for stock representation
type importedStock = {
    symbol: string; //stock ticker ex. MSFT, APPL, etc.
    values: { //stores a year's worth of values, each an array of date, close
        date: string;
        close: number; //closing price for given date
    }[];
    color?: string; //stores the assigned color
};

type StockApiResponseItem = {
    date: string;
    close: number;
};

//represents a single datapoint on a line
type DataPoint = {
    date: Date;
    close: number;
};

type Stock = {
    symbol: string;
    values: DataPoint[];
    color?: string;
};

type ViewMode = "compare" | "single";

function StockDetails({ stock }: { stock: Stock }) {
    if (!stock.values.length) return null;

    const latest = stock.values[stock.values.length - 1];
    const first = stock.values[0];

    const change = latest.close - first.close;
    const percentChange = (change / first.close) * 100;

    const high = Math.max(...stock.values.map(v => v.close));
    const low = Math.min(...stock.values.map(v => v.close));

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <DetailItem label="Latest Close" value={`$${latest.close.toFixed(2)}`} />
            <DetailItem label="6M Change" value={`$${change.toFixed(2)}`} />
            <DetailItem label="% Change" value={`${percentChange.toFixed(2)}%`} />
            <DetailItem label="6M High" value={`$${high.toFixed(2)}`} />
            <DetailItem label="6M Low" value={`$${low.toFixed(2)}`} />
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
    //stores all stocks currently on the graph
    const [stocks, setStocks] = useState<Stock[]>([]);
    //determines data time range and graph x axis
    const [selectedRangeDays, setSelectedRangeDays] = useState<number>(365);
    //controls input for stock ticker text field
    const [symbolInput, setSymbolInput] = useState("");
    //stores error messages meant for diaply
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    //controls viewmode
    const [viewMode, setViewMode] = useState<"compare" | "single">("compare");
    //stores specific stock for single viewmode
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

    //chart margins
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    //chart width and height
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    //default color scale
    const colorScale = d3.scaleOrdinal<string, string>(d3.schemeCategory10);

    // -----------------------
    // Fetch stock data via server API (WORK IN PROGRESS)
    // -----------------------
    const MAX_API_DAYS = 182; // ~6 months

    async function fetchStockData(symbol: string): Promise<DataPoint[]> {
        try {
            // determine actual request range

            const res = await fetch(`/api/stock/${symbol}?rangeDays=${MAX_API_DAYS}`);

            if (!res.ok) {
                const text = await res.text();
                console.error("API Error:", res.status, text);
                return [];
            }

            const raw = await res.json();
            console.log("RAW RESPONSE FULL:", JSON.stringify(raw, null, 2));

            if (!raw.data || !Array.isArray(raw.data)) {
                console.error("Unexpected API shape:", raw);
                return [];
            }

            // Parse dates as UTC
            const data: DataPoint[] = raw.data.map((item: StockApiResponseItem) => ({
                date: new Date(item.date),
                close: Number(item.close),
            }));

            // Sort oldest first
            data.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Slice to the client’s requested range (if user selected more than 6 months)
            const cutoffDate = new Date(Date.now() - selectedRangeDays * 24 * 60 * 60 * 1000);

            const slicedData = data.filter(d => d.date >= cutoffDate);

            console.log(`Fetched ${slicedData.length} valid points for ${symbol}`);

            return slicedData;
        } catch (err) {
            console.error("Failed to fetch stock data:", err);
            return [];
        }
    }

    // Generate random stock data
    // async function fetchStockData(symbol: string): Promise<DataPoint[]> {
    //     const data: DataPoint[] = [];
    //     const today = new Date();
    //     let price = Math.random() * 100;
    //
    //     const currentDate = new Date(today);
    //     let daysGenerated = 0;
    //
    //     while (daysGenerated < selectedRangeDays) {
    //         const day = currentDate.getDay();
    //
    //         // 0 = Sunday, 6 = Saturday
    //         if (day !== 0 && day !== 6) {
    //             price = price * (1 + (Math.random() - 0.5) * 0.02);
    //
    //             data.unshift({
    //                 date: new Date(currentDate),
    //                 close: parseFloat(price.toFixed(2)),
    //             });
    //
    //             daysGenerated++;
    //         }
    //
    //         currentDate.setDate(currentDate.getDate() - 1);
    //     }
    //
    //     return data;
    // }

    // -----------------------
    // Add stock
    // -----------------------
    async function handleAddStock() {
        const symbol = symbolInput.toUpperCase();

        if (!symbol) return;

        const values = await fetchStockData(symbol);
        if (values.length === 0) {
            setErrorMessage(`Could not fetch data for ${symbol}.`);
            return;
        }
        else{
            setErrorMessage(null)
        }

        const newStock = { symbol, values, color: colorScale(symbol) };

        if (viewMode === "single") {
            setSelectedStock(newStock);
            setStocks([newStock]); // optional: clear others
        } else {
            if (stocks.find((s) => s.symbol === symbol)) return;
            setStocks([...stocks, newStock]);
        }

        setSymbolInput("");
    }

    function handleAddAverage() {
        if (stocks.find((s) => s.symbol === "AVERAGE")) return;

        const averageStock = calculateAverageStock(stocks);

        if (!averageStock) return;

        setStocks((prev) => [...prev, averageStock]);
    }


    // -----------------------
    // Avg perfromance finder
    // -----------------------

    function calculateAverageStock(stocks: Stock[]): Stock | null {
        if (stocks.length === 0) return null;

        // Collect all unique dates across all stocks
        const allDates = Array.from(
            new Set(stocks.flatMap(s => s.values.map(v => v.date.getTime())))
        )
            .sort((a: number, b: number) => a - b)
            .map(t => new Date(t));

        const averagedValues: DataPoint[] = allDates.map(date => {
            const values = stocks.map(
                s => s.values.find(v => v.date.getTime() === date.getTime())?.close
            );

            const numericValues = values.map(v => v ?? 0);
            const avg = numericValues.reduce((sum, v) => sum + v, 0) / stocks.length;

            return { date, close: avg };
        });

        console.log("Calculated average stock with", averagedValues.length, "points");

        return { symbol: "AVERAGE", values: averagedValues, color: "#000000" };
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
                        date: new Date(v.date),
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
    // -----------------------
// Chart Rendering
// -----------------------
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // clear previous chart

        if (stocks.length === 0) return;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        if (stocks.length > 0 && stocks[0].values.length > 0) {
            console.log(
                "Date test:",
                stocks[0].values[0].date,
                stocks[0].values[0].date instanceof Date,
                isNaN(stocks[0].values[0].date.getTime())
            );
        }

        const cutoffDate = new Date(Date.now() - selectedRangeDays * 24 * 60 * 60 * 1000);

        const stocksToRender = stocks.map(stock => ({
            ...stock,
            values: stock.values
                .filter(v => v.date >= cutoffDate)
                .filter(v => !isNaN(v.date.getTime())),
        }));

        const allValues = stocksToRender.flatMap(s => s.values);
        if (allValues.length === 0) {
            console.warn("No valid data points to render chart.");
            return;
        }

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
        const xAxis = d3.axisBottom<Date>(xScale)
            .ticks(Math.min(10, selectedRangeDays))
            .tickFormat(d => d instanceof Date ? (selectedRangeDays <= 60 ? formatDay(d) : formatMonth(d)) : "");

        g.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
        g.append("g").call(d3.axisLeft(yScale));

        // Grid
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
            .selectAll("line")
            .attr("stroke", "#e5e7eb");

        // ----- DRAW LINES -----
        stocksToRender.forEach(stock => {
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

        console.log("Chart rendered for stocks:", stocksToRender.map(s => s.symbol));
    }, [stocks, selectedRangeDays]);

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
                        onClick={() => setViewMode("compare")}
                        className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                            viewMode === "compare"
                                ? "bg-white shadow text-black"
                                : "text-gray-600 hover:text-black"
                        }`}
                    >
                        Compare
                    </button>

                    <button
                        onClick={() => setViewMode("single")}
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
                            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition text-sm font-medium"
                        >
                            Add Average
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

                                    <button
                                        onClick={() =>
                                            setStocks(stocks.filter((s) => s.symbol !== stock.symbol))
                                        }
                                        className="text-xs text-red-500 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
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

                {/* Import / Export Card */}
                <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-wrap items-center justify-between gap-4">

                    <div className="flex gap-3">
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition text-sm"
                        >
                            Export JSON
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
