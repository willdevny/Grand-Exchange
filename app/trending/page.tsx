"use client"
import { useState, useEffect } from "react"

// 🔹 Static stock info only
const stockInfo = {
    DD: { name: "DuPont", logo: "/stockLogos/DD_logo.png" },
    HAL: { name: "Halliburton", logo: "/stockLogos/HAL_logo.png" },
    NOC: { name: "Northrop Grumman", logo: "/stockLogos/NOC_logo.png" },
    PRU: { name: "Prudential Financial", logo: "/stockLogos/PRU_logo.png" },
    TRV: { name: "Travelers", logo: "/stockLogos/TRV_logo.png" },
    KO: { name: "Coca-Cola", logo: "/stockLogos/KO_logo.png" },
    CVX: { name: "Chevron", logo: "/stockLogos/CVX_logo.png" },
    BLK: { name: "BlackRock", logo: "/stockLogos/BLK_logo.png" },
    F: { name: "Ford", logo: "/stockLogos/F_logo.png" },
    INTC: { name: "Intel", logo: "/stockLogos/INTC_logo.png" },
}

// 🔹 Arrow component
function PredictionArrow({ value }) {
    const isPositive = value >= 0

    const size =
        Math.abs(value) > 10
            ? "text-4xl"
            : Math.abs(value) > 6
                ? "text-3xl"
                : Math.abs(value) > 3
                    ? "text-2xl"
                    : "text-xl"

    const color = isPositive ? "text-green-500" : "text-red-500"

    return (
        <div className={`flex flex-col items-center ${color}`}>
            <span className={size}>
                {isPositive ? "▲" : "▼"}
            </span>

            <span className="text-xs">
                {value.toFixed(1)}%
            </span>
        </div>
    )
}

// 🔹 Stock card
function StockCard({ stock }) {
    const logoUrl = stock.logo

    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-gray-800 shadow hover:shadow-lg transition">

            {/* Left: logo + name */}
            <div className="flex items-center space-x-4">
                <img
                    src={logoUrl}
                    alt={stock.name}
                    className="w-12 h-12 rounded-full bg-white p-1"
                    onError={(e) => {
                        e.target.src = `https://via.placeholder.com/50?text=${stock.ticker}`
                    }}
                />

                <div>
                    <div className="font-semibold text-lg">
                        {stock.name}
                    </div>

                    <div className="text-gray-500 text-sm">
                        {stock.ticker}
                    </div>
                </div>
            </div>

            {/* Right: predictions */}
            <div className="flex space-x-6">

                <div className="text-center">
                    <div className="text-xs text-gray-400">2W</div>
                    <PredictionArrow value={stock.predictions.d2w} />
                </div>

                <div className="text-center">
                    <div className="text-xs text-gray-400">1M</div>
                    <PredictionArrow value={stock.predictions.d1m} />
                </div>

                <div className="text-center">
                    <div className="text-xs text-gray-400">3M</div>
                    <PredictionArrow value={stock.predictions.d3m} />
                </div>

            </div>
        </div>
    )
}

// 🔹 Main page
export default function TrendingPage() {
    const [stocks, setStocks] = useState([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        async function fetchPredictions() {
            const controller = new AbortController()
            const timeoutId = window.setTimeout(() => controller.abort(), 10000)

            try {
                setLoading(true)
                setErrorMessage(null)

                const response = await fetch(
                    "http://71.113.149.31:5000/getPredictions",
                    { signal: controller.signal }
                )

                if (!response.ok) {
                    throw new Error(`Prediction server returned ${response.status}`)
                }

                const data = await response.json()

                /*
                  Expected format:
                  {
                    "DD_2week": 3.6,
                    "DD_1month": 2.1,
                    "DD_3month": -1.5,
                    ...
                  }
                */

                const groupedStocks = {}

                Object.keys(data).forEach((key) => {
                    const [ticker, period] = key.split("_")

                    if (!groupedStocks[ticker]) {
                        groupedStocks[ticker] = {
                            ticker,
                            name: stockInfo[ticker]?.name || ticker,
                            logo: stockInfo[ticker]?.logo || "",
                            predictions: {
                                d2w: 0,
                                d1m: 0,
                                d3m: 0,
                            },
                        }
                    }

                    // Multiply by 100 for percent
                    const value = data[key] * 100

                    if (period === "2week") {
                        groupedStocks[ticker].predictions.d2w = value
                    }

                    if (period === "1month") {
                        groupedStocks[ticker].predictions.d1m = value
                    }

                    if (period === "3month") {
                        groupedStocks[ticker].predictions.d3m = value
                    }
                })

                setStocks(Object.values(groupedStocks))

                if (Object.keys(groupedStocks).length === 0) {
                    setErrorMessage("The prediction server responded, but did not return any trending stock predictions.")
                }
            } catch (error) {
                console.error("Error fetching predictions:", error)
                setStocks([])
                setErrorMessage("Could not load trending stock predictions. The Flask prediction server may be offline or not responding.")
            } finally {
                window.clearTimeout(timeoutId)
                setLoading(false)
            }
        }

        fetchPredictions()
    }, [])

    return (
        <div className="space-y-10 p-6">

            {/* Header */}
            <section className="card p-8">
                <h1 className="text-4xl font-extrabold mb-4">
                    Trending Stocks
                </h1>

                <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">
                    Below are machine learning return predictions for trending companies.
                </p>
            </section>

            {loading && (
                <div className="card p-6 max-w-6xl mx-auto border-sky-500 dark:border-sky-400">
                    <div className="font-semibold text-lg">
                        Loading predictions...
                    </div>
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                        Waiting for the Flask prediction server to respond.
                    </p>
                </div>
            )}

            {!loading && errorMessage && (
                <div className="card p-6 max-w-6xl mx-auto border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950/30">
                    <div className="font-semibold text-lg text-red-800 dark:text-red-200">
                        Trending predictions are unavailable
                    </div>
                    <p className="mt-2 text-red-700 dark:text-red-200">
                        {errorMessage}
                    </p>
                </div>
            )}

            {!loading && !errorMessage && stocks.length === 0 && (
                <div className="card p-6 max-w-6xl mx-auto border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
                    <div className="font-semibold text-lg text-yellow-900 dark:text-yellow-100">
                        No predictions to show
                    </div>
                    <p className="mt-2 text-yellow-800 dark:text-yellow-100">
                        The prediction request completed, but no stock predictions were returned.
                    </p>
                </div>
            )}

            {/* Grid */}
            {stocks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                    {stocks.map((stock, index) => (
                        <StockCard key={index} stock={stock} />
                    ))}
                </div>
            )}

        </div>
    )
}
