/**
 * Theme Service - manages color themes and CSS variable updates
 */

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
}

export const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    bgTertiary: '#e8e8e8',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    borderColor: '#d0d0d0',
    accentColor: '#0066cc',
    accentHover: '#0052a3',
    successColor: '#28a745',
    errorColor: '#dc3545',
    tabHeaderBg: '#f5f5f5',
    tabHeaderBorder: '#e0e0e0',
    tabInactiveColor: '#666666',
    tabHoverBg: 'rgba(0, 0, 0, 0.05)',
    tabHoverColor: '#333333',
    tabActiveColor: '#0066cc',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#0066cc',
    tabContentBg: '#ffffff',
  },
  dark: {
    bgPrimary: '#1a1a1a',
    bgSecondary: '#2d2d2d',
    bgTertiary: '#404040',
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    borderColor: '#404040',
    accentColor: '#4a9eff',
    accentHover: '#6bb3ff',
    successColor: '#48c774',
    errorColor: '#f14668',
    tabHeaderBg: '#2d2d2d',
    tabHeaderBorder: '#404040',
    tabInactiveColor: '#b0b0b0',
    tabHoverBg: 'rgba(255, 255, 255, 0.1)',
    tabHoverColor: '#ffffff',
    tabActiveColor: '#4a9eff',
    tabActiveBg: '#1a1a1a',
    tabActiveBorder: '#4a9eff',
    tabContentBg: '#1a1a1a',
  },
  blue: {
    bgPrimary: '#ffffff',
    bgSecondary: '#e8f4f8',
    bgTertiary: '#d1e9f1',
    textPrimary: '#1a3a52',
    textSecondary: '#4a6b7a',
    borderColor: '#b8d4e0',
    accentColor: '#0066cc',
    accentHover: '#0052a3',
    successColor: '#28a745',
    errorColor: '#dc3545',
    tabHeaderBg: '#e8f4f8',
    tabHeaderBorder: '#b8d4e0',
    tabInactiveColor: '#4a6b7a',
    tabHoverBg: 'rgba(0, 102, 204, 0.1)',
    tabHoverColor: '#1a3a52',
    tabActiveColor: '#0066cc',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#0066cc',
    tabContentBg: '#ffffff',
  },
  green: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f0f8f0',
    bgTertiary: '#e1f1e1',
    textPrimary: '#1a3a1a',
    textSecondary: '#4a6b4a',
    borderColor: '#b8d4b8',
    accentColor: '#28a745',
    accentHover: '#218838',
    successColor: '#28a745',
    errorColor: '#dc3545',
    tabHeaderBg: '#f0f8f0',
    tabHeaderBorder: '#b8d4b8',
    tabInactiveColor: '#4a6b4a',
    tabHoverBg: 'rgba(40, 167, 69, 0.1)',
    tabHoverColor: '#1a3a1a',
    tabActiveColor: '#28a745',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#28a745',
    tabContentBg: '#ffffff',
  },
  purple: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f0f8',
    bgTertiary: '#f1e1f1',
    textPrimary: '#3a1a3a',
    textSecondary: '#6b4a6b',
    borderColor: '#d4b8d4',
    accentColor: '#7c3aed',
    accentHover: '#6d28d9',
    successColor: '#28a745',
    errorColor: '#dc3545',
    tabHeaderBg: '#f8f0f8',
    tabHeaderBorder: '#d4b8d4',
    tabInactiveColor: '#6b4a6b',
    tabHoverBg: 'rgba(124, 58, 237, 0.1)',
    tabHoverColor: '#3a1a3a',
    tabActiveColor: '#7c3aed',
    tabActiveBg: '#ffffff',
    tabActiveBorder: '#7c3aed',
    tabContentBg: '#ffffff',
  },
};

export class ThemeService {
  private static currentTheme: ThemePreset = 'light';

  /**
   * Apply a theme preset to the document
   */
  static applyTheme(theme: ThemePreset): void {
    this.currentTheme = theme;
    const colors = THEME_PRESETS[theme];
    
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
  }

  /**
   * Get the current theme
   */
  static getCurrentTheme(): ThemePreset {
    return this.currentTheme;
  }

  /**
   * Initialize theme from localStorage or default to light
   */
  static initializeTheme(): void {
    const savedTheme = localStorage.getItem('otto-theme') as ThemePreset | null;
    if (savedTheme && THEME_PRESETS[savedTheme]) {
      this.applyTheme(savedTheme);
    } else {
      this.applyTheme('light');
    }
  }

  /**
   * Save theme preference to localStorage
   */
  static saveTheme(theme: ThemePreset): void {
    localStorage.setItem('otto-theme', theme);
    this.applyTheme(theme);
  }
}

