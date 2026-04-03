'use client'

import { useState, useRef, useEffect } from 'react'

interface Member {
  id: string
  full_name: string
  profile_photo_url: string | null
}

const AVATAR_COLORS = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-emerald-600']
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }

export function MentionInput({ value, onChange, onSubmit, members, placeholder = 'Write a comment...' }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  members: Member[]
  placeholder?: string
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIdx, setMentionStartIdx] = useState(-1)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const filtered = mentionQuery
    ? members.filter(m => m.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : members

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    const cursorPos = e.target.selectionStart || 0
    onChange(text)

    // Detect @ mention
    const textBeforeCursor = text.slice(0, cursorPos)
    const lastAtIdx = textBeforeCursor.lastIndexOf('@')

    if (lastAtIdx >= 0) {
      const charBefore = lastAtIdx > 0 ? textBeforeCursor[lastAtIdx - 1] : ' '
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1)
      // Only trigger if @ is at start or preceded by a space, and no space break after @
      if ((charBefore === ' ' || charBefore === '\n' || lastAtIdx === 0) && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt)
        setMentionStartIdx(lastAtIdx)
        setShowSuggestions(true)
        setSelectedIdx(0)
        return
      }
    }
    setShowSuggestions(false)
  }

  function selectMember(member: Member) {
    // Replace everything from @ to current cursor with @Name
    const before = value.slice(0, mentionStartIdx)
    const cursorPos = inputRef.current?.selectionStart || value.length
    const after = value.slice(cursorPos)
    const mention = '@' + member.full_name + ' '
    const newText = before + mention + after
    onChange(newText)
    setShowSuggestions(false)
    setMentionQuery('')

    // Focus back and place cursor after the mention
    setTimeout(() => {
      if (inputRef.current) {
        const pos = mentionStartIdx + mention.length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showSuggestions && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(prev => (prev + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(prev => (prev - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectMember(filtered[selectedIdx])
        return
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
      e.preventDefault()
      onSubmit()
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border border-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          {filtered.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => selectMember(m)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors ${idx === selectedIdx ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
            >
              {m.profile_photo_url ? (
                <img src={m.profile_photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className={`w-6 h-6 rounded-full ${avatarColor(m.full_name)} flex items-center justify-center text-white text-[9px] font-medium`}>{getInitials(m.full_name)}</div>
              )}
              <span>{m.full_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Parse @mentions from comment text and return matched member IDs
export function parseMentions(text: string, members: { id: string; full_name: string }[]): string[] {
  const mentionedIds: string[] = []
  const sortedMembers = [...members].sort((a, b) => b.full_name.length - a.full_name.length) // longest first to avoid partial matches
  for (const member of sortedMembers) {
    if (text.includes(`@${member.full_name}`)) {
      mentionedIds.push(member.id)
    }
  }
  return Array.from(new Set(mentionedIds))
}
