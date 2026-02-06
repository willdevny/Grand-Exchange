'use client'

import { signIn, useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function AuthPage() {
    const { data: session } = useSession()

    if (session) {
        redirect('/')
    }

    return (
        <div className="max-w-md bg-white border-4 border-black rounded-xl p-8 mt-8">
            <h1 className="text-2xl font-bold mb-4">
                Sign in to The Grand Exchange
            </h1>

            <p className="text-sm text-gray-700 mb-6">
                Sign in using your existing account to access stock analysis tools and AI insights.
            </p>

            <button
                onClick={() => signIn('google')}
                className="w-full bg-sky-500 text-white border-4 border-black rounded-xl py-3 font-semibold hover:bg-sky-600"
            >
                Sign in with Google
            </button>
        </div>
    )
}
