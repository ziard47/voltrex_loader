import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import './index.css';

const redTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1D1616',
      paper: '#261e1e'
    },
    primary: {
      main: '#D84040',
      light: '#e86060',
      dark: '#8E1616'
    },
    secondary: {
      main: '#8E1616',
      light: '#b02525',
      dark: '#5e0d0d'
    },
    success: {
      main: '#34d399'
    },
    warning: {
      main: '#fbbf24'
    },
    error: {
      main: '#D84040'
    },
    text: {
      primary: '#EEEEEE',
      secondary: '#b8a5a5'
    }
  },
  typography: {
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  shape: {
    borderRadius: 10
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1D1616',
          backgroundImage: 'none',
          border: '1px solid rgba(142, 22, 22, 0.4)',
          borderRadius: 14
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={redTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
