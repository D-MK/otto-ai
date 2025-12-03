/**
 * Theme Service - manages color themes and CSS variable updates
 */

import { logger } from '../utils/logger';

export type ThemePreset = 'light' | 'dark' | 'blue' | 'green' | 'purple';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  accentColor: string;
  accentHover: string;
  successColor: string;
  errorColor: string;
  // Tab-specific colors
  tabHeaderBg: string;
  tabHeaderBorder: string;
  tabInactiveColor: string;
  tabHoverBg: string;
  tabHoverColor: string;
  tabActiveColor: string;
  tabActiveBg: string;
  tabActiveBorder: string;
  tabContentBg: string;
  // Sidebar and chat-specific colors
  sidebarTabActiveBg: string;
  sidebarTabBg: string;
  chatHeaderBg: string;
  createScriptButtonColor: string;
}

export interface FontPreferences {
  fontFamily: string;
  fontSize: string;
}

export interface SavedCustomTheme {
  name: string;
  colors: ThemeColors;
  fonts?: FontPreferences;
}

export const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#e8e8e8',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    borderColor: '#d0d0d0',
    accentColor: '#2563eb',
    accentHover: '#1d4ed8',
    successColor: '#10b981',
    errorColor: '#ef4444',
    tabHeaderBg: '#f5f5f5',
    tabHeaderBorder: '#e0e0e0',
    tabInactiveColor: '#666666',
    tabHoverBg: 'rgba(0, 0, 0, 0.05)',
    tabHoverColor: '#333333',
    tabActiveColor: '#2563eb',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#2563eb',
    tabContentBg: '#ffffff',
    sidebarTabActiveBg: '#2563eb',
    sidebarTabBg: '#ffffff',
    chatHeaderBg: '#2563eb',
    createScriptButtonColor: '#4CAF50',
  },
  dark: {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    borderColor: '#475569',
    accentColor: '#3b82f6',
    accentHover: '#2563eb',
    successColor: '#22c55e',
    errorColor: '#f87171',
    tabHeaderBg: '#1e293b',
    tabHeaderBorder: '#475569',
    tabInactiveColor: '#cbd5e1',
    tabHoverBg: 'rgba(255, 255, 255, 0.1)',
    tabHoverColor: '#f1f5f9',
    tabActiveColor: '#3b82f6',
    tabActiveBg: '#0f172a',
    tabActiveBorder: '#3b82f6',
    tabContentBg: '#0f172a',
    sidebarTabActiveBg: '#3b82f6',
    sidebarTabBg: '#0f172a',
    chatHeaderBg: '#3b82f6',
    createScriptButtonColor: '#22c55e',
  },
  blue: {
    bgPrimary: '#ffffff',
    bgSecondary: '#eff6ff',
    bgTertiary: '#dbeafe',
    textPrimary: '#1e3a8a',
    textSecondary: '#3b82f6',
    borderColor: '#93c5fd',
    accentColor: '#2563eb',
    accentHover: '#1d4ed8',
    successColor: '#10b981',
    errorColor: '#ef4444',
    tabHeaderBg: '#eff6ff',
    tabHeaderBorder: '#93c5fd',
    tabInactiveColor: '#3b82f6',
    tabHoverBg: 'rgba(37, 99, 235, 0.1)',
    tabHoverColor: '#1e3a8a',
    tabActiveColor: '#2563eb',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#2563eb',
    tabContentBg: '#ffffff',
    sidebarTabActiveBg: '#2563eb',
    sidebarTabBg: '#ffffff',
    chatHeaderBg: '#2563eb',
    createScriptButtonColor: '#2563eb',
  },
  green: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f0fdf4',
    bgTertiary: '#dcfce7',
    textPrimary: '#14532d',
    textSecondary: '#16a34a',
    borderColor: '#86efac',
    accentColor: '#22c55e',
    accentHover: '#16a34a',
    successColor: '#22c55e',
    errorColor: '#ef4444',
    tabHeaderBg: '#f0fdf4',
    tabHeaderBorder: '#86efac',
    tabInactiveColor: '#16a34a',
    tabHoverBg: 'rgba(34, 197, 94, 0.1)',
    tabHoverColor: '#14532d',
    tabActiveColor: '#22c55e',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#22c55e',
    tabContentBg: '#ffffff',
    sidebarTabActiveBg: '#22c55e',
    sidebarTabBg: '#ffffff',
    chatHeaderBg: '#22c55e',
    createScriptButtonColor: '#22c55e',
  },
  purple: {
    bgPrimary: '#ffffff',
    bgSecondary: '#faf5ff',
    bgTertiary: '#f3e8ff',
    textPrimary: '#581c87',
    textSecondary: '#9333ea',
    borderColor: '#c084fc',
    accentColor: '#a855f7',
    accentHover: '#9333ea',
    successColor: '#22c55e',
    errorColor: '#ef4444',
    tabHeaderBg: '#faf5ff',
    tabHeaderBorder: '#c084fc',
    tabInactiveColor: '#9333ea',
    tabHoverBg: 'rgba(168, 85, 247, 0.1)',
    tabHoverColor: '#581c87',
    tabActiveColor: '#a855f7',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#a855f7',
    tabContentBg: '#ffffff',
    sidebarTabActiveBg: '#a855f7',
    sidebarTabBg: '#ffffff',
    chatHeaderBg: '#a855f7',
    createScriptButtonColor: '#a855f7',
  },
};

export class ThemeService {
  private static currentTheme: ThemePreset | 'custom' = 'light';
  private static customThemeColors: ThemeColors | null = null;
  private static fontPreferences: FontPreferences = {
    fontFamily: 'system',
    fontSize: '16px',
  };

  /**
   * Apply theme colors to the document
   */
  private static applyColors(colors: ThemeColors): void {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--border-color', colors.borderColor);
    root.style.setProperty('--accent-color', colors.accentColor);
    root.style.setProperty('--accent-hover', colors.accentHover);
    root.style.setProperty('--success-color', colors.successColor);
    root.style.setProperty('--error-color', colors.errorColor);

    // Tab-specific variables
    root.style.setProperty('--tab-header-bg', colors.tabHeaderBg);
    root.style.setProperty('--tab-header-border', colors.tabHeaderBorder);
    root.style.setProperty('--tab-inactive-color', colors.tabInactiveColor);
    root.style.setProperty('--tab-hover-bg', colors.tabHoverBg);
    root.style.setProperty('--tab-hover-color', colors.tabHoverColor);
    root.style.setProperty('--tab-active-color', colors.tabActiveColor);
    root.style.setProperty('--tab-active-bg', colors.tabActiveBg);
    root.style.setProperty('--tab-active-border', colors.tabActiveBorder);
    root.style.setProperty('--tab-content-bg', colors.tabContentBg);

    // Sidebar and chat-specific variables
    root.style.setProperty('--sidebar-tab-active-bg', colors.sidebarTabActiveBg);
    root.style.setProperty('--sidebar-tab-bg', colors.sidebarTabBg);
    root.style.setProperty('--chat-header-bg', colors.chatHeaderBg);
    root.style.setProperty('--create-script-button-color', colors.createScriptButtonColor);
  }

  /**
   * Apply font preferences to the document
   */
  private static applyFonts(fonts: FontPreferences): void {
    const root = document.documentElement;
    const body = document.body;

    // Map font family selection to actual font stack
    const fontFamilies: Record<string, string> = {
      'system': `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`,
      'serif': `'Georgia', 'Times New Roman', serif`,
      'mono': `'Monaco', 'Courier New', monospace`,
      'inter': `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
      'roboto': `'Roboto', -apple-system, BlinkMacSystemFont, sans-serif`,
    };

    body.style.fontFamily = fontFamilies[fonts.fontFamily] || fontFamilies['system'];
    root.style.setProperty('--base-font-size', fonts.fontSize);
    body.style.fontSize = fonts.fontSize;
  }

  /**
   * Apply a theme preset to the document
   */
  static applyTheme(theme: ThemePreset): void {
    this.currentTheme = theme;
    const colors = THEME_PRESETS[theme];
    this.applyColors(colors);
  }

  /**
   * Apply a custom theme
   */
  static applyCustomTheme(colors: ThemeColors): void {
    this.currentTheme = 'custom';
    this.customThemeColors = colors;
    this.applyColors(colors);
  }

  /**
   * Apply font preferences
   */
  static applyFontPreferences(fonts: FontPreferences): void {
    this.fontPreferences = fonts;
    this.applyFonts(fonts);
  }

  /**
   * Get the current theme
   */
  static getCurrentTheme(): ThemePreset | 'custom' {
    return this.currentTheme;
  }

  /**
   * Get the current theme colors (preset or custom)
   */
  static getCurrentThemeColors(): ThemeColors {
    if (this.currentTheme === 'custom' && this.customThemeColors) {
      return this.customThemeColors;
    }
    return THEME_PRESETS[this.currentTheme as ThemePreset];
  }

  /**
   * Get the current font preferences
   */
  static getCurrentFontPreferences(): FontPreferences {
    return this.fontPreferences;
  }

  /**
   * Initialize theme from localStorage or default to light
   */
  static initializeTheme(): void {
    const savedTheme = localStorage.getItem('otto-theme') as ThemePreset | null;
    const savedCustomTheme = localStorage.getItem('otto-custom-theme');
    const savedFonts = localStorage.getItem('otto-font-preferences');

    // Load font preferences
    if (savedFonts) {
      try {
        const fonts = JSON.parse(savedFonts) as FontPreferences;
        this.applyFontPreferences(fonts);
      } catch (e) {
        logger.error('Failed to load font preferences:', e);
      }
    }

    if (savedCustomTheme) {
      try {
        const customColors = JSON.parse(savedCustomTheme) as ThemeColors;
        this.applyCustomTheme(customColors);
        return;
      } catch (e) {
        logger.error('Failed to load custom theme:', e);
      }
    }

    if (savedTheme && THEME_PRESETS[savedTheme]) {
      this.applyTheme(savedTheme);
    } else {
      this.applyTheme('light');
    }
  }

  /**
   * Save theme preference to localStorage
   */
  static saveTheme(theme: ThemePreset | ThemeColors): void {
    if (typeof theme === 'string') {
      // Preset theme
      localStorage.setItem('otto-theme', theme);
      localStorage.removeItem('otto-custom-theme');
      this.applyTheme(theme);
    } else {
      // Custom theme
      localStorage.setItem('otto-custom-theme', JSON.stringify(theme));
      localStorage.setItem('otto-theme', 'custom');
      this.applyCustomTheme(theme);
    }
  }

  /**
   * Save font preferences to localStorage
   */
  static saveFontPreferences(fonts: FontPreferences): void {
    localStorage.setItem('otto-font-preferences', JSON.stringify(fonts));
    this.applyFontPreferences(fonts);
  }

  /**
   * Save a named custom theme
   */
  static saveNamedTheme(name: string, colors: ThemeColors, fonts?: FontPreferences): void {
    const savedThemes = this.getSavedThemes();
    const theme: SavedCustomTheme = { name, colors, fonts };

    // Update or add the theme
    const existingIndex = savedThemes.findIndex(t => t.name === name);
    if (existingIndex >= 0) {
      savedThemes[existingIndex] = theme;
    } else {
      savedThemes.push(theme);
    }

    localStorage.setItem('otto-saved-themes', JSON.stringify(savedThemes));
  }

  /**
   * Get all saved custom themes
   */
  static getSavedThemes(): SavedCustomTheme[] {
    const saved = localStorage.getItem('otto-saved-themes');
    if (!saved) return [];

    try {
      return JSON.parse(saved) as SavedCustomTheme[];
    } catch (e) {
      logger.error('Failed to load saved themes:', e);
      return [];
    }
  }

  /**
   * Load a saved custom theme by name
   */
  static loadSavedTheme(name: string): SavedCustomTheme | null {
    const themes = this.getSavedThemes();
    return themes.find(t => t.name === name) || null;
  }

  /**
   * Delete a saved custom theme
   */
  static deleteSavedTheme(name: string): void {
    const themes = this.getSavedThemes();
    const filtered = themes.filter(t => t.name !== name);
    localStorage.setItem('otto-saved-themes', JSON.stringify(filtered));
  }
}

