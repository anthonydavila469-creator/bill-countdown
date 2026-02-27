'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar, History, Settings, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutGrid },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar, proFeature: 'calendar' as const },
  { href: '/dashboard/history', label: 'History', icon: History, proFeature: 'history' as const },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function MobileBottomNav() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { canUseCalendar, canUseHistory } = useSubscription();

  // Only render after hydration to avoid mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isProLocked = (feature?: 'calendar' | 'history') => {
    if (feature === 'calendar') return !canUseCalendar;
    if (feature === 'history') return !canUseHistory;
    return false;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{ position: 'fixed', bottom: 0, transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}>
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="bg-[#0a0a0e] backdrop-blur-xl border-t border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
            const locked = isProLocked(item.proFeature);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-zinc-500 active:text-zinc-300'
                )}
              >
                {/* Active indicator - background highlight */}
                {isActive && (
                  <div className="absolute inset-0 bg-orange-500/10 rounded-xl border border-orange-500/20" />
                )}

                <div className="relative">
                  <Icon className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    isActive && 'text-orange-400'
                  )} />
                  {locked && (
                    <Crown className="absolute -top-1.5 -right-2 w-3 h-3 text-amber-400" />
                  )}
                </div>

                <span className={cn(
                  'text-[9px] font-medium transition-colors duration-200',
                  isActive ? 'text-orange-400' : 'text-zinc-500'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Safe area padding for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)] bg-[#0a0a0e]" />
      </div>
    </nav>
  );
}
