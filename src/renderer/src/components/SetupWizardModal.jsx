import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import {
  Sparkles,
  Zap,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Palette,
  Chrome,
  FolderOpen,
  HardDrive,
  Globe,
  Shield,
  Rocket,
  X,
  Copy,
  Moon,
  Sun,
  Laptop,
  FolderTree,
  Server,
  AppWindow
} from 'lucide-react';
import appLogo from '../assets/logo.jpg';
import { useTheme } from '../context/ThemeContext';
import { THEME_PRESETS } from '../utils/themePresets';

export default function SetupWizardModal({ open, onClose, onFinish }) {
  const {
    themeMode,
    setThemeMode,
    themePreset,
    setThemePreset,
    windowsLegacy,
    setWindowsLegacy,
    effectiveMode
  } = useTheme();

  // Step indicator: 1 to 6
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [downloadPath, setDownloadPath] = useState('');
  const [organizeByCategory, setOrganizeByCategory] = useState(false);
  const [startWithSystem, setStartWithSystem] = useState(false);

  // Proxy states
  const [proxyMode, setProxyMode] = useState('direct'); // 'direct' | 'system' | 'manual'
  const [proxyProtocol, setProxyProtocol] = useState('http');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState(8080);
  const [proxyAuth, setProxyAuth] = useState(false);
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  // UI feedback states
  const [copyFeedback, setCopyFeedback] = useState('');

  // Initialize defaults on open
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      async function loadInitial() {
        try {
          if (window.electronAPI?.getSettings) {
            const s = await window.electronAPI.getSettings();
            if (s) {
              if (s.defaultDownloadPath) setDownloadPath(s.defaultDownloadPath);
              if (typeof s.organizeByCategory === 'boolean') setOrganizeByCategory(s.organizeByCategory);
              if (typeof s.startWithSystem === 'boolean') setStartWithSystem(s.startWithSystem);
              if (s.proxyMode) setProxyMode(s.proxyMode);
              if (s.proxyProtocol) setProxyProtocol(s.proxyProtocol);
              if (s.proxyHost) setProxyHost(s.proxyHost);
              if (s.proxyPort) setProxyPort(s.proxyPort);
              if (typeof s.proxyAuth === 'boolean') setProxyAuth(s.proxyAuth);
              if (s.proxyUsername) setProxyUsername(s.proxyUsername);
              if (s.proxyPassword) setProxyPassword(s.proxyPassword);
            }
          } else if (window.electronAPI?.getDefaultDownloadPath) {
            const defPath = await window.electronAPI.getDefaultDownloadPath();
            if (defPath) setDownloadPath(defPath);
          }
        } catch (err) {
          console.error('Error initializing setup wizard settings:', err);
        }
      }
      loadInitial();
    }
  }, [open]);

  // Browse Directory Handler
  const handleBrowseFolder = async () => {
    try {
      if (window.electronAPI?.browseDirectory) {
        const selected = await window.electronAPI.browseDirectory(downloadPath);
        if (selected) {
          setDownloadPath(selected);
        }
      }
    } catch (err) {
      console.error('Error selecting directory:', err);
    }
  };

  // Copy helper with feedback
  const handleCopy = async (text, msg) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyFeedback(msg);
        setTimeout(() => setCopyFeedback(''), 2500);
      }
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  // Save gathered settings and complete
  const handleCompleteWizard = async () => {
    const payload = {
      setupWizardCompleted: true,
      themeMode,
      themePreset,
      windowsLegacy,
      defaultDownloadPath: downloadPath,
      organizeByCategory,
      startWithSystem,
      proxyMode,
      proxyProtocol,
      proxyHost,
      proxyPort: Number(proxyPort) || 8080,
      proxyAuth,
      proxyUsername,
      proxyPassword
    };

    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings(payload);
      }
      localStorage.setItem('voltrex_setup_completed', 'true');
    } catch (err) {
      console.error('Failed to save setup wizard settings:', err);
    }

    if (onFinish) {
      onFinish(payload);
    } else if (onClose) {
      onClose();
    }
  };

  const handleSkipWizard = async () => {
    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings({ setupWizardCompleted: true });
      }
      localStorage.setItem('voltrex_setup_completed', 'true');
    } catch (err) {
      console.error('Failed to skip setup wizard:', err);
    }

    if (onClose) {
      onClose();
    }
  };

  // Step Titles and Descriptions
  const stepsMeta = [
    { title: 'Welcome', icon: Sparkles },
    { title: 'Appearance', icon: Palette },
    { title: 'Extension', icon: Chrome },
    { title: 'Downloads', icon: FolderOpen },
    { title: 'Proxy', icon: Shield },
    { title: 'Finish', icon: Rocket }
  ];

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className:
          '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-2xl !shadow-2xl overflow-hidden flex flex-col max-h-[92vh] !text-[var(--theme-text-primary)]'
      }}
    >
      {/* Wizard Header Bar */}
      <div className="px-6 py-4 border-b border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-[var(--theme-border-accent)] shadow-md bg-black/20 flex items-center justify-center shrink-0">
            <img src={appLogo} alt="Voltrex Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--theme-text-primary)] tracking-tight">
                Voltrex Loader Setup Wizard
              </h2>
              <Chip
                label={`Step ${currentStep} of 6`}
                size="small"
                className="!bg-[var(--theme-secondary-subtle)] !text-[var(--theme-primary)] !border !border-[var(--theme-border-accent)] font-bold !text-[11px] !h-5"
              />
            </div>
            <p className="text-xs text-[var(--theme-text-muted)]">
              {stepsMeta[currentStep - 1].title} — Let's tailor Voltrex Loader to your workflow.
            </p>
          </div>
        </div>

        {/* Skip Setup Button */}
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="text"
            onClick={handleSkipWizard}
            className="!text-xs text-slate-500 hover:text-[var(--theme-primary)] dark:text-[#b8a5a5] normal-case"
          >
            Skip Setup
          </Button>
          <Tooltip title="Close & Skip Setup" arrow>
            <IconButton
              size="small"
              onClick={handleSkipWizard}
              className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !p-1.5"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Progressive Step Breadcrumbs Bar */}
      <div className="px-6 py-2.5 bg-[var(--theme-bg-base)]/50 border-b border-[var(--theme-border-accent)] flex items-center justify-between gap-1 overflow-x-auto shrink-0">
        {stepsMeta.map((s, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const Icon = s.icon;
          return (
            <div
              key={idx}
              onClick={() => setCurrentStep(stepNum)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                isCurrent
                  ? 'bg-[var(--theme-secondary-subtle)] border border-[var(--theme-primary)] text-[var(--theme-primary)] font-bold shadow-sm'
                  : isDone
                  ? 'text-emerald-500 hover:bg-emerald-500/10'
                  : 'text-[var(--theme-text-muted)] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-[var(--theme-primary)]' : ''}`} />
              )}
              <span className="whitespace-nowrap">{s.title}</span>
            </div>
          );
        })}
      </div>

      {/* Main Step Body */}
      <DialogContent className="!p-6 flex-1 overflow-y-auto min-h-[380px] bg-[var(--theme-bg-card)]">
        {/* ========================================================================= */}
        {/* STEP 1: WELCOME                                                            */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6 py-2 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
              <div className="relative inline-block mx-auto mb-2">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--theme-primary)] mx-auto">
                  <img src={appLogo} alt="Voltrex Logo" className="w-full h-full object-cover" />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[var(--theme-primary)] border-2 border-[var(--theme-bg-card)]" />
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[var(--theme-text-primary)] tracking-tight">
                Welcome to Voltrex Loader
              </h1>
              <p className="text-sm text-[var(--theme-text-muted)] max-w-lg mx-auto">
                Next-generation, multi-threaded download manager designed for lightning-fast speeds,
                seamless browser automation, and rock-solid connection reliability.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0 text-[var(--theme-primary)]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--theme-text-primary)] mb-0.5">
                    Multi-Segment Turbo Engine
                  </h4>
                  <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                    Downloads are split into up to 32 parallel threads with automatic chunk re-assembly.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0 text-[var(--theme-primary)]">
                  <Chrome className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--theme-text-primary)] mb-0.5">
                    Browser Interception Bridge
                  </h4>
                  <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                    Captures media and batch links directly from Chrome, Brave, and Edge automatically.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0 text-[var(--theme-primary)]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--theme-text-primary)] mb-0.5">
                    Proxies & Queue Management
                  </h4>
                  <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                    Support for HTTP, HTTPS, and SOCKS5 proxies with intelligent scheduling.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0 text-[var(--theme-primary)]">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--theme-text-primary)] mb-0.5">
                    Curated Aesthetics
                  </h4>
                  <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
                    8 vibrant visual presets tailored for high-contrast light and sleek dark modes.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-[var(--theme-text-muted)]">
                This guided wizard will take less than 1 minute. You can change any of these settings later in the Settings page.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CHOOSE THEME                                                       */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-2xl mx-auto py-1">
            <div>
              <h3 className="text-base font-bold text-[var(--theme-text-primary)] mb-1 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--theme-primary)]" />
                Select Your Visual Theme
              </h3>
              <p className="text-xs text-[var(--theme-text-muted)]">
                Pick your preferred mode and color accent. The entire application updates live so you can preview your choices immediately.
              </p>
            </div>

            {/* Theme Mode Selection */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-2">
                Display Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'system', label: 'System Default', icon: Laptop, desc: 'Auto-sync with OS' },
                  { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Sleek & eye-friendly' },
                  { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Crisp & high-contrast' }
                ].map((item) => {
                  const Icon = item.icon;
                  const isCur = themeMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setThemeMode(item.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-start gap-1.5 ${
                        isCur
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] ring-1 ring-[var(--theme-primary)] shadow-sm'
                          : 'border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] hover:border-[var(--theme-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Icon className={`w-4 h-4 ${isCur ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-muted)]'}`} />
                        {isCur && <Check className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                      </div>
                      <span className={`text-xs font-bold ${isCur ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-[var(--theme-text-muted)]">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Windows 10 Theme Option Card */}
            <div
              onClick={() => setWindowsLegacy(!windowsLegacy)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                windowsLegacy
                  ? 'border-[#0078D7] bg-[#0078D7]/10 ring-1 ring-[#0078D7] shadow-sm'
                  : 'border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] hover:border-[#0078D7]/60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                    windowsLegacy
                      ? 'bg-[#0078D7] text-white border-[#0078D7]'
                      : 'bg-[var(--theme-bg-base)] text-[var(--theme-text-muted)] border-[var(--theme-border-accent)]'
                  }`}
                >
                  <AppWindow className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--theme-text-primary)]">
                      Windows 10 Theme
                    </span>
                    {windowsLegacy ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-[#0078D7] text-white shadow-xs">
                        Default & Active ({effectiveMode === 'dark' ? 'Dark' : 'Light'})
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[var(--theme-bg-base)] text-[var(--theme-text-muted)] border border-[var(--theme-border-accent)]">
                        Modern Desktop Look
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--theme-text-muted)] mt-0.5 leading-relaxed">
                    Native Windows 10 File Explorer interface styling with signature #0078D7 blue accents, crisp desktop controls, and full support for both Light and Dark themes.
                  </p>
                </div>
              </div>

              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={windowsLegacy}
                  onChange={(e) => setWindowsLegacy(e.target.checked)}
                  color="primary"
                />
              </div>
            </div>

            {/* Curated Color Palettes */}
            <div className={`space-y-2 transition-opacity ${windowsLegacy ? 'opacity-85' : ''}`}>
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                  Color Palette Accent
                </label>
                {windowsLegacy && (
                  <span className="text-[10px] text-[var(--theme-text-muted)] italic">
                    (Selecting a palette switches from Windows 10 theme)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {THEME_PRESETS.filter((p) => p.id !== 'custom').map((p) => {
                  const isCur = !windowsLegacy && themePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (windowsLegacy) setWindowsLegacy(false);
                        setThemePreset(p.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-20 cursor-pointer ${
                        isCur
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] ring-1 ring-[var(--theme-primary)] shadow-sm'
                          : 'border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] hover:border-[var(--theme-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full shadow-inner border border-black/20"
                            style={{ backgroundColor: p.primary }}
                          />
                          <span
                            className="w-3 h-3 rounded-full shadow-inner border border-black/20"
                            style={{ backgroundColor: p.secondary }}
                          />
                        </div>
                        {isCur && <Check className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                      </div>
                      <div>
                        <div className={`text-xs font-bold truncate ${isCur ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                          {p.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SETUP CHROME EXTENSION                                            */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-2xl mx-auto py-1">
            <div>
              <h3 className="text-base font-bold text-[var(--theme-text-primary)] mb-1 flex items-center gap-2">
                <Chrome className="w-4 h-4 text-[var(--theme-primary)]" />
                Browser Extension Integration
              </h3>
              <p className="text-xs text-[var(--theme-text-muted)]">
                Seamlessly capture downloads from Chrome, Edge, Brave, and other Chromium browsers with our companion extension.
              </p>
            </div>

            {/* Bridge Status Card */}
            <div className="p-4 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--theme-text-primary)]">
                      Local Extension Bridge
                    </h4>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Listening on Port 9580
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--theme-text-muted)] mt-0.5">
                    Voltrex Loader automatically communicates with your browser over this secure local bridge.
                  </p>
                </div>
              </div>

              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(
                      'https://github.com/ziard47/voltrex_loader/releases/download/v1.2.0/voltrex-loader-browser-extension.zip'
                    );
                  }
                }}
                className="btn-theme-primary !text-white !text-xs !py-1.5 !px-3.5 shrink-0 !font-semibold rounded-lg shadow-sm"
              >
                Download (.zip)
              </Button>
            </div>

            {/* Quick 3-Step Setup Guide */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                3-Step Installation Guide
              </label>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center text-xs font-bold text-[var(--theme-primary)] shrink-0">
                    1
                  </span>
                  <div className="text-xs leading-relaxed text-[var(--theme-text-primary)]">
                    Download and extract the <strong>voltrex-loader-browser-extension.zip</strong> archive into a permanent folder on your computer.
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center text-xs font-bold text-[var(--theme-primary)] shrink-0">
                    2
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--theme-text-primary)] mb-1.5">
                      Open your browser and navigate to the Extensions management page:
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono bg-black/10 dark:bg-black/40 px-2 py-1 rounded border border-[var(--theme-border-accent)] text-[var(--theme-primary)] truncate">
                        chrome://extensions
                      </code>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Copy className="w-3 h-3" />}
                        onClick={() => handleCopy('chrome://extensions', 'URL copied!')}
                        className="border border-[var(--theme-border-accent)] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-[11px] !py-0.5 !px-2 rounded-lg"
                      >
                        {copyFeedback || 'Copy URL'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center text-xs font-bold text-[var(--theme-primary)] shrink-0">
                    3
                  </span>
                  <div className="text-xs leading-relaxed text-[var(--theme-text-primary)]">
                    Enable <strong>Developer mode</strong> (toggle located at the top-right corner), click <strong>Load unpacked</strong>, and select the extracted extension folder.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DEFAULT DOWNLOAD LOCATION                                          */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-2xl mx-auto py-1">
            <div>
              <h3 className="text-base font-bold text-[var(--theme-text-primary)] mb-1 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[var(--theme-primary)]" />
                Choose Default Download Location
              </h3>
              <p className="text-xs text-[var(--theme-text-muted)]">
                Select where downloaded files should be saved automatically on your disk.
              </p>
            </div>

            {/* Folder Picker Section */}
            <div className="p-4 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] space-y-3 shadow-sm">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                Default Target Folder
              </label>

              <div className="flex items-center gap-2">
                <TextField
                  fullWidth
                  size="small"
                  value={downloadPath}
                  onChange={(e) => setDownloadPath(e.target.value)}
                  placeholder="e.g. /home/user/Downloads"
                  className="!bg-[var(--theme-bg-card)]"
                  InputProps={{
                    startAdornment: <HardDrive className="w-4 h-4 text-[var(--theme-primary)] mr-2 shrink-0" />,
                    className: '!text-xs font-mono !h-10 border border-[var(--theme-border-accent)] !text-[var(--theme-text-primary)]'
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleBrowseFolder}
                  startIcon={<FolderOpen className="w-3.5 h-3.5" />}
                  className="!h-10 !px-4 !shrink-0 border border-[var(--theme-border-accent)] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs font-medium whitespace-nowrap rounded-lg"
                >
                  Browse...
                </Button>
              </div>
            </div>

            {/* Auto Category Sorting Toggle */}
            <div className="p-4 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0 text-[var(--theme-primary)]">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--theme-text-primary)]">
                    Organize Downloads by Category
                  </h4>
                  <p className="text-[11px] text-[var(--theme-text-muted)]">
                    Sort incoming files into subfolders like <code>Videos/</code>, <code>Audio/</code>, <code>Documents/</code>, and <code>Compressed/</code>.
                  </p>
                </div>
              </div>

              <Switch
                checked={organizeByCategory}
                onChange={(e) => setOrganizeByCategory(e.target.checked)}
                size="small"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: SETUP PROXY                                                       */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6 max-w-2xl mx-auto py-1">
            <div>
              <h3 className="text-base font-bold text-[var(--theme-text-primary)] mb-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--theme-primary)]" />
                Network & Proxy Configuration
              </h3>
              <p className="text-xs text-[var(--theme-text-muted)]">
                Choose how Voltrex Loader connects to download servers. Most users can use Direct Connection.
              </p>
            </div>

            {/* Mode Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'direct', label: 'Direct Connection', desc: 'No proxy. Recommended for gigabit speeds.' },
                { id: 'system', label: 'System Proxy', desc: 'Inherit system & OS network settings.' },
                { id: 'manual', label: 'Manual Proxy', desc: 'Custom HTTP, HTTPS, or SOCKS5 proxy.' }
              ].map((m) => {
                const isCur = proxyMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setProxyMode(m.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isCur
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] ring-1 ring-[var(--theme-primary)] shadow-sm'
                        : 'border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] hover:border-[var(--theme-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`text-xs font-bold ${isCur ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-primary)]'}`}>
                        {m.label}
                      </span>
                      {isCur && <Check className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                    </div>
                    <span className="text-[10px] text-[var(--theme-text-muted)] leading-relaxed">
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Manual Proxy Inputs */}
            {proxyMode === 'manual' && (
              <div className="p-4 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-[var(--theme-text-primary)] mb-2">
                  Manual Proxy Server Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                      Protocol
                    </label>
                    <FormControl fullWidth size="small">
                      <Select
                        value={proxyProtocol}
                        onChange={(e) => setProxyProtocol(e.target.value)}
                        className="!bg-[var(--theme-bg-card)] !text-xs !h-9 border border-[var(--theme-border-accent)]"
                      >
                        <MenuItem value="http" className="!text-xs">HTTP</MenuItem>
                        <MenuItem value="https" className="!text-xs">HTTPS</MenuItem>
                        <MenuItem value="socks5" className="!text-xs">SOCKS5</MenuItem>
                      </Select>
                    </FormControl>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                      Host Address / IP
                    </label>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="127.0.0.1 or proxy.example.com"
                      value={proxyHost}
                      onChange={(e) => setProxyHost(e.target.value)}
                      className="!bg-[var(--theme-bg-card)]"
                      InputProps={{
                        className: '!text-xs font-mono !h-9 border border-[var(--theme-border-accent)] !text-[var(--theme-text-primary)]'
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                      Port
                    </label>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="8080"
                      value={proxyPort}
                      onChange={(e) => setProxyPort(e.target.value)}
                      className="!bg-[var(--theme-bg-card)]"
                      InputProps={{
                        className: '!text-xs font-mono !h-9 border border-[var(--theme-border-accent)] !text-[var(--theme-text-primary)]'
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-5">
                    <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                      Authentication
                    </span>
                    <Switch
                      checked={proxyAuth}
                      onChange={(e) => setProxyAuth(e.target.checked)}
                      size="small"
                    />
                  </div>
                </div>

                {proxyAuth && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--theme-border-accent)]">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                        Username
                      </label>
                      <TextField
                        fullWidth
                        size="small"
                        value={proxyUsername}
                        onChange={(e) => setProxyUsername(e.target.value)}
                        className="!bg-[var(--theme-bg-card)]"
                        InputProps={{
                          className: '!text-xs !h-9 border border-[var(--theme-border-accent)] !text-[var(--theme-text-primary)]'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                        Password
                      </label>
                      <TextField
                        fullWidth
                        size="small"
                        type="password"
                        value={proxyPassword}
                        onChange={(e) => setProxyPassword(e.target.value)}
                        className="!bg-[var(--theme-bg-card)]"
                        InputProps={{
                          className: '!text-xs !h-9 border border-[var(--theme-border-accent)] !text-[var(--theme-text-primary)]'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: FINISH                                                             */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="space-y-6 max-w-2xl mx-auto py-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--theme-secondary-subtle)] border-2 border-[var(--theme-primary)] flex items-center justify-center text-[var(--theme-primary)] mx-auto">
              <Rocket className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-[var(--theme-text-primary)] tracking-tight">
                You're All Set!
              </h2>
              <p className="text-xs text-[var(--theme-text-muted)] max-w-md mx-auto">
                Voltrex Loader is fully configured and ready for blazing-fast downloads.
              </p>
            </div>

            {/* Summary Card */}
            <div className="p-4 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] text-left space-y-2.5 shadow-sm max-w-lg mx-auto">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-2 border-b border-[var(--theme-border-accent)] pb-1.5 flex items-center justify-between">
                <span>Configuration Overview</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1 normal-case">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--theme-text-muted)]">Theme & Palette:</span>
                <span className="font-semibold text-[var(--theme-text-primary)] capitalize">
                  {themeMode} ({THEME_PRESETS.find(p => p.id === themePreset)?.name || themePreset})
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--theme-text-muted)]">Download Folder:</span>
                <span className="font-mono text-[11px] text-[var(--theme-primary)] truncate max-w-[240px]" title={downloadPath}>
                  {downloadPath || 'Default Downloads'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--theme-text-muted)]">Browser Bridge:</span>
                <span className="text-emerald-500 font-semibold">Port 9580 (Active)</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--theme-text-muted)]">Network Mode:</span>
                <span className="font-semibold text-[var(--theme-text-primary)] capitalize">
                  {proxyMode === 'direct' ? 'Direct Connection' : proxyMode === 'system' ? 'System Proxy' : `Manual (${proxyProtocol.toUpperCase()})`}
                </span>
              </div>
            </div>

            {/* Launch on Startup Toggle */}
            <div className="p-3 rounded-xl border border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-4 max-w-lg mx-auto">
              <div className="text-left">
                <h4 className="text-xs font-bold text-[var(--theme-text-primary)]">
                  Launch on System Startup
                </h4>
                <p className="text-[11px] text-[var(--theme-text-muted)]">
                  Keep Voltrex Loader running in the tray ready for browser downloads.
                </p>
              </div>
              <Switch
                checked={startWithSystem}
                onChange={(e) => setStartWithSystem(e.target.checked)}
                size="small"
              />
            </div>
          </div>
        )}
      </DialogContent>

      {/* Footer Navigation Actions */}
      <DialogActions className="px-6 py-3.5 border-t border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between shrink-0">
        <div>
          {currentStep > 1 ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              startIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              className="border border-[var(--theme-border-accent)] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1.5 !px-3.5 rounded-lg"
            >
              Back
            </Button>
          ) : (
            <Button
              size="small"
              variant="text"
              onClick={handleSkipWizard}
              className="!text-xs text-slate-500 hover:text-[var(--theme-primary)] dark:text-[#b8a5a5]"
            >
              Skip Setup Wizard
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep < 6 ? (
            <Button
              size="small"
              variant="contained"
              onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
              endIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold rounded-lg shadow-sm"
            >
              {currentStep === 1 ? 'Get Started' : 'Next Step'}
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={handleCompleteWizard}
              endIcon={<Rocket className="w-3.5 h-3.5" />}
              className="btn-theme-primary !text-white !text-xs !py-2 !px-5 font-bold rounded-lg shadow-md"
            >
              Start Using Voltrex Loader
            </Button>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}
