import './globals.css'
import Navbar from '@/components/Navbar'
import HelpPanel from '@/components/HelpPanel'
import Providers from './providers'

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className="bg-gray-100 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
        <Providers>
            <Navbar />
            <HelpPanel />
            <main className="pt-[70px] pr-[260px] px-1">
                {children}
            </main>
        </Providers>
        </body>
        </html>
    )
}
