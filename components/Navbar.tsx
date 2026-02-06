'use client'

import { useState, type ReactNode } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

export default function Navbar() {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const { data: session } = useSession()

    return (
        <header className="fixed top-0 left-0 w-full h-[70px] bg-sky-500 border-b-4 border-black z-50 flex items-center justify-between px-6">
            {/* LEFT SIDE NAV */}
            <div className="flex gap-3 items-center">
                <NavButton href="/">Home</NavButton>
                <NavButton href="/trending">Trending Stocks</NavButton>
                <NavButton href="/graphing">Stock Graphing</NavButton>
                <NavButton href="/agent">Stock Agent (AI)</NavButton>
            </div>

            {/* RIGHT SIDE NAV */}
            <div className="flex gap-3 items-center">
                {session ? (
                    <>
                        {session.user?.image && (
                            <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden flex items-center justify-center">
                                <img
                                    src={session.user.image}
                                    alt="User profile"
                                    className="min-w-full min-h-full object-cover"
                                />
                            </div>
                        )}

                        <button
                            onClick={() => signOut()}
                            className="bg-white border-4 border-black rounded-xl px-4 py-2 font-semibold hover:bg-gray-200"
                        >
                            Sign Out
                        </button>
                    </>
                ) : (
                    <NavButton href="/auth">Sign In / Up</NavButton>
                )}

                <div className="relative">
                    <button
                        onClick={() => setSettingsOpen((prev) => !prev)}
                        className="bg-white border-4 border-black rounded-xl px-4 py-2 font-semibold hover:bg-gray-200"
                    >
                        Settings
                    </button>

                    {settingsOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border-4 border-black rounded-xl p-4 space-y-3">
                            <Setting label="Dark Mode" />
                            <Setting label="Show Tooltips" defaultChecked />
                            <Setting label="Experimental AI" />
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

/* ---------- Components ---------- */

function NavButton({
                       href,
                       children,
                   }: {
    href: string
    children: ReactNode
}) {
    return (
        <Link
            href={href}
            className="bg-white border-4 border-black rounded-xl px-4 py-2 font-semibold hover:bg-gray-200"
        >
            {children}
        </Link>
    )
}

function Setting({
                     label,
                     defaultChecked = false,
                 }: {
    label: string
    defaultChecked?: boolean
}) {
    return (
        <label className="flex justify-between items-center text-sm">
            {label}
            <input type="checkbox" defaultChecked={defaultChecked} />
        </label>
    )
}
