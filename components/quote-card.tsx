'use client'

import { useState, useEffect } from 'react'
import { X, Quote } from 'lucide-react'

// Curated fallback quotes (work/motivational only)
const FALLBACK_QUOTES = [
  { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
  { q: "Success is not final, failure is not fatal: it is the courage to continue that counts.", a: "Winston Churchill" },
  { q: "Your time is limited, don't waste it living someone else's life.", a: "Steve Jobs" },
  { q: "The best time to plant a tree was 20 years ago. The second best time is now.", a: "Chinese Proverb" },
  { q: "It does not matter how slowly you go as long as you do not stop.", a: "Confucius" },
  { q: "Everything you've ever wanted is on the other side of fear.", a: "George Addair" },
  { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
  { q: "The future depends on what you do today.", a: "Mahatma Gandhi" },
  { q: "Don't watch the clock; do what it does. Keep going.", a: "Sam Levenson" },
  { q: "Act as if what you do makes a difference. It does.", a: "William James" },
  { q: "What you get by achieving your goals is not as important as what you become.", a: "Zig Ziglar" },
  { q: "You are never too old to set another goal or to dream a new dream.", a: "C.S. Lewis" },
  { q: "In the middle of difficulty lies opportunity.", a: "Albert Einstein" },
  { q: "Quality is not an act, it is a habit.", a: "Aristotle" },
  { q: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { q: "Focus on being productive instead of busy.", a: "Tim Ferriss" },
  { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
  { q: "The way to get started is to quit talking and begin doing.", a: "Walt Disney" },
  { q: "Innovation distinguishes between a leader and a follower.", a: "Steve Jobs" },
  { q: "Hard work beats talent when talent doesn't work hard.", a: "Tim Notke" },
]

// Gradient backgrounds that rotate
const GRADIENTS = [
  'from-orange-600 via-amber-500 to-yellow-400',
  'from-violet-600 via-purple-500 to-indigo-400',
  'from-emerald-600 via-teal-500 to-cyan-400',
  'from-rose-600 via-pink-500 to-fuchsia-400',
  'from-blue-600 via-sky-500 to-cyan-400',
  'from-amber-600 via-orange-500 to-red-400',
]

// Get a consistent index based on 4-hour time blocks
function getTimeBlockIndex(max: number): number {
  const hours = new Date().getHours()
  const block = Math.floor(hours / 4) // 0-5 (six 4-hour blocks per day)
  const day = new Date().getDate()
  return (block + day) % max
}

export function QuoteCard() {
  const [quote, setQuote] = useState<{ q: string; a: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if dismissed within the current 4-hour block
    const currentBlock = Math.floor(new Date().getHours() / 4)
    const storedBlock = sessionStorage.getItem('quote_dismissed_block')
    if (storedBlock === String(currentBlock)) {
      setDismissed(true)
      return
    }

    // Try to get from cache first
    const cached = sessionStorage.getItem('quote_cache')
    const cachedBlock = sessionStorage.getItem('quote_cache_block')
    if (cached && cachedBlock === String(currentBlock)) {
      setQuote(JSON.parse(cached))
      return
    }

    // Fetch from API
    fetch('https://zenquotes.io/api/random')
      .then(r => r.json())
      .then(data => {
        if (data?.[0]?.q) {
          const q = { q: data[0].q, a: data[0].a }
          setQuote(q)
          sessionStorage.setItem('quote_cache', JSON.stringify(q))
          sessionStorage.setItem('quote_cache_block', String(currentBlock))
        }
      })
      .catch(() => {
        // Fallback to curated quotes
        const idx = getTimeBlockIndex(FALLBACK_QUOTES.length)
        setQuote(FALLBACK_QUOTES[idx])
      })
  }, [])

  function handleDismiss() {
    const currentBlock = Math.floor(new Date().getHours() / 4)
    sessionStorage.setItem('quote_dismissed_block', String(currentBlock))
    setDismissed(true)
  }

  if (!mounted || dismissed || !quote) return null

  const gradientIdx = getTimeBlockIndex(GRADIENTS.length)
  const gradient = GRADIENTS[gradientIdx]

  return (
    <div className={`relative bg-gradient-to-r ${gradient} rounded-2xl p-6 sm:p-8 overflow-hidden`}>
      {/* Dismiss button */}
      <button onClick={handleDismiss} className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>

      {/* Quote icon */}
      <Quote className="w-8 h-8 text-white/30 mb-3" />

      {/* Quote text */}
      <p className="text-white text-lg sm:text-xl font-medium leading-relaxed max-w-3xl">
        &ldquo;{quote.q}&rdquo;
      </p>

      {/* Author */}
      <p className="text-white/70 text-sm mt-3">— {quote.a}</p>
    </div>
  )
}
