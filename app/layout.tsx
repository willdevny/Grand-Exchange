import './globals.css'
import Navbar from '@/components/Navbar'
import HelpPanel from '@/components/HelpPanel'

export const metadata = {
    title: 'Stock Decision App',
    description: 'AI-powered stock decision platform',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className="bg-gray-100 text-gray-900">
        <Navbar />
        <HelpPanel />

        {/* Page content area */}
        <main className="pt-[70px] pr-[260px] px-1">
            {children}
        </main>
        </body>
        </html>
    )
}
