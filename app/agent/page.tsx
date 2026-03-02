'use client'

import { useEffect, useRef, useState } from 'react'

type ChatMessage = {
    id: string
    role: 'user' | 'agent'
    content: string
    timestamp: number
}

export default function AgentPage() {
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            id: 'welcome',
            role: 'agent',
            content:
                "Welcome to the Stock Agent. Ask me anything about a stock you're interested in (chat is local for now).",
            timestamp: 0, // deterministic: avoids Date.now() during render
        },
    ])

    const [input, setInput] = useState('')
    const logRef = useRef<HTMLDivElement | null>(null)

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        logRef.current?.scrollTo({
            top: logRef.current.scrollHeight,
            behavior: 'smooth',
        })
    }, [messages])

    function sendMessage() {
        const text = input.trim()
        if (!text) return

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now(), // OK: runs on click, not during render
        }

        setMessages((prev) => [...prev, userMsg])
        setInput('')

        setTimeout(() => {
            const agentMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'agent',
                content:
                    "Got it — the AI agent isn't connected yet, but your message was received.",
                timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, agentMsg])
        }, 500)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="space-y-10">
            <section className="card p-8">
                <h1 className="text-4xl font-extrabold mb-4">Stock Agent</h1>
                <p className="text-lg mb-2 text-gray-700 dark:text-gray-300">
                    Ask our customized agent questions about stocks you may be interested in.
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                    (The AI backend is not connected yet — this is a UI demo.)
                </p>
            </section>

            <section className="card p-6 space-y-4">
                <div
                    ref={logRef}
                    className="h-[420px] overflow-y-auto rounded-xl border-4 border-black dark:border-white/20 bg-white dark:bg-gray-950 p-4 space-y-3"
                >
                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
                    ))}
                </div>

                <div className="flex gap-3 items-end">
          <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a stock (e.g., 'What are the risks of NVDA right now?')"
              className="flex-1 min-h-[52px] max-h-[140px] resize-y bg-white dark:bg-gray-900 dark:text-white border-4 border-black dark:border-white/20 rounded-xl px-4 py-3 text-sm outline-none"
          />

                    <button
                        onClick={sendMessage}
                        className="bg-white dark:bg-gray-900 dark:text-white border-4 border-black dark:border-white/20 rounded-xl px-5 py-3 font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                    >
                        Send
                    </button>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-400">
                    Press <span className="font-semibold">Enter</span> to send. Hold{' '}
                    <span className="font-semibold">Shift + Enter</span> for a new line.
                </p>
            </section>
        </div>
    )
}

function MessageBubble({
                           role,
                           content,
                       }: {
    role: 'user' | 'agent'
    content: string
}) {
    const isUser = role === 'user'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={[
                    'max-w-[80%] rounded-xl border-4 border-black dark:border-white/20 px-4 py-3 text-sm',
                    isUser ? 'bg-sky-200 dark:bg-sky-900/40' : 'bg-gray-100 dark:bg-gray-900',
                ].join(' ')}
            >
                <div className="text-xs font-bold mb-1">{isUser ? 'You' : 'Agent'}</div>
                <div className="whitespace-pre-wrap">{content}</div>
            </div>
        </div>
    )
}
