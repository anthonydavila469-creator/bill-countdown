'use client';

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  Lock,
  Crown,
  Palette,
  LayoutGrid,
  ChevronDown,
  Check,
  RotateCcw,
  Gem,
  Sparkles,
  Grid3X3,
  List,
  ArrowUpDown,
  BarChart3,
} from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import {
  DEFAULT_URGENCY_COLORS,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_DASHBOARD_LAYOUT,
  CardSize,
  DashboardView,
  SortBy,
} from '@/types';
import { cn } from '@/lib/utils';

// Urgency color configuration with icons and enhanced descriptions
// Urgency thresholds match getUrgency() in lib/utils.ts:
// overdue: daysLeft < 0 | urgent: <= 3 | soon: <= 7 | safe: <= 30 | distant: > 30
const urgencyConfig = {
  overdue: {
    label: 'Overdue',
    description: 'Past due date',
    icon: '🔴',
  },
  urgent: {
    label: 'Urgent',
    description: '0-3 days left',
    icon: '🟠',
  },
  soon: {
    label: 'Soon',
    description: '4-7 days left',
    icon: '🟡',
  },
  safe: {
    label: 'Safe',
    description: '8-30 days left',
    icon: '🟢',
  },
  distant: {
    label: 'Distant',
    description: '31+ days left',
    icon: '🔵',
  },
};

// Premium color swatch component with gem-like appearance
function ColorSwatch({
  color,
  onClick,
  isActive,
  size = 'md',
}: {
  color: string;
  onClick?: () => void;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const className = cn(
    'relative rounded-xl transition-all duration-300',
    sizeClasses[size],
    'group',
    onClick && 'cursor-pointer hover:scale-110',
    isActive && 'ring-2 ring-white/50 ring-offset-2 ring-offset-[#0a0a0f]'
  );

  const content = (
    <>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"
        style={{ backgroundColor: color }}
      />
      {/* Main swatch with glass effect */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ backgroundColor: color }}
      />
      {/* Top highlight - gem bevel effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/30 via-transparent to-black/20" />
      {/* Inner shine */}
      <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
    </>
  );

  // Use div when no onClick (to avoid nested button issues), button when interactive
  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

// Premium color picker with popover
function ColorPickerField({
  color,
  onChange,
  label,
  description,
  icon,
  disabled,
  index = 0,
}: {
  color: string;
  onChange: (color: string) => void;
  label: string;
  description: string;
  icon?: string;
  disabled?: boolean;
  index?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'group relative w-full flex items-center gap-4 p-4',
          'bg-white/[0.02] hover:bg-white/[0.04]',
          'border border-white/[0.06] hover:border-white/[0.12]',
          'rounded-2xl transition-all duration-300',
          disabled && 'opacity-40 cursor-not-allowed',
          isOpen && 'bg-white/[0.04] border-white/[0.12]'
        )}
      >
        {/* Color swatch */}
        <ColorSwatch color={color} size="md" />

        {/* Label and description */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            {icon && <span className="text-sm">{icon}</span>}
            <span className="font-medium text-white tracking-wide">{label}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        </div>

        {/* Hex value preview */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
            {color}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-zinc-500 transition-transform duration-300',
              isOpen && 'rotate-180'
            )}
          />
        </div>

        {/* Hover gradient line */}
        <div
          className="absolute bottom-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
        />
      </button>

      {/* Color picker popover */}
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 sm:left-auto sm:right-auto sm:w-auto mt-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative p-5 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50">
              {/* Decorative corner accents */}
              <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-white/20 rounded-tl-sm" />
              <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-white/20 rounded-tr-sm" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-white/20 rounded-bl-sm" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-white/20 rounded-br-sm" />

              {/* Color picker */}
              <div className="relative">
                <HexColorPicker color={color} onChange={onChange} />
              </div>

              {/* Hex input and confirm */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">#</span>
                  <input
                    type="text"
                    value={color.replace('#', '')}
                    onChange={(e) => onChange(`#${e.target.value}`)}
                    className="w-full pl-7 pr-3 py-2.5 text-sm font-mono uppercase tracking-wider bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2.5 bg-white text-zinc-900 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>

              {/* Preview bar */}
              <div
                className="mt-4 h-2 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 50%, white))`,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Premium select field
function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  index = 0,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  icon?: React.ComponentType<{ className?: string }>;
  index?: number;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-white/[0.04]">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        )}
        <span className="font-medium text-white tracking-wide">{label}</span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={cn(
            'appearance-none pl-4 pr-10 py-2.5 min-w-[140px]',
            'bg-white/[0.04] hover:bg-white/[0.08]',
            'border border-white/[0.08] hover:border-white/[0.15]',
            'rounded-xl text-white text-sm font-medium tracking-wide',
            'focus:outline-none focus:ring-2 focus:ring-white/20',
            'cursor-pointer transition-all duration-200'
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}

// Premium toggle switch
function ToggleField({
  label,
  checked,
  onChange,
  icon: Icon,
  index = 0,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ComponentType<{ className?: string }>;
  index?: number;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-white/[0.04]">
            <Icon className="w-4 h-4 text-zinc-400" />
          </div>
        )}
        <span className="font-medium text-white tracking-wide">{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-14 h-8 rounded-full transition-all duration-300',
          !checked && 'bg-white/10'
        )}
        style={checked ? { backgroundColor: 'var(--accent-primary)' } : undefined}
      >
        {/* Track glow when active */}
        {checked && (
          <div
            className="absolute inset-0 rounded-full blur-md opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          />
        )}
        {/* Thumb */}
        <div
          className={cn(
            'absolute top-1 w-6 h-6 rounded-full transition-all duration-300',
            'bg-white shadow-lg',
            checked ? 'left-7' : 'left-1'
          )}
        >
          {/* Thumb highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-zinc-200" />
        </div>
      </button>
    </div>
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
    isPro,
    accentColor,
    urgencyColors,
    dashboardLayout,
    updateAccentColor,
    updateUrgencyColors,
    updateDashboardLayout,
  } = useTheme();

  const handleUrgencyColorChange = (key: keyof typeof urgencyColors, color: string) => {
    updateUrgencyColors({ ...urgencyColors, [key]: color });
  };

  const resetColors = () => {
    if (!isPro) return;
    updateAccentColor(DEFAULT_ACCENT_COLOR);
    updateUrgencyColors(DEFAULT_URGENCY_COLORS);
  };

  const resetLayout = () => {
    updateDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
  };

  return (
    <div className="space-y-10">
      {/* Pro Upgrade Banner */}
      {!isPro && (
        <div className="relative overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/20 to-cyan-600/20" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

          {/* Floating orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative p-8 border border-white/10">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Crown icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-amber-400/80">
                    Premium
                  </span>
                  <Sparkles className="w-3 h-3 text-amber-400/80" />
                </div>
                <h3 className="text-2xl font-light text-white mb-2 tracking-tight">
                  Unlock <span className="font-semibold">Customization</span>
                </h3>
                <p className="text-zinc-400 mb-6 max-w-md">
                  Personalize your experience with custom colors, themes, and urgency indicators that match your style.
                </p>
                <button className="group relative px-6 py-3 overflow-hidden rounded-xl font-medium transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
                  <span className="relative text-zinc-900 font-semibold tracking-wide">
                    Upgrade to Pro
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Color Customization Section */}
      <section className="relative">
        <SectionHeader
          icon={Palette}
          iconGradient="from-pink-500/80 to-rose-500/80"
          title="Color Palette"
          description="Customize your urgency indicators"
          action={
            isPro && (
              <button
                onClick={resetColors}
                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )
          }
        />

        {/* Lock overlay for non-pro */}
        <div className={cn('relative space-y-3', !isPro && 'pointer-events-none')}>
          {!isPro && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#08080c]/70 backdrop-blur-sm rounded-2xl">
              <div className="flex flex-col items-center gap-3 text-center p-6">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <Lock className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-400">Pro Feature</p>
                  <p className="text-sm text-zinc-600">Upgrade to customize colors</p>
                </div>
              </div>
            </div>
          )}

          {/* Accent Color */}
          <ColorPickerField
            color={accentColor}
            onChange={updateAccentColor}
            label="Accent Color"
            description="Buttons, links, and highlights"
            icon="✨"
            disabled={!isPro}
            index={0}
          />

          {/* Divider with label */}
          <div className="flex items-center gap-4 py-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest">Urgency Levels</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Urgency Colors */}
          {(Object.keys(urgencyConfig) as Array<keyof typeof urgencyConfig>).map((key, index) => (
            <ColorPickerField
              key={key}
              color={urgencyColors[key]}
              onChange={(color) => handleUrgencyColorChange(key, color)}
              label={urgencyConfig[key].label}
              description={urgencyConfig[key].description}
              icon={urgencyConfig[key].icon}
              disabled={!isPro}
              index={index + 1}
            />
          ))}
        </div>
      </section>

      {/* Dashboard Layout Section */}
      <section>
        <SectionHeader
          icon={LayoutGrid}
          iconGradient="from-blue-500/80 to-cyan-500/80"
          title="Dashboard Layout"
          description="Customize your view preferences"
          action={
            <button
              onClick={resetLayout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          }
        />

        <div className="space-y-3">
          <SelectField<DashboardView>
            label="Default View"
            value={dashboardLayout.defaultView}
            onChange={(value) => updateDashboardLayout({ defaultView: value })}
            options={[
              { value: 'grid', label: 'Grid View' },
              { value: 'list', label: 'List View' },
            ]}
            icon={dashboardLayout.defaultView === 'grid' ? Grid3X3 : List}
            index={0}
          />

          <SelectField<CardSize>
            label="Card Size"
            value={dashboardLayout.cardSize}
            onChange={(value) => updateDashboardLayout({ cardSize: value })}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'default', label: 'Default' },
            ]}
            icon={Gem}
            index={1}
          />

          <SelectField<'2' | '3' | '4'>
            label="Cards Per Row"
            value={String(dashboardLayout.cardsPerRow) as '2' | '3' | '4'}
            onChange={(value) => updateDashboardLayout({ cardsPerRow: Number(value) as 2 | 3 | 4 })}
            options={[
              { value: '2', label: '2 Cards' },
              { value: '3', label: '3 Cards' },
              { value: '4', label: '4 Cards' },
            ]}
            icon={LayoutGrid}
            index={2}
          />

          <SelectField<SortBy>
            label="Sort Bills By"
            value={dashboardLayout.sortBy}
            onChange={(value) => updateDashboardLayout({ sortBy: value })}
            options={[
              { value: 'due_date', label: 'Due Date' },
              { value: 'amount', label: 'Amount' },
              { value: 'name', label: 'Name' },
            ]}
            icon={ArrowUpDown}
            index={3}
          />

          <ToggleField
            label="Show Stats Bar"
            checked={dashboardLayout.showStatsBar}
            onChange={(checked) => updateDashboardLayout({ showStatsBar: checked })}
            icon={BarChart3}
            index={4}
          />
        </div>
      </section>

      {/* Color Preview Bar */}
      {isPro && (
        <section className="animate-in fade-in duration-500" style={{ animationDelay: '500ms' }}>
          <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-4">
              Color Preview
            </p>
            <div className="flex items-center gap-2">
              {Object.entries(urgencyColors).map(([key, color]) => (
                <div key={key} className="flex-1 group relative">
                  <div
                    className="h-3 rounded-full transition-all duration-300 group-hover:h-5"
                    style={{ backgroundColor: color }}
                  />
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity"
                    style={{ backgroundColor: color }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
