export default function HelpPanel() {
    return (
        <aside className="fixed right-0 top-[70px] h-[calc(100vh-70px)] w-[260px] overflow-y-auto border-l-4 border-black bg-white p-4 dark:border-white/20 dark:bg-gray-950">
            <h2 className="mb-4 text-lg font-extrabold">Help Info</h2>

            <div className="space-y-4 text-sm text-gray-800 dark:text-gray-200">
                <section>
                    <h3 className="font-bold">Site Navigation</h3>
                    <p className="mt-1">
                        Navigate using the top bar to move between the Home,
                        Trending Stocks, Stock Graphing, and Stock Agent pages.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold">How to Use the Stock Agent</h3>
                    <p className="mt-1">
                        Enter a stock ticker such as <span className="font-semibold">AAPL</span>{' '}
                        or a company name such as <span className="font-semibold">Apple</span>{' '}
                        into the input box. Submit one stock at a time to generate
                        a focused report.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold">What the Agent Returns</h3>
                    <p className="mt-1">
                        The AI stock agent returns a structured summary that may
                        include:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>market indicator data</li>
                        <li>recent news sentiment</li>
                        <li>public social sentiment</li>
                        <li>linked source articles for reference</li>
                    </ul>
                </section>

                <section>
                    <h3 className="font-bold">What This Site Is For</h3>
                    <p className="mt-1">
                        This website is intended to generate stock analysis context, create visual stock graphs, and generate detailed prediction and analysis
                        reports. The Trending Stocks page data contains our custom trained machine learning based data on top stocks. The Tracker page allows
                        users to track specified stocks to see their live price and news articles. The Youtube page pulls sentiment analysis from Youtube comments.
                        The Stock Graphing page allows users to build and export customizable stock graphs. The Stock Agent page inputs a stock ticker and returns a
                        detailed report of the collected data and an AI powered analysis and prediction.
                    </p>
                </section>

                <section>
                    <h3 className="font-bold">Notes</h3>
                    <p className="mt-1">
                        Some data sources may occasionally be unavailable. When that
                        happens, the system will return the remaining available
                        signals and continue generating a partial report.
                    </p>
                </section>
            </div>
        </aside>
    )
}