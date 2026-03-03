'use client';

import {
  Palette,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import {
  DEFAULT_COLOR_THEME,
  COLOR_THEMES,
  ColorThemeId,
} from '@/types';
import { cn } from '@/lib/utils';

// Theme card component for the theme selection grid
function ThemeCard({
  themeId,
  isSelected,
  onSelect,
  disabled,
  index = 0,
}: {
  themeId: ColorThemeId;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  index?: number;
}) {
  const theme = COLOR_THEMES[themeId];

  return (
    <button
      onClick={() => !disabled && onSelect()}
      disabled={disabled}
      className={cn(
        'group relative flex flex-col rounded-2xl transition-all duration-300 overflow-hidden',
        'hover:scale-[1.02] hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-white/40',
        disabled && 'opacity-40 cursor-not-allowed',
        'animate-in fade-in slide-in-from-bottom-2 duration-500'
      )}
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      {/* Theme gradient preview - vertical gradient like the reference */}
      <div
        className="w-full h-28 relative"
        style={{ background: theme.cardGradient }}
      >
        {/* Inner border for polish */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />

        {/* Selection checkmark */}
        {isSelected && (
          <div
            className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm"
          >
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Theme name and description */}
        <div className="absolute bottom-3 left-3">
          <h4 className="font-semibold text-white text-sm">{theme.name}</h4>
          <p className="text-[11px] text-white/50">{theme.description}</p>
        </div>

        {/* Accent color indicator */}
        <div
          className="absolute bottom-3 right-3 w-4 h-4 rounded-full ring-2 ring-white/30"
          style={{ backgroundColor: theme.accentColor }}
        />
      </div>
    </button>
  );
}

// Section header component
function SectionHeader({
  icon: Icon,
  iconGradient,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-2xl bg-gradient-to-br', iconGradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function CustomizationSection() {
  const {
    selectedTheme,
    updateTheme,
  } = useTheme();

  const themeIds = Object.keys(COLOR_THEMES) as ColorThemeId[];

  const resetTheme = () => {
    updateTheme(DEFAULT_COLOR_THEME);
  };

  return (
    <div className="space-y-10">
      {/* Color Theme Section */}
      <section className="relative">
        <SectionHeader
          icon={Palette}
          iconGradient="from-pink-500/80 to-rose-500/80"
          title="Color Theme"
          description="Choose your dashboard aesthetic"
          action={
            selectedTheme !== DEFAULT_COLOR_THEME && (
              <button
                onClick={resetTheme}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )
          }
        />

        {/* Theme Grid - 2x3 layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themeIds.map((themeId, index) => (
            <ThemeCard
              key={themeId}
              themeId={themeId}
              isSelected={selectedTheme === themeId}
              onSelect={() => updateTheme(themeId)}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
