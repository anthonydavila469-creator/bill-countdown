'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { cn } from '@/lib/utils';

interface ColorModeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ColorModeToggle({ className, size = 'md' }: ColorModeToggleProps) {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === 'light';

  const sizeStyles = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleColorMode}
      className={cn(
        // Base styles
        'relative flex items-center justify-center rounded-xl',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'active:scale-95',
        sizeStyles[size],
        // Dark mode: dark glass
        'bg-white/[0.04] hover:bg-white/[0.08]',
        'border border-white/[0.06] hover:border-white/[0.12]',
        'shadow-[0_2px_8px_rgba(0,0,0,0.3)]',
        'focus-visible:ring-white/30 focus-visible:ring-offset-[#08080c]',
        // Light mode: frosted glass
        '[html[data-color-mode=light]_&]:bg-white/60',
        '[html[data-color-mode=light]_&]:hover:bg-white/80',
        '[html[data-color-mode=light]_&]:border-black/[0.06]',
        '[html[data-color-mode=light]_&]:hover:border-black/[0.12]',
        '[html[data-color-mode=light]_&]:shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]',
        '[html[data-color-mode=light]_&]:focus-visible:ring-black/20',
        '[html[data-color-mode=light]_&]:focus-visible:ring-offset-[#f0f4ff]',
        'backdrop-blur-xl',
        className
      )}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {/* Icon container with rotation animation */}
      <div className="relative">
        {/* Sun icon */}
        <Sun
          className={cn(
            iconSizes[size],
            'absolute inset-0 transition-all duration-300',
            isLight
              ? 'opacity-100 rotate-0 scale-100 text-amber-500'
              : 'opacity-0 -rotate-90 scale-75 text-amber-400'
          )}
        />
        {/* Moon icon */}
        <Moon
          className={cn(
            iconSizes[size],
            'transition-all duration-300',
            isLight
              ? 'opacity-0 rotate-90 scale-75 text-slate-400'
              : 'opacity-100 rotate-0 scale-100 text-slate-300'
          )}
        />
      </div>

      {/* Subtle glow effect on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300',
          'group-hover:opacity-100',
          isLight
            ? 'bg-gradient-to-br from-amber-400/10 to-orange-400/10'
            : 'bg-gradient-to-br from-slate-400/10 to-blue-400/10'
        )}
      />
    </button>
  );
}

// Expanded toggle with label - for settings page
interface ColorModeToggleExpandedProps {
  className?: string;
}

export function ColorModeToggleExpanded({ className }: ColorModeToggleExpandedProps) {
  const { colorMode, setColorMode } = useTheme();

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-1.5 rounded-2xl',
        // Dark mode glass
        'bg-white/[0.03] border border-white/[0.06]',
        // Light mode glass
        '[html[data-color-mode=light]_&]:bg-black/[0.03]',
        '[html[data-color-mode=light]_&]:border-black/[0.06]',
        'backdrop-blur-xl',
        className
      )}
    >
      {/* Dark mode button */}
      <button
        onClick={() => setColorMode('dark')}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300',
          'text-sm font-medium',
          colorMode === 'dark'
            ? [
                'bg-white/[0.08] text-white',
                'shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
                'border border-white/[0.1]',
              ]
            : [
                'text-zinc-400 hover:text-zinc-200',
                '[html[data-color-mode=light]_&]:text-zinc-500',
                '[html[data-color-mode=light]_&]:hover:text-zinc-700',
                'hover:bg-white/[0.04]',
                '[html[data-color-mode=light]_&]:hover:bg-black/[0.04]',
              ]
        )}
      >
        <Moon className={cn(
          'w-4 h-4 transition-colors duration-300',
          colorMode === 'dark' ? 'text-slate-300' : 'text-current'
        )} />
        <span>Dark</span>
      </button>

      {/* Light mode button */}
      <button
        onClick={() => setColorMode('light')}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300',
          'text-sm font-medium',
          colorMode === 'light'
            ? [
                '[html[data-color-mode=light]_&]:bg-white/80',
                '[html[data-color-mode=light]_&]:text-zinc-900',
                '[html[data-color-mode=light]_&]:shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]',
                '[html[data-color-mode=light]_&]:border',
                '[html[data-color-mode=light]_&]:border-black/[0.06]',
                // Fallback for when still in dark mode but selecting light
                'bg-white/[0.08] text-white',
                'shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
                'border border-white/[0.1]',
              ]
            : [
                'text-zinc-400 hover:text-zinc-200',
                '[html[data-color-mode=light]_&]:text-zinc-500',
                '[html[data-color-mode=light]_&]:hover:text-zinc-700',
                'hover:bg-white/[0.04]',
                '[html[data-color-mode=light]_&]:hover:bg-black/[0.04]',
              ]
        )}
      >
        <Sun className={cn(
          'w-4 h-4 transition-colors duration-300',
          colorMode === 'light' ? 'text-amber-500' : 'text-current'
        )} />
        <span>Light</span>
      </button>
    </div>
  );
}
