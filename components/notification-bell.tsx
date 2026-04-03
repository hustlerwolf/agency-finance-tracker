'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, Check, MessageSquare, AtSign, UserPlus, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface AppNotification {
  id: string
  recipient_id: string
  type: string
  title: string
  body: string | null
  task_id: string | null
  sender_id: string | null
  is_read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  comment: MessageSquare,
  mention: AtSign,
  task_assigned: UserPlus,
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function NotificationBell({ teamMemberId }: { teamMemberId: string }) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted')
    }
  }, [])

  // Request permission (must be triggered by user click)
  async function requestNotifPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setPermissionGranted(perm === 'granted')
    if (perm === 'granted') {
      toast.success('Desktop notifications enabled')
    } else {
      toast.error('Notification permission denied. Enable it in browser settings.')
    }
  }

  // Show browser notification + in-app toast
  const showBrowserNotification = useCallback((notif: AppNotification) => {
    // Always show an in-app toast as fallback
    toast(notif.title, { description: notif.body || undefined, duration: 5000 })

    // Try native browser notification
    if (!permissionGranted) return
    try {
      const n = new window.Notification(notif.title, {
        body: notif.body || undefined,
        icon: '/favicon.ico',
        tag: notif.id,
      })
      n.onclick = () => {
        window.focus()
        router.push(`/tasks?task=${notif.task_id}`)
        n.close()
      }
    } catch (err) {
      console.warn('Browser notification failed:', err)
    }
  }, [permissionGranted, router])

  // Fetch notifications + subscribe to Realtime
  useEffect(() => {
    const supabase = createClient()

    async function fetchNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', teamMemberId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    }

    fetchNotifications()

    const channel = supabase
      .channel(`notif-${teamMemberId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${teamMemberId}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification
          setNotifications(prev => [newNotif, ...prev].slice(0, 30))
          setUnreadCount(prev => prev + 1)

          // Always show browser notification (even if tab is visible)
          showBrowserNotification(newNotif)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [teamMemberId, showBrowserNotification])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAllRead() {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', teamMemberId)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function clearAll() {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', teamMemberId)
    setNotifications([])
    setUnreadCount(0)
  }

  async function deleteOne(id: string) {
    const supabase = createClient()
    const notif = notifications.find(n => n.id === id)
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function handleNotifClick(notif: AppNotification) {
    // Mark as read
    if (!notif.is_read) {
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setIsOpen(false)
    // Navigate to tasks page with task ID to auto-open
    if (notif.task_id) {
      router.push(`/tasks?task=${notif.task_id}`)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-white/6 w-full relative"
      >
        <Bell className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="truncate">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 left-7 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-full bottom-0 ml-2 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 max-h-[420px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <Check className="w-3 h-3" /> Read all
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-[10px] text-red-400 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            </div>
            {!permissionGranted && typeof window !== 'undefined' && 'Notification' in window && (
              <button onClick={requestNotifPermission} className="w-full text-xs px-3 py-1.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors">
                Enable desktop notifications
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 scrollbar-none">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || MessageSquare
                return (
                  <div key={n.id} className="relative group">
                    <button
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'mention' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.is_read ? 'font-medium' : 'text-muted-foreground'}`}>{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />}
                    </button>
                    <button
                      onClick={() => deleteOne(n.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity z-10"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
