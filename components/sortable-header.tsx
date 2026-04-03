'use client'

import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc' | null

interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSortKey: string | null
  currentDirection: SortDirection
  onSort: (key: string) => void
  className?: string
}

export function SortableHeader({ label, sortKey, currentSortKey, currentDirection, onSort, className = '' }: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors text-left font-medium text-muted-foreground ${isActive ? 'text-foreground' : ''} ${className}`}
    >
      {label}
      {isActive && currentDirection === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
      {isActive && currentDirection === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
      {!isActive && <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />}
    </button>
  )
}

// Hook for managing sort state
export function useSort(defaultKey?: string, defaultDir: SortDirection = 'desc') {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey || null)
  const [sortDir, setSortDir] = useState<SortDirection>(defaultDir)

  function handleSort(key: string) {
    if (sortKey === key) {
      // Cycle: desc → asc → none
      if (sortDir === 'desc') setSortDir('asc')
      else if (sortDir === 'asc') { setSortKey(null); setSortDir(null) }
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function sortData<T>(data: T[]): T[] {
    if (!sortKey || !sortDir) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]

      // Handle nulls
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Date comparison
      const aDate = new Date(String(aVal))
      const bDate = new Date(String(bVal))
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        return sortDir === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime()
      }

      // Number comparison
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum
      }

      // String comparison
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }

  return { sortKey, sortDir, handleSort, sortData }
}
