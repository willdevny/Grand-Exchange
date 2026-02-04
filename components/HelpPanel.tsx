export default function HelpPanel() {
    return (
        <aside className="fixed right-0 top-[70px] w-[260px] h-[calc(100vh-70px)] bg-white border-l-4 border-black p-5">
            <h2 className="font-bold text-lg mb-2">Help Info</h2>
            <p className="text-sm">
                Navigate using the top bar to explore stocks, visualize trends, or
                consult the AI stock agent for insights.
            </p>
        </aside>
    )
}
