'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedNotification {
  id: string;
  bill_id: string;
  scheduled_for: string;
  status: string;
  read_at: string | null;
  message: string | null;
  created_at: string;
  bills: {
    name: string;
    emoji: string;
    amount: number | null;
    due_date: string;
    icon_key: string | null;
    category: string | null;
  } | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/feed');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  // Fetch on mount and when opened
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (isOpen) fetchFeed();
  }, [isOpen, fetchFeed]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/notifications/feed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-zinc-400 hover:text-white transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-96 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Glow */}
          <div className="absolute -inset-1 bg-gradient-to-b from-white/5 to-transparent rounded-2xl blur-xl" />

          <div className="relative bg-[#0a0a0e]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="relative px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-400/20 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-violet-400" />
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-violet-500 to-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-violet-500/30">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Notifications</h3>
                    <p className="text-[11px] text-zinc-500">
                      {unreadCount === 0 ? 'All clear' : `${unreadCount} unread`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      disabled={loading}
                      className="p-1.5 text-zinc-500 hover:text-violet-400 hover:bg-white/10 rounded-lg transition-all duration-200 text-xs flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-5 py-10 text-center relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-32 h-32 rounded-full border border-dashed border-zinc-700" />
                    <div className="absolute w-24 h-24 rounded-full border border-dashed border-zinc-700" />
                    <div className="absolute w-16 h-16 rounded-full border border-dashed border-zinc-700" />
                  </div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-greeviolet-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Bell className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-white mb-1">No notifications yet</p>
                    <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">
                      Reminders will appear here as your bills approach their due dates.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200',
                        n.read_at
                          ? 'opacity-60 hover:opacity-80'
                          : 'bg-white/[0.03] hover:bg-white/[0.06]'
                      )}
                    >
                      <span className="text-lg mt-0.5 shrink-0">
                        {n.bills?.emoji || '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 leading-snug">
                          {n.message || `${n.bills?.name || 'Bill'} reminder`}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          {formatTime(n.scheduled_for)}
                        </p>
                      </div>
                      {!n.read_at && (
                        <div className="w-2 h-2 mt-2 rounded-full bg-violet-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
