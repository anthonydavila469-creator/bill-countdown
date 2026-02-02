'use client';

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
import { useSubscription } from '@/hooks/use-subscription';
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_COLOR_THEME,
  COLOR_THEMES,
  ColorThemeId,
  CardSize,
  DashboardView,
  SortBy,
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
    selectedTheme,
    dashboardLayout,
    updateTheme,
    updateDashboardLayout,
  } = useTheme();
  const { showUpgradeModal } = useSubscription();

  const themeIds = Object.keys(COLOR_THEMES) as ColorThemeId[];

  const resetTheme = () => {
    // TODO: Re-enable Pro check after testing: if (!isPro) return;
    updateTheme(DEFAULT_COLOR_THEME);
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
                  Personalize your dashboard with beautiful color themes that match your style.
                </p>
                <button
                  onClick={() => showUpgradeModal('color themes')}
                  className="group relative px-6 py-3 overflow-hidden rounded-xl font-medium transition-all duration-300"
                >
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

      {/* Color Theme Section */}
      <section className="relative">
        <SectionHeader
          icon={Palette}
          iconGradient="from-pink-500/80 to-rose-500/80"
          title="Color Theme"
          description="Choose your dashboard aesthetic"
          action={
            selectedTheme !== DEFAULT_COLOR_THEME && ( // TODO: Add isPro && back after testing
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

        {/* Lock overlay for non-pro - TODO: Re-enable after testing */}
        <div className={cn('relative')}>
          {/* {!isPro && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#08080c]/70 backdrop-blur-sm rounded-2xl">
              <div className="flex flex-col items-center gap-3 text-center p-6">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <Lock className="w-6 h-6 text-zinc-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-400">Pro Feature</p>
                  <p className="text-sm text-zinc-600">Upgrade to customize theme</p>
                </div>
              </div>
            </div>
          )} */}

          {/* Theme Grid - 2x3 layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themeIds.map((themeId, index) => (
              <ThemeCard
                key={themeId}
                themeId={themeId}
                isSelected={selectedTheme === themeId}
                onSelect={() => updateTheme(themeId)}
                disabled={false} // TODO: Change back to {!isPro} after testing
                index={index}
              />
            ))}
          </div>
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
            index={5}
          />
        </div>
      </section>

    </div>
  );
}
