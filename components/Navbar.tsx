'use client'

import { useState, type ReactNode } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useDarkMode } from '@/app/hooks/useDarkMode'
import Link from 'next/link'

export default function Navbar() {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const { data: session } = useSession()
    const { enabled, toggle } = useDarkMode()

    // Avatar fallback support
    const [avatarOk, setAvatarOk] = useState(true)
    const userInitial =
        session?.user?.name?.trim()?.[0]?.toUpperCase() ??
        session?.user?.email?.trim()?.[0]?.toUpperCase() ??
        'U'
    const imageSrc = session?.user?.image

    const isAuthed = !!session

    return (
        <header className="fixed top-0 left-0 w-full h-[70px] bg-sky-500 dark:bg-gray-900 border-b-4 border-black z-50 flex items-center justify-between px-6 transition-colors duration-300">
            {/* LEFT SIDE NAV */}
            <div className="flex gap-3 items-center">
                <NavButton href="/">Home</NavButton>
                <NavButton href="/trending">Trending Stocks</NavButton>

                {/* Protected buttons */}
                <ProtectedNavButton
                    isAuthed={isAuthed}
                    href="/graphing"
                    label="Stock Graphing"
                />
                <ProtectedNavButton
                    isAuthed={isAuthed}
                    href="/agent"
                    label="Stock Agent (AI)"
                />
            </div>

            {/* RIGHT SIDE NAV */}
            <div className="flex gap-3 items-center">
                {isAuthed ? (
                    <>
                        {/* Avatar (safe fallback) */}
                        <div className="w-7 h-7 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-white dark:bg-gray-800">
                            {imageSrc && imageSrc.startsWith('http') && avatarOk ? (
                                <img
                                    src={imageSrc}
                                    alt="User profile"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={() => setAvatarOk(false)}
                                />
                            ) : (
                                <span className="text-[10px] font-extrabold text-black dark:text-white">
                  {userInitial}
                </span>
                            )}
                        </div>

                        <button
                            onClick={() => signOut()}
                            className="bg-white dark:bg-gray-700 dark:text-white border-4 border-black rounded-xl px-4 py-2 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
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
                        className="bg-white dark:bg-gray-700 dark:text-white border-4 border-black rounded-xl px-4 py-2 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                        Settings
                    </button>

                    {settingsOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 dark:text-white border-4 border-black rounded-xl p-4 space-y-3 transition-colors duration-300">
                            {/* DARK MODE TOGGLE */}
                            <label className="flex justify-between items-center text-sm">
                                Dark Mode
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={toggle}
                                    className="cursor-pointer"
                                />
                            </label>

                            {/* OTHER SETTINGS */}
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
            className="bg-white dark:bg-gray-700 dark:text-white border-4 border-black rounded-xl px-4 py-2 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        >
            {children}
        </Link>
    )
}

function ProtectedNavButton({
                                isAuthed,
                                href,
                                label,
                            }: {
    isAuthed: boolean
    href: string
    label: string
}) {
    // If not authed, send them to /auth and preserve where they wanted to go
    const target = isAuthed ? href : `/auth?callbackUrl=${encodeURIComponent(href)}`

    return (
        <Link
            href={target}
            className={[
                "bg-white dark:bg-gray-700 dark:text-white border-4 border-black rounded-xl px-4 py-2 font-semibold transition flex items-center gap-2",
                isAuthed
                    ? "hover:bg-gray-200 dark:hover:bg-gray-600"
                    : "opacity-80 hover:bg-gray-200 dark:hover:bg-gray-600",
            ].join(' ')}
            title={
                isAuthed
                    ? label
                    : `Locked: sign in required to access ${label}`
            }
            aria-label={label}
        >
            {!isAuthed && <span aria-hidden="true">🔒</span>}
            <span>{label}</span>
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
