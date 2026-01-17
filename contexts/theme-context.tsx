'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  UrgencyColors,
  DashboardLayout,
  PaycheckSettings,
  DEFAULT_URGENCY_COLORS,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_PAYCHECK_SETTINGS,
} from '@/types';

interface ThemeContextValue {
  // State
  isPro: boolean;
  accentColor: string;
  urgencyColors: UrgencyColors;
  dashboardLayout: DashboardLayout;
  paycheckSettings: PaycheckSettings;
  isLoading: boolean;

  // Actions
  updateAccentColor: (color: string) => Promise<void>;
  updateUrgencyColors: (colors: UrgencyColors) => Promise<void>;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => Promise<void>;
  updatePaycheckSettings: (settings: PaycheckSettings) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Apply CSS variables to document root
function applyCSSVariables(urgencyColors: UrgencyColors, accentColor: string) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--urgency-overdue', urgencyColors.overdue);
  root.style.setProperty('--urgency-urgent', urgencyColors.urgent);
  root.style.setProperty('--urgency-soon', urgencyColors.soon);
  root.style.setProperty('--urgency-safe', urgencyColors.safe);
  root.style.setProperty('--urgency-distant', urgencyColors.distant);
  root.style.setProperty('--accent-primary', accentColor);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isPro, setIsPro] = useState(false);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [urgencyColors, setUrgencyColors] = useState<UrgencyColors>(DEFAULT_URGENCY_COLORS);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
  const [paycheckSettings, setPaycheckSettings] = useState<PaycheckSettings>(DEFAULT_PAYCHECK_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch preferences on mount
  const refreshPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/preferences');
      if (!response.ok) {
        // User might not be logged in, use defaults
        return;
      }

      const data = await response.json();
      setIsPro(data.is_pro ?? false);
      setAccentColor(data.accent_color ?? DEFAULT_ACCENT_COLOR);
      setUrgencyColors(data.custom_urgency_colors ?? DEFAULT_URGENCY_COLORS);
      setDashboardLayout(data.dashboard_layout ?? DEFAULT_DASHBOARD_LAYOUT);
      setPaycheckSettings(data.paycheck_settings ?? DEFAULT_PAYCHECK_SETTINGS);

      // Apply CSS variables
      applyCSSVariables(
        data.custom_urgency_colors ?? DEFAULT_URGENCY_COLORS,
        data.accent_color ?? DEFAULT_ACCENT_COLOR
      );
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  // Apply CSS variables when colors change
  useEffect(() => {
    applyCSSVariables(urgencyColors, accentColor);
  }, [urgencyColors, accentColor]);

  // Update accent color
  const updateAccentColor = useCallback(async (color: string) => {
    if (!isPro) return;

    setAccentColor(color);
    applyCSSVariables(urgencyColors, color);

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accent_color: color }),
      });
    } catch (error) {
      console.error('Failed to save accent color:', error);
    }
  }, [isPro, urgencyColors]);

  // Update urgency colors
  const updateUrgencyColors = useCallback(async (colors: UrgencyColors) => {
    if (!isPro) return;

    setUrgencyColors(colors);
    applyCSSVariables(colors, accentColor);

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_urgency_colors: colors }),
      });
    } catch (error) {
      console.error('Failed to save urgency colors:', error);
    }
  }, [isPro, accentColor]);

  // Update dashboard layout
  const updateDashboardLayout = useCallback(async (layout: Partial<DashboardLayout>) => {
    const newLayout = { ...dashboardLayout, ...layout };
    setDashboardLayout(newLayout);

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboard_layout: newLayout }),
      });
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
    }
  }, [dashboardLayout]);

  // Update paycheck settings
  const updatePaycheckSettings = useCallback(async (settings: PaycheckSettings) => {
    setPaycheckSettings(settings);

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paycheck_settings: settings }),
      });
    } catch (error) {
      console.error('Failed to save paycheck settings:', error);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isPro,
        accentColor,
        urgencyColors,
        dashboardLayout,
        paycheckSettings,
        isLoading,
        updateAccentColor,
        updateUrgencyColors,
        updateDashboardLayout,
        updatePaycheckSettings,
        refreshPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
