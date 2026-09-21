import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { THEME_PRESETS, resolveTokens, buildMuiTheme, hexToRgb } from '../utils/themePresets';

const ThemeContext = createContext(null);

const DEFAULT_CUSTOM_THEME = {
  primary: '#D84040',
  secondary: '#8E1616',
  bgBase: '#1D1616',
  bgSurface: '#140e0e'
};

const DEFAULT_DARK_READER = {
  enabled: false,
  brightness: 100,
  contrast: 100,
  sepia: 0
};

// Quick helper to read cache synchronously
function getInitialThemeCache() {
  try {
    const cached = localStorage.getItem('voltrex_theme_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore cache error
  }
  return null;
}

export function AppThemeProvider({ children }) {
  const cache = useMemo(() => getInitialThemeCache(), []);

  const [themeMode, setThemeModeState] = useState(cache?.themeMode || 'system');
  const [themePreset, setThemePresetState] = useState(cache?.themePreset || 'crimson');
  const [customTheme, setCustomThemeState] = useState(cache?.customTheme || DEFAULT_CUSTOM_THEME);
  const [darkReader, setDarkReaderState] = useState(cache?.darkReader || DEFAULT_DARK_READER);

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Listen to OS system color scheme changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemPrefersDark(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  // Compute effective mode: 'dark' | 'light'
  const effectiveMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themeMode === 'light' ? 'light' : 'dark';
  }, [themeMode, systemPrefersDark]);

  // Load from backend settings on boot
  useEffect(() => {
    async function loadBackendSettings() {
      try {
        if (window.electronAPI?.getSettings) {
          const settings = await window.electronAPI.getSettings();
          if (settings) {
            if (settings.themeMode) setThemeModeState(settings.themeMode);
            if (settings.themePreset) setThemePresetState(settings.themePreset);
            if (settings.customTheme) setCustomThemeState(settings.customTheme);
            if (settings.darkReader) setDarkReaderState(settings.darkReader);
          }
        }
      } catch (err) {
        console.error('Failed to load theme settings:', err);
      }
    }
    loadBackendSettings();
  }, []);

  // Resolve design tokens
  const tokens = useMemo(() => {
    return resolveTokens(themePreset, effectiveMode, customTheme);
  }, [themePreset, effectiveMode, customTheme]);

  // Build reactive MUI Theme
  const muiTheme = useMemo(() => {
    return buildMuiTheme(tokens, effectiveMode);
  }, [tokens, effectiveMode]);

  // Apply CSS custom properties to document root & manage html class
  useEffect(() => {
    const root = document.documentElement;
    const primRgb = hexToRgb(tokens.primary);
    const secRgb = hexToRgb(tokens.secondary);

    root.style.setProperty('--theme-bg-base', tokens.bgBase);
    root.style.setProperty('--theme-bg-surface', tokens.bgSurface);
    root.style.setProperty('--theme-bg-sidebar', tokens.bgSidebar);
    root.style.setProperty('--theme-bg-card', tokens.bgCard);
    root.style.setProperty('--theme-bg-hover', tokens.bgHover);
    root.style.setProperty('--theme-primary', tokens.primary);
    root.style.setProperty('--theme-primary-hover', tokens.primaryHover);
    root.style.setProperty('--theme-primary-rgb', primRgb);
    root.style.setProperty('--theme-secondary', tokens.secondary);
    root.style.setProperty('--theme-secondary-rgb', secRgb);
    root.style.setProperty('--theme-secondary-subtle', `rgba(${secRgb}, ${effectiveMode === 'dark' ? 0.25 : 0.15})`);
    root.style.setProperty('--theme-primary-glow', `rgba(${primRgb}, ${effectiveMode === 'dark' ? 0.35 : 0.2})`);
    root.style.setProperty('--theme-bg-input', tokens.bgInput || (effectiveMode === 'dark' ? tokens.bgSurface : '#ffffff'));
    root.style.setProperty('--theme-bg-subtle', effectiveMode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)');
    root.style.setProperty('--theme-border', tokens.border);
    root.style.setProperty('--theme-border-accent', tokens.borderAccent);
    root.style.setProperty('--theme-text-primary', tokens.textPrimary);
    root.style.setProperty('--theme-text-muted', tokens.textMuted);

    // Update <html> classes for Tailwind dark: selector & data-mode attribute
    root.setAttribute('data-mode', effectiveMode);
    if (effectiveMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Ensure display filter is clean
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.filter = 'none';
    }

    // Persist to localStorage cache
    try {
      localStorage.setItem(
        'voltrex_theme_cache',
        JSON.stringify({
          themeMode,
          themePreset,
          customTheme,
          darkReader
        })
      );
    } catch (e) {
      // Ignore cache storage error
    }
  }, [tokens, effectiveMode, darkReader, themeMode, themePreset, customTheme]);

  // Public setters that optionally sync with backend
  const setThemeMode = useCallback((mode, syncBackend = true) => {
    setThemeModeState(mode);
    if (syncBackend && window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ themeMode: mode });
    }
  }, []);

  const setThemePreset = useCallback((preset, syncBackend = true) => {
    setThemePresetState(preset);
    if (syncBackend && window.electronAPI?.saveSettings) {
      window.electronAPI.saveSettings({ themePreset: preset });
    }
  }, []);

  const setCustomTheme = useCallback((themeUpdate, syncBackend = true) => {
    setCustomThemeState((prev) => {
      const merged = { ...prev, ...themeUpdate };
      if (syncBackend && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ customTheme: merged });
      }
      return merged;
    });
  }, []);

  const setDarkReader = useCallback((drUpdate, syncBackend = true) => {
    setDarkReaderState((prev) => {
      const merged = { ...prev, ...drUpdate };
      if (syncBackend && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ darkReader: merged });
      }
      return merged;
    });
  }, []);

  const toggleMode = useCallback(() => {
    const nextMode = effectiveMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [effectiveMode, setThemeMode]);

  const resetTheme = useCallback(() => {
    setThemeMode('system');
    setThemePreset('crimson');
    setCustomTheme(DEFAULT_CUSTOM_THEME);
    setDarkReader(DEFAULT_DARK_READER);
  }, [setThemeMode, setThemePreset, setCustomTheme, setDarkReader]);

  const contextValue = {
    themeMode,
    setThemeMode,
    effectiveMode,
    themePreset,
    setThemePreset,
    customTheme,
    setCustomTheme,
    darkReader,
    setDarkReader,
    tokens,
    toggleMode,
    resetTheme,
    THEME_PRESETS
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within an AppThemeProvider');
  }
  return ctx;
}
