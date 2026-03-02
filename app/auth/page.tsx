'use client'

import { signIn, useSession } from 'next-auth/react'
import { redirect, useSearchParams } from 'next/navigation'

export default function AuthPage() {
    const { data: session } = useSession()
    const searchParams = useSearchParams()

    if (session) {
        redirect('/')
    }

    const callbackUrl = searchParams.get('callbackUrl') ?? ''

    let reason: string | null = null
    if (callbackUrl.includes('/graphing')) {
        reason = 'You must be signed in to access Stock Graphing.'
    } else if (callbackUrl.includes('/agent')) {
        reason = 'You must be signed in to access the Stock Agent.'
    }

    return (
        <div className="max-w-md mt-8">
            <section className="card p-8">
                <h1 className="text-2xl font-bold mb-3">
                    Sign in to The Grand Exchange
                </h1>

                {reason ? (
                    <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                        {reason} Please sign in with Google to continue.
                    </p>
                ) : (
                    <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                        Sign in with Google to access your personalized features and AI insights.
                    </p>
                )}

                <button
                    onClick={() => signIn('google', { callbackUrl: callbackUrl || '/' })}
                    className="w-full bg-white dark:bg-gray-900 border-4 border-black dark:border-white/20 rounded-xl py-3 font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                >
                    Sign in with Google
                </button>
            </section>
        </div>
    )
}
