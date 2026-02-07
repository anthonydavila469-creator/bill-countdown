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
  ColorThemeId,
  COLOR_THEMES,
  UNIVERSAL_URGENCY_COLORS,
  URGENCY_GRADIENTS,
  DEFAULT_COLOR_THEME,
  DEFAULT_DASHBOARD_LAYOUT,
} from '@/types';

interface ThemeContextValue {
  // State
  isPro: boolean;
  selectedTheme: ColorThemeId;
  accentColor: string;       // Derived from theme
  cardGradient: string;      // Derived from theme
  dashboardLayout: DashboardLayout;
  isLoading: boolean;

  // Actions
  updateTheme: (themeId: ColorThemeId) => Promise<void>;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Validate theme ID and fallback to default if invalid (handles migration from old themes)
function getValidThemeId(themeId: string | null | undefined): ColorThemeId {
  if (themeId && themeId in COLOR_THEMES) {
    return themeId as ColorThemeId;
  }
  return DEFAULT_COLOR_THEME;
}

// Apply CSS variables to document root
// Urgency colors are UNIVERSAL and never change per theme
function applyCSSVariables(themeId: ColorThemeId) {
  if (typeof document === 'undefined') return;

  const validThemeId = getValidThemeId(themeId);
  const theme = COLOR_THEMES[validThemeId];
  const root = document.documentElement;

  // Universal urgency colors - same for all themes
  root.style.setProperty('--urgency-overdue', UNIVERSAL_URGENCY_COLORS.overdue);
  root.style.setProperty('--urgency-urgent', UNIVERSAL_URGENCY_COLORS.urgent);
  root.style.setProperty('--urgency-soon', UNIVERSAL_URGENCY_COLORS.soon);
  root.style.setProperty('--urgency-safe', UNIVERSAL_URGENCY_COLORS.safe);
  root.style.setProperty('--urgency-distant', UNIVERSAL_URGENCY_COLORS.distant);

  // Urgency gradient pairs for gradient text effects
  root.style.setProperty('--urgency-overdue-from', URGENCY_GRADIENTS.overdue.from);
  root.style.setProperty('--urgency-overdue-to', URGENCY_GRADIENTS.overdue.to);
  root.style.setProperty('--urgency-urgent-from', URGENCY_GRADIENTS.urgent.from);
  root.style.setProperty('--urgency-urgent-to', URGENCY_GRADIENTS.urgent.to);
  root.style.setProperty('--urgency-soon-from', URGENCY_GRADIENTS.soon.from);
  root.style.setProperty('--urgency-soon-to', URGENCY_GRADIENTS.soon.to);
  root.style.setProperty('--urgency-safe-from', URGENCY_GRADIENTS.safe.from);
  root.style.setProperty('--urgency-safe-to', URGENCY_GRADIENTS.safe.to);
  root.style.setProperty('--urgency-distant-from', URGENCY_GRADIENTS.distant.from);
  root.style.setProperty('--urgency-distant-to', URGENCY_GRADIENTS.distant.to);

  // Theme-specific colors
  root.style.setProperty('--accent-primary', theme.accentColor);
  root.style.setProperty('--card-gradient', theme.cardGradient);
  root.style.setProperty('--card-glow', theme.glowColor);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isPro, setIsPro] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorThemeId>(DEFAULT_COLOR_THEME);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(DEFAULT_DASHBOARD_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values from theme (with fallback for invalid themes)
  const validTheme = COLOR_THEMES[selectedTheme] ?? COLOR_THEMES[DEFAULT_COLOR_THEME];
  const accentColor = validTheme.accentColor;
  const cardGradient = validTheme.cardGradient;

  // Fetch preferences on mount
  const refreshPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/preferences');
      if (!response.ok) {
        // User might not be logged in, use defaults
        return;
      }

      const data = await response.json();
      const validThemeId = getValidThemeId(data.color_theme);
      setIsPro(data.is_pro ?? false);
      setSelectedTheme(validThemeId);
      setDashboardLayout(data.dashboard_layout ?? DEFAULT_DASHBOARD_LAYOUT);

      // Apply CSS variables
      applyCSSVariables(validThemeId);
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

  return (
    <ThemeContext.Provider
      value={{
        isPro,
        selectedTheme,
        accentColor,
        cardGradient,
        dashboardLayout,
        isLoading,
        updateTheme,
        updateDashboardLayout,
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
