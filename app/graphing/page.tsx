"use client";

//type used for stock representation
type importedStock = {
    symbol: string; //stock ticker ex. MSFT, APPL, etc.
    values: { //stores a year's worth of values, each an array of date, close
        date: string;
        close: number; //closing price for given date
    }[];
    color?: string; //stores the assigned color
};


import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

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

export default function GraphingPage() {
    // used for manipulating the chart <svg>
    const svgRef = useRef<SVGSVGElement | null>(null);
    //stores all stocks currently on the graph
    const [stocks, setStocks] = useState<Stock[]>([]);
    //determines data time range and graph x axis
    const [selectedRangeDays, setSelectedRangeDays] = useState<number>(365);
    //controls input for stock ticker text field
    const [symbolInput, setSymbolInput] = useState("");

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

    // async function fetchStockData(symbol: string): Promise<DataPoint[]> {
    //     try {
    //         const res = await fetch(
    //             `/api/stock/${symbol}?rangeDays=${selectedRangeDays}`
    //         );
    //         const data = await res.json();
    //
    //         if (!Array.isArray(data) || data.length === 0) return [];
    //
    //         return data.map((item: any) => ({
    //             date: new Date(item.date),
    //             close: item.close,
    //         }));
    //     } catch (err) {
    //         console.error("Failed to fetch stock data:", err);
    //         return [];
    //     }
    // }

    // Generate random stock data
    async function fetchStockData(symbol: string): Promise<DataPoint[]> {
        const data: DataPoint[] = [];
        const today = new Date();
        let price = Math.random() * 100;

        const currentDate = new Date(today);
        let daysGenerated = 0;

        while (daysGenerated < selectedRangeDays) {
            const day = currentDate.getDay();

            // 0 = Sunday, 6 = Saturday
            if (day !== 0 && day !== 6) {
                price = price * (1 + (Math.random() - 0.5) * 0.02);

                data.unshift({
                    date: new Date(currentDate),
                    close: parseFloat(price.toFixed(2)),
                });

                daysGenerated++;
            }

            currentDate.setDate(currentDate.getDate() - 1);
        }

        return data;
    }

    // -----------------------
    // Add stock
    // -----------------------
    async function handleAddStock() {
        const symbol = symbolInput.toUpperCase();

        //prevents duplicates
        if (stocks.find((s) => s.symbol === symbol)) return;

        const values = await fetchStockData(symbol);
        if (values.length === 0) {
            alert(`Could not fetch data for ${symbol}.`);
            return;
        }

        //add stock to state
        setStocks([...stocks, { symbol, values, color: colorScale(symbol) }]);
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

        // Assume all stocks share same date structure (true for your generated data)
        const length = stocks[0].values.length;

        const averagedValues: DataPoint[] = [];

        for (let i = 0; i < length; i++) {
            const date = stocks[0].values[i].date;

            const avg =
                stocks.reduce((sum, stock) => {
                    const value = stock.values[i]?.close;
                    return sum + (value ?? 0);
                }, 0) / stocks.length;

            averagedValues.push({
                date,
                close: avg,
            });
        }

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
                    alert(`File ${file.name} is not valid JSON array`);
                    continue;
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
                    return newStocks;
                });

            } catch (err) {
                console.error("Failed to import JSON:", err);
                alert(`Failed to import file ${file.name}: ${err}`);
            }
        }

        // Clear the file input so same file can be re-imported if needed
        event.target.value = "";
    }


    // -----------------------
    // Chart Rendering
    // -----------------------
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);

        //clear chart before attempting to render
        svg.selectAll("*").remove();

        // Detect dark mode from html class (works with your existing toggle)
        const isDark =
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark");

        const axisColor = isDark ? "#e5e7eb" : "#111827"; // light gray vs near-black
        const gridColor = isDark ? "rgba(229,231,235,0.25)" : "#e5e7eb";

        //create inner group for chart content
        const g = svg.append("g").attr(
            "transform",
            `translate(${margin.left},${margin.top})`
        );

        // cuts off data outside of selected range
        if (stocks.length === 0) return;

        const stocksToRender = stocks.map(stock => ({
            ...stock,
            values: stock.values.slice(-selectedRangeDays)
        }));

        // Flatten all values
        const allValues = stocksToRender.flatMap((s) => s.values);

        // ----- X SCALE (Trading Days Evenly Spaced) -----

        const dates = allValues.map(d => d.date);

        const xScale = d3
            .scalePoint<Date>()
            .domain(dates)
            .range([0, width]);

        // ----- Y SCALE -----

        const yMin = d3.min(allValues, d => d.close) ?? 0;
        const yMax = d3.max(allValues, d => d.close) ?? 0;

        const yScale = d3
            .scaleLinear()
            .domain([yMin, yMax])
            .range([height, 0])
            .nice();

        // ----- LINE -----

        const line = d3
            .line<DataPoint>()
            .x(d => xScale(d.date) ?? 0)
            .y(d => yScale(d.close));

        // ----- AXIS -----

        const formatDay = d3.timeFormat("%b %d");
        const formatMonth = d3.timeFormat("%b '%y");

        // With scalePoint, we manually control ticks
        let tickValues: Date[];

        if (selectedRangeDays <= 14) {
            tickValues = dates.filter((_, i) => i % 2 === 0);
        } else if (selectedRangeDays <= 60) {
            tickValues = dates.filter((_, i) => i % 5 === 0);
        } else if (selectedRangeDays <= 200) {
            tickValues = dates.filter((_, i) => i % 21 === 0); // ~monthly trading days
        } else {
            tickValues = dates.filter((_, i) => i % 42 === 0); // ~2 months
        }

        const xAxis = d3
            .axisBottom<Date>(xScale)
            .tickValues(tickValues)
            .tickFormat(selectedRangeDays <= 60 ? formatDay : formatMonth);


        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);
        g.append("g").call(d3.axisLeft(yScale));

        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisLeft(yScale)
                    .tickSize(-width)
                    .tickFormat(() => "")
            )
            .selectAll("line")
            .attr("stroke", "#e5e7eb");

        stocksToRender.forEach((stock) => {
            g.append("path")
                .datum(stock.values)
                .attr("fill", "none")
                .attr("stroke", stock.color!)
                .attr("stroke-width", stock.symbol === "AVERAGE" ? 3 : 2)
                .attr("d", line)
                .attr("opacity", 0)
                .transition()
                .duration(500)
                .attr("opacity", 1);
        });
    }, [stocks, selectedRangeDays]);

    // -----------------------
    // UI
    // -----------------------
    const ranges = [
        { label: "7D", days: 7 },
        { label: "30D", days: 30 },
        { label: "6M", days: 182 },
        { label: "1YR", days: 365 },
    ];

    return (
        <div className="py-10 px-4">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="card p-6">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Stock Graphing Dashboard
                    </h1>
                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                        Visualize and compare stock performance over time
                    </p>
                </div>

                {/* Controls Card */}
                <div className="card p-6 space-y-6">
                    {/* Add Stock */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Add Stock
                        </label>

                        <div className="flex rounded-lg overflow-hidden border-4 border-black dark:border-white/20 focus-within:ring-2 focus-within:ring-black">
                            <input
                                value={symbolInput}
                                onChange={(e) => setSymbolInput(e.target.value)}
                                placeholder="Enter ticker (AAPL)"
                                className="flex-1 px-4 py-2 outline-none bg-white dark:bg-gray-900 dark:text-white"
                            />
                            <button
                                onClick={handleAddStock}
                                className="px-6 bg-black text-white hover:bg-gray-800 transition"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Range Selector + Average Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                            {ranges.map((range) => (
                                <button
                                    key={range.label}
                                    onClick={() => setSelectedRangeDays(range.days)}
                                    className={`px-4 py-1 rounded-md text-sm font-medium transition ${
                                        selectedRangeDays === range.days
                                            ? "bg-white dark:bg-gray-900 shadow text-black dark:text-white"
                                            : "text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                                    }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleAddAverage}
                            className="px-4 py-2 rounded-lg border-4 border-black dark:border-white/20 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium"
                        >
                            Add Average
                        </button>
                    </div>

                    {/* Legend */}
                    {stocks.length > 0 && (
                        <div className="flex flex-wrap gap-6 pt-2 border-t border-black/10 dark:border-white/10">
                            {stocks.map((stock) => (
                                <div key={stock.symbol} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: stock.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {stock.symbol}
                  </span>

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
                <div className="card p-6">
                    {stocks.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                            <p className="text-lg font-medium">No stocks added yet</p>
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
                                className="rounded-lg bg-white dark:bg-gray-950"
                            />
                        </div>
                    )}
                </div>

                {/* Import / Export Card */}
                <div className="card p-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-3">
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition text-sm"
                        >
                            Export JSON
                        </button>

                        <label className="px-4 py-2 rounded-lg border-4 border-black dark:border-white/20 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm cursor-pointer">
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

                    <p className="text-xs text-gray-700 dark:text-gray-400">
                        Save and load your custom chart configurations
                    </p>
                </div>
            </div>
        </div>
    );
}