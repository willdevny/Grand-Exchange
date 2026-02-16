'use client'

import { useEffect, useState } from 'react'

export function useDarkMode() {
    const [enabled, setEnabled] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('darkMode') === 'true'
    })

    useEffect(() => {
        document.documentElement.classList.toggle('dark', enabled)
        localStorage.setItem('darkMode', String(enabled))
    }, [enabled])

    const toggle = () => setEnabled((prev) => !prev)

    return { enabled, toggle }
}
