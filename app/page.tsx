export default function Home() {
    return (
        <div className="space-y-10">
            {/* Hero / Greeting Section */}
            <section className="bg-white border-4 border-black rounded-xl p-8">
                <h1 className="text-4xl font-extrabold mb-4">
                    The Grand Exchange
                </h1>

                <p className="text-lg mb-4">
                    The Grand Exchange is an intelligent stock analysis platform designed
                    to help you make informed investment decisions with confidence.
                </p>

                <p className="text-base text-gray-700">
                    Use the navigation bar above to explore market trends, analyze stock
                    performance, and leverage AI-driven insights — all in one place.
                </p>
            </section>

            {/* Features Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard
                    title="Trending Stocks"
                    description="Discover stocks that are gaining momentum based on market data and volume."
                />

                <FeatureCard
                    title="Stock Graphing"
                    description="Visualize historical price movements, indicators, and trends with interactive charts."
                />

                <FeatureCard
                    title="Stock Agent (AI)"
                    description="Ask questions, analyze scenarios, and get AI-powered insights tailored to your investment goals."
                />
            </section>
        </div>
    )
}

/* ---------- Components ---------- */

function FeatureCard({
                         title,
                         description,
                     }: {
    title: string
    description: string
}) {
    return (
        <div className="bg-white border-4 border-black rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">
                {title}
            </h2>
            <p className="text-sm text-gray-700">
                {description}
            </p>
        </div>
    )
}
