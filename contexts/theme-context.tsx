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
  DashboardLayout,
  PaycheckSettings,
  ColorThemeId,
  COLOR_THEMES,
  UNIVERSAL_URGENCY_COLORS,
  DEFAULT_COLOR_THEME,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_PAYCHECK_SETTINGS,
} from '@/types';

interface ThemeContextValue {
  // State
  isPro: boolean;
  selectedTheme: ColorThemeId;
  accentColor: string;       // Derived from theme
  cardGradient: string;      // Derived from theme
  dashboardLayout: DashboardLayout;
  paycheckSettings: PaycheckSettings;
  isLoading: boolean;

  // Actions
  updateTheme: (themeId: ColorThemeId) => Promise<void>;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => Promise<void>;
  updatePaycheckSettings: (settings: PaycheckSettings) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Apply CSS variables to document root
// Urgency colors are UNIVERSAL and never change per theme
function applyCSSVariables(themeId: ColorThemeId) {
  if (typeof document === 'undefined') return;

  const theme = COLOR_THEMES[themeId];
  const root = document.documentElement;

  // Universal urgency colors - same for all themes
  root.style.setProperty('--urgency-overdue', UNIVERSAL_URGENCY_COLORS.overdue);
  root.style.setProperty('--urgency-urgent', UNIVERSAL_URGENCY_COLORS.urgent);
  root.style.setProperty('--urgency-soon', UNIVERSAL_URGENCY_COLORS.soon);
  root.style.setProperty('--urgency-safe', UNIVERSAL_URGENCY_COLORS.safe);
  root.style.setProperty('--urgency-distant', UNIVERSAL_URGENCY_COLORS.distant);

  // Theme-specific colors
  root.style.setProperty('--accent-primary', theme.accentColor);
  root.style.setProperty('--card-gradient', theme.cardGradient);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isPro, setIsPro] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorThemeId>(DEFAULT_COLOR_THEME);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
  const [paycheckSettings, setPaycheckSettings] = useState<PaycheckSettings>(DEFAULT_PAYCHECK_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values from theme
  const accentColor = COLOR_THEMES[selectedTheme].accentColor;
  const cardGradient = COLOR_THEMES[selectedTheme].cardGradient;

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
      setSelectedTheme(data.color_theme ?? DEFAULT_COLOR_THEME);
      setDashboardLayout(data.dashboard_layout ?? DEFAULT_DASHBOARD_LAYOUT);
      setPaycheckSettings(data.paycheck_settings ?? DEFAULT_PAYCHECK_SETTINGS);

      // Apply CSS variables
      applyCSSVariables(data.color_theme ?? DEFAULT_COLOR_THEME);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  // Apply CSS variables when theme changes
  useEffect(() => {
    applyCSSVariables(selectedTheme);
  }, [selectedTheme]);

  // Update theme
  // TODO: Re-enable Pro check after testing: if (!isPro) return;
  const updateTheme = useCallback(async (themeId: ColorThemeId) => {
    setSelectedTheme(themeId);
    applyCSSVariables(themeId);

    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color_theme: themeId }),
      });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [isPro]);

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
        selectedTheme,
        accentColor,
        cardGradient,
        dashboardLayout,
        paycheckSettings,
        isLoading,
        updateTheme,
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
