"use client"
import { useState, useEffect } from "react"

// 🔹 Stock data WITH local + fallback logos
const stocksData = [
    { name: "DuPont", ticker: "DD", logo: "/stockLogos/DD_logo.png", predictions: { d30: -2, d60: -3, d90: -8 } },
    { name: "Halliburton", ticker: "HAL", logo: "/stockLogos/HAL_logo.png", predictions: { d30: 2, d60: 1, d90: -1 } },
    { name: "Northrop Grumman", ticker: "NOC", logo: "/stockLogos/NOC_logo.png", predictions: { d30: 1, d60: 1, d90: 3 } },
    { name: "Prudential Financial", ticker: "PRU", logo: "/stockLogos/PRU_logo.png", predictions: { d30: -1, d60: 3, d90: 4 } },
    { name: "Travelers", ticker: "TRV", logo: "/stockLogos/TRV_logo.png", predictions: { d30: -2, d60: -3, d90: -2 } },
    { name: "Coca-Cola", ticker: "KO", logo: "/stockLogos/KO_logo.png", predictions: { d30: 3, d60: 2, d90: 5 } },
    { name: "Chevron", ticker: "CVX", logo: "/stockLogos/CVX_logo.png", predictions: { d30: -2, d60: -1, d90: 3 } },
    { name: "BlackRock", ticker: "BLK", logo: "/stockLogos/BLK_logo.png", predictions: { d30: -3, d60: -2, d90: 3 } },
    { name: "Ford", ticker: "F", logo: "/stockLogos/F_logo.png", predictions: { d30: -2, d60: -1, d90: 1 } },
    { name: "Intel", ticker: "INTC", logo: "/stockLogos/INTC_logo.png", predictions: { d30: -2, d60: -2, d90: 1 } },
];

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
            <span className="text-xs">{value}%</span>
        </div>
    )
}

// 🔹 Stock card
function StockCard({ stock }) {
    // ✅ FIX: use local logo first, fallback to Clearbit
    const logoUrl =
        stock.logo || `https://logo.clearbit.com/${stock.domain}`

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
                    <div className="text-xs text-gray-400">30D</div>
                    <PredictionArrow value={stock.predictions.d30} />
                </div>

                <div className="text-center">
                    <div className="text-xs text-gray-400">60D</div>
                    <PredictionArrow value={stock.predictions.d60} />
                </div>

                <div className="text-center">
                    <div className="text-xs text-gray-400">90D</div>
                    <PredictionArrow value={stock.predictions.d90} />
                </div>
            </div>
        </div>
    )
}

// 🔹 Main page
export default function TrendingPage() {
    const [stocks, setStocks] = useState([])

    useEffect(() => {
        setStocks(stocksData)
    }, [])

    return (
        <div className="space-y-10 p-6">

            {/* Header */}
            <section className="card p-8">
                <h1 className="text-4xl font-extrabold mb-4">
                    Trending Stocks
                </h1>

                <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">
                    Below are machine learning return predictions for 10 trending companies.
                </p>
            </section>

            {/* Grid: 2 per row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {stocks.map((stock, index) => (
                    <StockCard key={index} stock={stock} />
                ))}
            </div>

        </div>
    )
}