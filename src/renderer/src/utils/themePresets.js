import { createTheme } from '@mui/material/styles';

export function hexToRgb(hex) {
  if (!hex) return '216, 64, 64';
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return '216, 64, 64';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export function adjustBrightness(hex, percent) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  let num = parseInt(clean, 16);
  if (isNaN(num)) return hex;
  let r = Math.min(255, Math.max(0, ((num >> 16) & 255) + Math.round(255 * (percent / 100))));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 255) + Math.round(255 * (percent / 100))));
  let b = Math.min(255, Math.max(0, (num & 255) + Math.round(255 * (percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const THEME_PRESETS = [
  {
    id: 'crimson',
    name: 'Voltrex Crimson',
    description: 'Signature dark crimson and vivid scarlet',
    primary: '#D84040',
    secondary: '#8E1616',
    dark: {
      bgBase: '#1D1616',
      bgSurface: '#140e0e',
      bgSidebar: '#1A1212',
      bgCard: '#261e1e',
      bgHover: '#2e2020',
      bgInput: '#140e0e',
      primary: '#D84040',
      primaryHover: '#b02525',
      secondary: '#8E1616',
      border: 'rgba(142, 22, 22, 0.35)',
      borderAccent: 'rgba(216, 64, 64, 0.45)',
      textPrimary: '#EEEEEE',
      textMuted: '#b8a5a5'
    },
    light: {
      bgBase: '#f8fafc',
      bgSurface: '#ffffff',
      bgSidebar: '#f1f5f9',
      bgCard: '#ffffff',
      bgHover: '#f1f5f9',
      bgInput: '#ffffff',
      primary: '#D84040',
      primaryHover: '#b82828',
      secondary: '#8E1616',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(216, 64, 64, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    description: 'Electrifying cyan and deep aqua glow',
    primary: '#06b6d4',
    secondary: '#0891b2',
    dark: {
      bgBase: '#0c1622',
      bgSurface: '#070f18',
      bgSidebar: '#09121d',
      bgCard: '#112234',
      bgHover: '#15293e',
      bgInput: '#070f18',
      primary: '#00e5ff',
      primaryHover: '#00b4d8',
      secondary: '#0284c7',
      border: 'rgba(8, 145, 178, 0.35)',
      borderAccent: 'rgba(0, 229, 255, 0.45)',
      textPrimary: '#edfaff',
      textMuted: '#8cbcd0'
    },
    light: {
      bgBase: '#f0f9ff',
      bgSurface: '#ffffff',
      bgSidebar: '#e0f2fe',
      bgCard: '#ffffff',
      bgHover: '#e0f2fe',
      bgInput: '#ffffff',
      primary: '#0284c7',
      primaryHover: '#0369a1',
      secondary: '#0077b6',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(2, 132, 199, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'violet',
    name: 'Electric Violet',
    description: 'Synthwave neon purple and deep indigo',
    primary: '#a855f7',
    secondary: '#7e22ce',
    dark: {
      bgBase: '#171124',
      bgSurface: '#0e0a17',
      bgSidebar: '#130d1e',
      bgCard: '#241a38',
      bgHover: '#2d2045',
      bgInput: '#0e0a17',
      primary: '#c084fc',
      primaryHover: '#a855f7',
      secondary: '#7e22ce',
      border: 'rgba(126, 34, 206, 0.35)',
      borderAccent: 'rgba(192, 132, 252, 0.45)',
      textPrimary: '#f5f3ff',
      textMuted: '#b9aed4'
    },
    light: {
      bgBase: '#faf5ff',
      bgSurface: '#ffffff',
      bgSidebar: '#f3e8ff',
      bgCard: '#ffffff',
      bgHover: '#f3e8ff',
      bgInput: '#ffffff',
      primary: '#9333ea',
      primaryHover: '#7e22ce',
      secondary: '#6b21a8',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(147, 51, 234, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    description: 'Cyberpunk emerald and forest green accents',
    primary: '#10b981',
    secondary: '#047857',
    dark: {
      bgBase: '#0d1a16',
      bgSurface: '#07120e',
      bgSidebar: '#0a1612',
      bgCard: '#152923',
      bgHover: '#1c382f',
      bgInput: '#07120e',
      primary: '#34d399',
      primaryHover: '#10b981',
      secondary: '#059669',
      border: 'rgba(5, 150, 105, 0.35)',
      borderAccent: 'rgba(52, 211, 153, 0.45)',
      textPrimary: '#ecfdf5',
      textMuted: '#93c4b0'
    },
    light: {
      bgBase: '#f0fdf4',
      bgSurface: '#ffffff',
      bgSidebar: '#dcfce7',
      bgCard: '#ffffff',
      bgHover: '#dcfce7',
      bgInput: '#ffffff',
      primary: '#059669',
      primaryHover: '#047857',
      secondary: '#065f46',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(5, 150, 105, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    description: 'Warm glowing amber, orange and golden hues',
    primary: '#f59e0b',
    secondary: '#b45309',
    dark: {
      bgBase: '#1f160e',
      bgSurface: '#140c06',
      bgSidebar: '#19110a',
      bgCard: '#2c2014',
      bgHover: '#38291a',
      bgInput: '#140c06',
      primary: '#fbbf24',
      primaryHover: '#f59e0b',
      secondary: '#d97706',
      border: 'rgba(217, 119, 6, 0.35)',
      borderAccent: 'rgba(251, 191, 36, 0.45)',
      textPrimary: '#fffbeb',
      textMuted: '#cfb99e'
    },
    light: {
      bgBase: '#fffbeb',
      bgSurface: '#ffffff',
      bgSidebar: '#fef3c7',
      bgCard: '#ffffff',
      bgHover: '#fef3c7',
      bgInput: '#ffffff',
      primary: '#d97706',
      primaryHover: '#b45309',
      secondary: '#92400e',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(217, 119, 6, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'sapphire',
    name: 'Sapphire Blue',
    description: 'Deep royal blue with electric azure sheen',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    dark: {
      bgBase: '#0d1527',
      bgSurface: '#070c17',
      bgSidebar: '#0a1120',
      bgCard: '#15213d',
      bgHover: '#1c2c52',
      bgInput: '#070c17',
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      secondary: '#2563eb',
      border: 'rgba(37, 99, 235, 0.35)',
      borderAccent: 'rgba(96, 165, 250, 0.45)',
      textPrimary: '#eff6ff',
      textMuted: '#97b1d8'
    },
    light: {
      bgBase: '#eff6ff',
      bgSurface: '#ffffff',
      bgSidebar: '#dbeafe',
      bgCard: '#ffffff',
      bgHover: '#dbeafe',
      bgInput: '#ffffff',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      secondary: '#1e40af',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(37, 99, 235, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'rose',
    name: 'Rose Quartz',
    description: 'Modern cyberpunk neon pink and rose blossom',
    primary: '#ec4899',
    secondary: '#be185d',
    dark: {
      bgBase: '#1d1017',
      bgSurface: '#12080e',
      bgSidebar: '#170c12',
      bgCard: '#2c1923',
      bgHover: '#39202e',
      bgInput: '#12080e',
      primary: '#f472b6',
      primaryHover: '#ec4899',
      secondary: '#db2777',
      border: 'rgba(219, 39, 119, 0.35)',
      borderAccent: 'rgba(244, 114, 182, 0.45)',
      textPrimary: '#fdf2f8',
      textMuted: '#cca7b8'
    },
    light: {
      bgBase: '#fdf2f8',
      bgSurface: '#ffffff',
      bgSidebar: '#fce7f3',
      bgCard: '#ffffff',
      bgHover: '#fce7f3',
      bgInput: '#ffffff',
      primary: '#db2777',
      primaryHover: '#be185d',
      secondary: '#9d174d',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(219, 39, 119, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  },
  {
    id: 'slate',
    name: 'Midnight Slate',
    description: 'Sophisticated industrial slate and obsidian carbon',
    primary: '#94a3b8',
    secondary: '#475569',
    dark: {
      bgBase: '#121417',
      bgSurface: '#0c0d0f',
      bgSidebar: '#0f1013',
      bgCard: '#1a1d22',
      bgHover: '#23282f',
      bgInput: '#0c0d0f',
      primary: '#cbd5e1',
      primaryHover: '#94a3b8',
      secondary: '#64748b',
      border: 'rgba(100, 116, 139, 0.35)',
      borderAccent: 'rgba(203, 213, 225, 0.45)',
      textPrimary: '#f8fafc',
      textMuted: '#94a3b8'
    },
    light: {
      bgBase: '#f8fafc',
      bgSurface: '#ffffff',
      bgSidebar: '#f1f5f9',
      bgCard: '#ffffff',
      bgHover: '#f1f5f9',
      bgInput: '#ffffff',
      primary: '#475569',
      primaryHover: '#334155',
      secondary: '#1e293b',
      border: 'rgba(0, 0, 0, 0.12)',
      borderAccent: 'rgba(71, 85, 105, 0.35)',
      textPrimary: '#0f172a',
      textMuted: '#64748b'
    }
  }
];

export function resolveTokens(presetId, mode, customConfig = null) {
  if (presetId === 'custom' && customConfig) {
    const isDark = mode === 'dark';
    const primary = customConfig.primary || '#D84040';
    const secondary = customConfig.secondary || '#8E1616';
    const bgBase = customConfig.bgBase || (isDark ? '#141416' : '#f8fafc');
    const bgSurface = customConfig.bgSurface || (isDark ? '#0d0d0f' : '#ffffff');
    const primRgb = hexToRgb(primary);
    const secRgb = hexToRgb(secondary);

    return {
      bgBase,
      bgSurface,
      bgSidebar: isDark ? adjustBrightness(bgBase, -3) : '#f1f5f9',
      bgCard: isDark ? adjustBrightness(bgBase, 8) : '#ffffff',
      bgHover: isDark ? adjustBrightness(bgBase, 14) : '#f1f5f9',
      bgInput: isDark ? adjustBrightness(bgBase, 4) : '#ffffff',
      primary,
      primaryHover: adjustBrightness(primary, isDark ? -10 : 10),
      secondary,
      border: isDark ? `rgba(${secRgb}, 0.35)` : 'rgba(0, 0, 0, 0.12)',
      borderAccent: isDark ? `rgba(${primRgb}, 0.45)` : `rgba(${primRgb}, 0.35)`,
      textPrimary: isDark ? '#EEEEEE' : '#0f172a',
      textMuted: isDark ? '#a1a1aa' : '#64748b'
    };
  }

  const preset = THEME_PRESETS.find((p) => p.id === presetId) || THEME_PRESETS[0];
  return mode === 'light' ? preset.light : preset.dark;
}

export const WINDOWS_LEGACY_LIGHT_TOKENS = {
  bgBase: '#f3f3f3',
  bgSurface: '#ffffff',
  bgSidebar: '#f3f3f3',
  bgCard: '#ffffff',
  bgHover: '#e5f1fb',
  bgInput: '#ffffff',
  primary: '#0078D7',
  primaryHover: '#0063B1',
  secondary: '#004E8C',
  border: '#d1d1d1',
  borderAccent: '#0078D7',
  textPrimary: '#000000',
  textMuted: '#555555'
};

export const WINDOWS_LEGACY_DARK_TOKENS = {
  bgBase: '#191919',
  bgSurface: '#1f1f1f',
  bgSidebar: '#1f1f1f',
  bgCard: '#202020',
  bgHover: '#2d2d2d',
  bgInput: '#1f1f1f',
  primary: '#0078D7',
  primaryHover: '#1988e0',
  secondary: '#005a9e',
  border: '#383838',
  borderAccent: '#0078D7',
  textPrimary: '#ffffff',
  textMuted: '#aaaaaa'
};

export const WINDOWS_LEGACY_TOKENS = WINDOWS_LEGACY_LIGHT_TOKENS;

export function resolveWindowsLegacyTokens(mode = 'light') {
  return mode === 'dark' ? WINDOWS_LEGACY_DARK_TOKENS : WINDOWS_LEGACY_LIGHT_TOKENS;
}

export function buildMuiTheme(tokens, mode, isWindowsLegacy = false) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      background: {
        default: tokens.bgBase,
        paper: tokens.bgCard
      },
      primary: {
        main: tokens.primary,
        light: tokens.primaryHover,
        dark: tokens.secondary,
        contrastText: '#ffffff'
      },
      secondary: {
        main: tokens.secondary,
        light: tokens.primary,
        dark: tokens.bgBase,
        contrastText: '#ffffff'
      },
      success: {
        main: '#10b981'
      },
      warning: {
        main: '#f59e0b'
      },
      error: {
        main: '#ef4444'
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textMuted
      }
    },
    typography: {
      fontFamily: isWindowsLegacy
        ? "'Segoe UI', Tahoma, 'MS Sans Serif', Arial, sans-serif"
        : "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
    },
    shape: {
      borderRadius: isWindowsLegacy ? 2 : 10
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: isWindowsLegacy ? 2 : 8
          },
          contained: {
            boxShadow: 'none !important',
            '&:hover': {
              boxShadow: 'none !important'
            },
            color: '#ffffff !important',
            '& *': {
              color: '#ffffff !important'
            }
          },
          containedPrimary: {
            boxShadow: 'none !important',
            '&:hover': {
              boxShadow: 'none !important'
            },
            color: '#ffffff !important',
            '& *': {
              color: '#ffffff !important'
            }
          },
          outlined: {
            borderColor: isDark ? tokens.border : 'rgba(0, 0, 0, 0.15)',
            '&:hover': {
              backgroundColor: isDark ? tokens.bgHover : '#f1f5f9',
              borderColor: tokens.primary
            }
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.bgCard,
            backgroundImage: 'none',
            border: `1px solid ${tokens.borderAccent}`,
            borderRadius: isWindowsLegacy ? 2 : 14,
            color: tokens.textPrimary,
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)'
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.bgCard,
            backgroundImage: 'none',
            border: `1px solid ${tokens.border}`,
            color: tokens.textPrimary,
            boxShadow: isDark
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
              : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: tokens.border,
            color: tokens.textPrimary
          },
          head: {
            backgroundColor: tokens.bgSidebar,
            color: tokens.textMuted,
            fontWeight: 600
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            color: tokens.textPrimary,
            backgroundColor: tokens.bgInput,
            '& input': {
              color: `${tokens.textPrimary} !important`,
              WebkitTextFillColor: `${tokens.textPrimary} !important`
            }
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: tokens.bgInput,
            '& fieldset': {
              borderColor: tokens.border
            },
            '&:hover fieldset': {
              borderColor: tokens.borderAccent
            }
          }
        }
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            color: `${tokens.textPrimary} !important`,
            WebkitTextFillColor: `${tokens.textPrimary} !important`,
            backgroundColor: tokens.bgInput
          },
          icon: {
            color: tokens.textMuted
          }
        }
      }
    }
  });
}
