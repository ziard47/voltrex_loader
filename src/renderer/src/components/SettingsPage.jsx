import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import {
  Settings,
  Folder,
  FolderOpen,
  Sliders,
  Gauge,
  Globe,
  Bell,
  Wifi,
  Info,
  Check,
  RotateCcw,
  ArrowLeft,
  Copy,
  ExternalLink,
  ShieldCheck,
  Volume2,
  Server,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Sparkles,
  Palette,
  Sun,
  Moon,
  Monitor,
  Rocket
} from 'lucide-react';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage({ onBack, defaultSavePath, onSaveSuccess, appVersion = '1.1.2', onOpenWhatsNew, onOpenSetupWizard }) {
  const [activeTab, setActiveTab] = useState('general');
  const [toast, setToast] = useState({ open: false, message: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Theme Context
  const {
    themeMode,
    setThemeMode,
    effectiveMode,
    themePreset,
    setThemePreset,
    resetTheme,
    THEME_PRESETS
  } = useTheme();

  // Settings State
  const [settings, setSettings] = useState({
    defaultDownloadPath: defaultSavePath || '',
    concurrency: 3,
    autoStartDownloads: true,
    organizeByCategory: false,
    speedLimitKBps: 0,
    autoCapturePrompt: true,
    bridgePort: 9580,
    notifyOnComplete: true,
    soundOnComplete: true,
    timeoutSeconds: 30,
    maxRetries: 3,
    closeAction: 'ask',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoltrexLoader/1.0',
    startWithSystem: false,
    proxyMode: 'direct',
    proxyProtocol: 'http',
    proxyHost: '',
    proxyPort: 8080,
    proxyAuth: false,
    proxyUsername: '',
    proxyPassword: '',
    proxyBypass: '<local>'
  });

  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState(null);
  const [zoomFactor, setZoomFactor] = useState(1.0);

  // Load settings and zoom factor on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        if (window.electronAPI?.getSettings) {
          const loaded = await window.electronAPI.getSettings();
          if (loaded) {
            setSettings(loaded);
          }
        }
        if (window.electronAPI?.getZoomFactor) {
          const factor = await window.electronAPI.getZoomFactor();
          if (factor) {
            setZoomFactor(Math.round(factor * 100) / 100);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    fetchSettings();
  }, []);

  const handleZoomChange = async (newZoom) => {
    const val = Number(newZoom);
    setZoomFactor(val);
    if (window.electronAPI?.setZoomFactor) {
      await window.electronAPI.setZoomFactor(val);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      if (window.electronAPI?.browseDirectory) {
        const picked = await window.electronAPI.browseDirectory(settings.defaultDownloadPath);
        if (picked) {
          setSettings((prev) => ({ ...prev, defaultDownloadPath: picked }));
        }
      }
    } catch (err) {
      console.error('Failed to browse directory:', err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      if (window.electronAPI?.openPath && settings.defaultDownloadPath) {
        await window.electronAPI.openPath(settings.defaultDownloadPath);
      }
    } catch (err) {
      console.error('Failed to open directory:', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const toSave = {
        ...settings,
        themeMode,
        themePreset
      };
      if (window.electronAPI?.saveSettings) {
        const saved = await window.electronAPI.saveSettings(toSave);
        if (saved) {
          setSettings(saved);
        }
      }
      if (onSaveSuccess) onSaveSuccess(toSave);
      setToast({ open: true, message: 'Settings saved successfully!' });
    } catch (err) {
      console.error('Failed to save settings:', err);
      setToast({ open: true, message: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      resetTheme();
      if (window.electronAPI?.resetSettings) {
        const defaults = await window.electronAPI.resetSettings();
        if (defaults) {
          setSettings(defaults);
          setToast({ open: true, message: 'Reset settings to defaults' });
          if (onSaveSuccess) onSaveSuccess(defaults);
        }
      }
    } catch (err) {
      console.error('Failed to reset settings:', err);
    }
  };

  const handleTestNotification = async () => {
    try {
      if (window.electronAPI?.showTestNotification) {
        await window.electronAPI.showTestNotification();
        setToast({ open: true, message: 'Test notification triggered' });
      }
    } catch (err) {
      console.error('Failed to send test notification:', err);
    }
  };

  const copyToClipboard = async (text, msg) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setToast({ open: true, message: msg });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleTestProxy = async () => {
    setIsTestingProxy(true);
    setProxyTestResult(null);
    try {
      if (window.electronAPI?.testProxy) {
        const res = await window.electronAPI.testProxy(settings);
        setProxyTestResult(res);
      } else {
        setProxyTestResult({ success: false, error: 'Proxy test API unavailable' });
      }
    } catch (err) {
      setProxyTestResult({ success: false, error: err?.message || 'Failed to test proxy' });
    } finally {
      setIsTestingProxy(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General & Downloads', icon: Sliders },
    { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
    { id: 'browser', label: 'Browser Integration', icon: Globe },
    { id: 'proxy', label: 'Proxy Settings', icon: Server },
    { id: 'notifications', label: 'Notifications & Sound', icon: Bell },
    { id: 'network', label: 'Network & Advanced', icon: Wifi },
    { id: 'about', label: 'About Voltrex', icon: Info }
  ];

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#140e0e] select-none text-[#EEEEEE]">
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-[#8E1616]/30 flex items-center justify-between bg-[#1D1616] shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
            className="!border-[#8E1616]/40 !text-[#b8a5a5] hover:!text-white hover:!bg-[#8E1616]/20 !text-xs !py-1 !px-3"
          >
            Back to Downloads
          </Button>
          <div className="h-4 w-[1px] bg-[#8E1616]/30" />
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--theme-primary)]" />
            <h1 className="text-sm font-bold text-slate-800 dark:text-[#EEEEEE] tracking-wide">Preferences & Settings</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="text"
            startIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleReset}
            className="!text-[#b8a5a5] hover:!text-rose-400 !text-xs !py-1 !px-3"
          >
            Reset Defaults
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Check className="w-4 h-4 !text-white" />}
            onClick={handleSave}
            disabled={isSaving}
            className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 !font-semibold rounded-lg"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Main Settings Content Area */}
      <div className="flex-1 w-full flex overflow-hidden min-h-0">
        {/* Settings Navigation Sidebar */}
        <aside className="w-56 lg:w-64 border-r border-[#8E1616]/30 p-3 flex flex-col gap-1 bg-[#1A1212] shrink-0 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#b8a5a5] px-3 py-1.5">
            Settings Menu
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCur = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border ${
                  isCur
                    ? 'border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] dark:text-[#EEEEEE] font-bold shadow-sm'
                    : 'border-transparent text-slate-700 dark:text-[#b8a5a5] hover:text-slate-900 dark:hover:text-[#EEEEEE] hover:bg-slate-200/60 dark:hover:bg-[#271a1a]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCur ? 'text-[var(--theme-primary)]' : 'text-slate-500 dark:text-[#b8a5a5]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Tab Content Panel */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#160f0f]">
          <div className="max-w-3xl space-y-6">
            {/* GENERAL & DOWNLOADS */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#EEEEEE]">General & Download Preferences</h2>
                  <p className="text-xs text-[#b8a5a5] mt-0.5">
                    Manage default save paths, bandwidth limits, and automation settings.
                  </p>
                </div>

                {/* Default Download Folder */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#EEEEEE]">Default Download Folder</div>
                      <div className="text-[11px] text-[#b8a5a5]">
                        Files will be automatically saved to this directory on your system.
                      </div>
                    </div>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FolderOpen className="w-3.5 h-3.5" />}
                      onClick={handleOpenFolder}
                      className="!border-[#8E1616]/40 !text-[#b8a5a5] hover:!text-white hover:!bg-[#8E1616]/20 !text-xs !py-1 !px-2.5"
                    >
                      Open Folder
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <TextField
                      size="small"
                      fullWidth
                      value={settings.defaultDownloadPath}
                      onChange={(e) => setSettings({ ...settings, defaultDownloadPath: e.target.value })}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <Folder className="w-4 h-4 text-[var(--theme-primary)] mr-2 shrink-0" />,
                        className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] font-mono-stat border border-[#8E1616]/30 rounded-lg'
                      }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleBrowseFolder}
                      className="!bg-[#8E1616] hover:!bg-[#D84040] !text-white !text-xs !px-4 !py-2 shrink-0 font-medium"
                    >
                      Browse...
                    </Button>
                  </div>
                </div>

                {/* Max Download Count */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#EEEEEE]">Max Download Count</div>
                    <div className="text-[11px] text-[#b8a5a5]">
                      Maximum number of simultaneous active downloads. Additional files will wait in queue.
                    </div>
                  </div>
                  <Select
                    size="small"
                    value={settings.concurrency || 3}
                    onChange={(e) => setSettings({ ...settings, concurrency: Number(e.target.value) })}
                    className="!text-xs !bg-[#140e0e] !text-[#EEEEEE] border border-[#8E1616]/30 !w-36"
                    sx={{ height: 32 }}
                  >
                    <MenuItem value={1}>1 Download</MenuItem>
                    <MenuItem value={2}>2 Downloads</MenuItem>
                    <MenuItem value={3}>3 Downloads</MenuItem>
                    <MenuItem value={5}>5 Downloads</MenuItem>
                    <MenuItem value={8}>8 Downloads</MenuItem>
                    <MenuItem value={10}>10 Downloads</MenuItem>
                  </Select>
                </div>

                {/* Display Scale & Zoom Factor */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#EEEEEE]">Display Scale & UI Zoom</div>
                    <div className="text-[11px] text-[#b8a5a5]">
                      Adjust interface scaling for smaller laptop screens (e.g. 1360x768) or high-DPI displays. (Keyboard: Ctrl + / - / 0)
                    </div>
                  </div>
                  <Select
                    size="small"
                    value={zoomFactor}
                    onChange={(e) => handleZoomChange(e.target.value)}
                    className="!text-xs !bg-[#140e0e] !text-[#EEEEEE] border border-[#8E1616]/30 !w-36"
                    sx={{ height: 32 }}
                  >
                    <MenuItem value={0.75}>75% (Compact)</MenuItem>
                    <MenuItem value={0.85}>85% (Small Screen)</MenuItem>
                    <MenuItem value={0.9}>90% (Laptop 768p)</MenuItem>
                    <MenuItem value={1.0}>100% (Default)</MenuItem>
                    <MenuItem value={1.1}>110%</MenuItem>
                    <MenuItem value={1.25}>125% (Large)</MenuItem>
                  </Select>
                </div>

                {/* Speed Limiter */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#EEEEEE]">Bandwidth Speed Limiter</div>
                    <div className="text-[11px] text-[#b8a5a5]">
                      Cap the cumulative download speed to preserve connection bandwidth for other tasks.
                    </div>
                  </div>
                  <Select
                    size="small"
                    value={settings.speedLimitKBps}
                    onChange={(e) => setSettings({ ...settings, speedLimitKBps: Number(e.target.value) })}
                    className="!text-xs !bg-[#140e0e] !text-[#EEEEEE] border border-[#8E1616]/30 !w-36"
                    sx={{ height: 32 }}
                  >
                    <MenuItem value={0}>Unlimited</MenuItem>
                    <MenuItem value={500}>500 KB/s</MenuItem>
                    <MenuItem value={1024}>1 MB/s</MenuItem>
                    <MenuItem value={2048}>2 MB/s</MenuItem>
                    <MenuItem value={5120}>5 MB/s</MenuItem>
                    <MenuItem value={10240}>10 MB/s</MenuItem>
                    <MenuItem value={25600}>25 MB/s</MenuItem>
                  </Select>
                </div>

                {/* When Closing Application */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#EEEEEE]">When Closing Application</div>
                    <div className="text-[11px] text-[#b8a5a5]">
                      Choose what happens when clicking the window close button (✕).
                    </div>
                  </div>
                  <Select
                    size="small"
                    value={settings.closeAction || 'ask'}
                    onChange={(e) => setSettings({ ...settings, closeAction: e.target.value })}
                    className="!text-xs !bg-[#140e0e] !text-[#EEEEEE] border border-[#8E1616]/30 !w-48"
                    sx={{ height: 32 }}
                  >
                    <MenuItem value="ask">Ask every time</MenuItem>
                    <MenuItem value="tray">Close to System Tray</MenuItem>
                    <MenuItem value="quit">Close Voltrex Loader</MenuItem>
                  </Select>
                </div>

                {/* Automation Toggles */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#EEEEEE]">Auto-Start Added Downloads</div>
                      <div className="text-[11px] text-[#b8a5a5]">
                        Immediately begin transferring files when added rather than queuing them as paused.
                      </div>
                    </div>
                    <Switch
                      checked={settings.autoStartDownloads}
                      onChange={(e) => setSettings({ ...settings, autoStartDownloads: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                      }}
                    />
                  </div>

                  <div className="border-t border-[#8E1616]/20" />

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#EEEEEE]">Organize Downloads by Category</div>
                      <div className="text-[11px] text-[#b8a5a5]">
                        Automatically sort files into subdirectories (Videos, Music, Documents, Compressed, Programs).
                      </div>
                    </div>
                    <Switch
                      checked={settings.organizeByCategory}
                      onChange={(e) => setSettings({ ...settings, organizeByCategory: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                      }}
                    />
                  </div>

                  <div className="border-t border-[#8E1616]/20" />

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#EEEEEE]">Start with System</div>
                      <div className="text-[11px] text-[#b8a5a5]">
                        Launch Voltrex Loader automatically in the background when your computer boots up.
                      </div>
                    </div>
                    <Switch
                      checked={Boolean(settings.startWithSystem)}
                      onChange={(e) => setSettings({ ...settings, startWithSystem: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* APPEARANCE & THEMES */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-[#EEEEEE] flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[var(--theme-primary)]" />
                    Appearance & Themes
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#b8a5a5] mt-0.5">
                    Customize color modes and select from curated color palettes.
                  </p>
                </div>

                {/* Section 1: Color Scheme Mode */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-[#EEEEEE]">Theme Mode</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#b8a5a5]">
                        Choose your interface brightness mode. System default adapts dynamically to your OS theme.
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-[#140e0e] text-[var(--theme-primary)] border border-slate-200 dark:border-[#8E1616]/40 px-2 py-0.5 rounded-full font-bold">
                      Active: {effectiveMode === 'dark' ? 'Dark' : 'Light'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* System Default */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('system')}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        themeMode === 'system'
                          ? '!border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] shadow-md'
                          : 'border-slate-200 dark:border-[#8E1616]/30 bg-white dark:bg-[#140e0e] hover:border-[var(--theme-border-accent)] hover:bg-slate-50 dark:hover:bg-[#1D1616]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Monitor className={`w-5 h-5 ${themeMode === 'system' ? 'text-[var(--theme-primary)]' : 'text-slate-400 dark:text-[#b8a5a5]'}`} />
                        {themeMode === 'system' && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${themeMode === 'system' ? 'text-[var(--theme-primary)] dark:text-white' : 'text-slate-800 dark:text-[#EEEEEE]'}`}>
                          System Default
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#b8a5a5] mt-0.5 leading-tight">
                          Sync with operating system appearance
                        </div>
                      </div>
                    </button>

                    {/* Dark Mode */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        themeMode === 'dark'
                          ? '!border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] shadow-md'
                          : 'border-slate-200 dark:border-[#8E1616]/30 bg-white dark:bg-[#140e0e] hover:border-[var(--theme-border-accent)] hover:bg-slate-50 dark:hover:bg-[#1D1616]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Moon className={`w-5 h-5 ${themeMode === 'dark' ? 'text-[var(--theme-primary)]' : 'text-slate-400 dark:text-[#b8a5a5]'}`} />
                        {themeMode === 'dark' && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${themeMode === 'dark' ? 'text-[var(--theme-primary)] dark:text-white' : 'text-slate-800 dark:text-[#EEEEEE]'}`}>
                          Dark Mode
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#b8a5a5] mt-0.5 leading-tight">
                          High contrast deep dark aesthetic
                        </div>
                      </div>
                    </button>

                    {/* Light Mode */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('light')}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        themeMode === 'light'
                          ? '!border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] shadow-md'
                          : 'border-slate-200 dark:border-[#8E1616]/30 bg-white dark:bg-[#140e0e] hover:border-[var(--theme-border-accent)] hover:bg-slate-50 dark:hover:bg-[#1D1616]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <Sun className={`w-5 h-5 ${themeMode === 'light' ? 'text-[var(--theme-primary)]' : 'text-slate-400 dark:text-[#b8a5a5]'}`} />
                        {themeMode === 'light' && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                        )}
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${themeMode === 'light' ? 'text-[var(--theme-primary)] dark:text-white' : 'text-slate-800 dark:text-[#EEEEEE]'}`}>
                          Light Mode
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#b8a5a5] mt-0.5 leading-tight">
                          Clean, crisp daytime interface
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 2: Curated Theme Palettes */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-[#EEEEEE]">Curated Color Palettes</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#b8a5a5]">
                        Select from 8 color palettes tailored for maximum visual aesthetic.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {THEME_PRESETS.map((preset) => {
                      const isSelected = themePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setThemePreset(preset.id)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? '!border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] shadow-md ring-1 ring-[var(--theme-primary)]'
                              : 'border-slate-200 dark:border-[#8E1616]/30 bg-white dark:bg-[#140e0e] hover:border-[var(--theme-border-accent)] hover:bg-slate-50 dark:hover:bg-[#1A1212]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                                style={{ backgroundColor: preset.primary }}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/20 shadow-sm -ml-2 shrink-0 opacity-80"
                                style={{ backgroundColor: preset.secondary }}
                              />
                            </div>
                            {isSelected && (
                              <span
                                className="flex items-center justify-center w-4 h-4 rounded-full text-white shadow-sm"
                                style={{ backgroundColor: 'var(--theme-primary)' }}
                              >
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${isSelected ? 'text-[var(--theme-primary)] dark:text-white' : 'text-slate-800 dark:text-[#EEEEEE]'}`}>
                              {preset.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#b8a5a5] mt-0.5 line-clamp-1">
                              {preset.description}
                            </div>
                          </div>
                          <div
                            className="h-1 w-full rounded-full mt-2.5 opacity-70"
                            style={{
                              background: `linear-gradient(90deg, ${preset.secondary}, ${preset.primary})`
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* BROWSER INTEGRATION */}
            {activeTab === 'browser' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#EEEEEE]">Browser Extension & Capture</h2>
                  <p className="text-xs text-[#b8a5a5] mt-0.5">
                    Connect Chrome, Brave, Edge, or Vivaldi to automatically capture links into Voltrex Loader.
                  </p>
                </div>

                {/* Bridge Server Status Card */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center">
                      <Globe className="w-5 h-5 text-[var(--theme-primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-[#EEEEEE]">Local Extension Bridge Server</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" /> Active
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#b8a5a5] font-mono-stat mt-0.5">
                        Listening on http://127.0.0.1:{settings.bridgePort || 9580}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Auto Capture Behavior */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#EEEEEE]">Prompt "Add URL" Dialog on Browser Capture</div>
                    <div className="text-[11px] text-[#b8a5a5] max-w-md">
                      When enabled, capturing a link prompts the download dialog so you can choose a folder or inspect file size. When disabled, downloads start instantly in the background.
                    </div>
                  </div>
                  <Switch
                    checked={settings.autoCapturePrompt}
                    onChange={(e) => setSettings({ ...settings, autoCapturePrompt: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                    }}
                  />
                </div>

                {/* Browser Installation Guide */}
                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-3">
                  <div className="text-xs font-semibold text-[#EEEEEE]">Installing the Chrome Extension</div>
                  <div className="text-[11px] text-[#b8a5a5] space-y-2.5">
                    <div>
                      <p>1. Download the official Voltrex Loader browser extension package:</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          readOnly
                          value="https://github.com/ziard47/voltrex_loader/releases/download/v1.1.0/voltrex-loader-browser-extension.zip"
                          className="flex-1 px-3 py-1.5 rounded bg-[#140e0e] border border-[#8E1616]/30 text-xs text-[#b8a5a5] font-mono-stat truncate"
                        />
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => {
                            if (window.electronAPI?.openExternal) {
                              window.electronAPI.openExternal(
                                'https://github.com/ziard47/voltrex_loader/releases/download/v1.1.0/voltrex-loader-browser-extension.zip'
                              );
                            }
                          }}
                          className="btn-theme-primary !text-white !text-xs !py-1 !px-3 shrink-0 !font-semibold rounded-lg"
                        >
                          Download (.zip)
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Copy className="w-3.5 h-3.5" />}
                          onClick={() =>
                            copyToClipboard(
                              'https://github.com/ziard47/voltrex_loader/releases/download/v1.1.0/voltrex-loader-browser-extension.zip',
                              'Download link copied to clipboard!'
                            )
                          }
                          className="!border-[#8E1616]/40 !text-[#b8a5a5] hover:!text-white hover:!bg-[#8E1616]/20 !text-xs !py-1 !px-2.5 shrink-0"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <p>2. Extract / unzip the downloaded <code className="text-[#EEEEEE]">voltrex-loader-browser-extension.zip</code> file onto your computer.</p>

                    <div>
                      <p>3. Open your Chromium browser (Chrome, Brave, Edge, Vivaldi) and navigate to:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="px-2.5 py-1 rounded bg-[#140e0e] border border-[#8E1616]/30 text-xs font-mono-stat text-[#D84040]">
                          chrome://extensions
                        </code>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => copyToClipboard('chrome://extensions', 'URL copied to clipboard!')}
                          className="!border-[#8E1616]/40 !text-[#b8a5a5] hover:!text-white hover:!bg-[#8E1616]/20 !text-xs !py-0.5 !px-2"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <p>4. Turn on the <strong>Developer mode</strong> toggle switch in the top-right corner.</p>

                    <p>5. Click <strong>Load unpacked</strong> in the top-left and select the extracted extension folder.</p>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS & SOUND */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#EEEEEE]">Notifications & Audio Alerts</h2>
                  <p className="text-xs text-[#b8a5a5] mt-0.5">
                    Customize alerts and system notifications when files finish downloading.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#EEEEEE]">Desktop Notification on Completion</div>
                      <div className="text-[11px] text-[#b8a5a5]">
                        Display native operating system banner (Linux desktop / Windows notification / SteamOS).
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifyOnComplete}
                      onChange={(e) => setSettings({ ...settings, notifyOnComplete: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                      }}
                    />
                  </div>

                  <div className="border-t border-[#8E1616]/20" />

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#EEEEEE]">Audio Alert on Completion</div>
                      <div className="text-[11px] text-[#b8a5a5]">
                        Play an audible chime when a download task finishes successfully.
                      </div>
                    </div>
                    <Switch
                      checked={settings.soundOnComplete}
                      onChange={(e) => setSettings({ ...settings, soundOnComplete: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                      }}
                    />
                  </div>

                  <div className="border-t border-[#8E1616]/20 pt-2">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Bell className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                      onClick={handleTestNotification}
                      className="!border-[#8E1616]/40 !text-[#EEEEEE] hover:!bg-[#8E1616]/20 !text-xs !py-1 !px-3"
                    >
                      Send Test Notification
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* NETWORK & ADVANCED */}
            {activeTab === 'network' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#EEEEEE]">Network & Engine Preferences</h2>
                  <p className="text-xs text-[#b8a5a5] mt-0.5">
                    Fine-tune connection timeouts, HTTP retry limits, and client identification.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-4">
                  {/* User-Agent String */}
                  <div>
                    <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                      HTTP User-Agent Header
                    </label>
                    <TextField
                      size="small"
                      fullWidth
                      value={settings.userAgent}
                      onChange={(e) => setSettings({ ...settings, userAgent: e.target.value })}
                      InputProps={{
                        className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] font-mono-stat border border-[#8E1616]/30 rounded-lg'
                      }}
                    />
                    <span className="text-[10px] text-[#b8a5a5] mt-1 block">
                      Custom User-Agent sent with probe and download requests to prevent server blocks.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Connection Timeout */}
                    <div>
                      <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                        Connection Timeout (seconds)
                      </label>
                      <TextField
                        size="small"
                        type="number"
                        fullWidth
                        value={settings.timeoutSeconds}
                        onChange={(e) => setSettings({ ...settings, timeoutSeconds: Number(e.target.value) })}
                        InputProps={{
                          className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                        }}
                      />
                    </div>

                    {/* Max Retries */}
                    <div>
                      <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                        Max Network Retries
                      </label>
                      <TextField
                        size="small"
                        type="number"
                        fullWidth
                        value={settings.maxRetries}
                        onChange={(e) => setSettings({ ...settings, maxRetries: Number(e.target.value) })}
                        InputProps={{
                          className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                        }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#8E1616]/20 pt-2">
                    <div className="flex items-center justify-between text-xs text-[#b8a5a5]">
                      <span>Partial Download File Extension:</span>
                      <span className="font-mono-stat font-semibold text-[#D84040]">.part</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROXY SETTINGS */}
            {activeTab === 'proxy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#EEEEEE]">Proxy Configuration</h2>
                  <p className="text-xs text-[#b8a5a5] mt-0.5">
                    Configure network proxy routing for all internal requests and active downloads.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 space-y-4">
                  {/* Mode Select */}
                  <div>
                    <label className="text-xs font-semibold text-slate-800 dark:text-[#EEEEEE] block mb-2">
                      Proxy Mode
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        {
                          id: 'direct',
                          title: 'Direct Connection',
                          desc: 'No proxy. Connect directly to the internet.'
                        },
                        {
                          id: 'system',
                          title: 'System Proxy',
                          desc: 'Automatically detect and use OS proxy configuration.'
                        },
                        {
                          id: 'manual',
                          title: 'Manual Proxy',
                          desc: 'Route network requests through a custom proxy server.'
                        }
                      ].map((mode) => {
                        const isSelected = (settings.proxyMode || 'direct') === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setSettings({ ...settings, proxyMode: mode.id });
                              setProxyTestResult(null);
                            }}
                            className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                              isSelected
                                ? '!border-[var(--theme-primary)] bg-[var(--theme-secondary-subtle)] shadow-sm ring-1 ring-[var(--theme-primary)]'
                                : 'border-slate-200 dark:border-[#8E1616]/20 bg-white dark:bg-[#140e0e]/60 hover:border-[var(--theme-border-accent)]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-bold ${
                                isSelected
                                  ? 'text-[var(--theme-primary)] dark:text-white'
                                  : 'text-slate-800 dark:text-[#EEEEEE]'
                              }`}>
                                {mode.title}
                              </span>
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? '!border-[var(--theme-primary)] !bg-[var(--theme-primary)]'
                                    : 'border-slate-400 dark:border-[#8E1616]/40'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <p className={`text-[11px] leading-relaxed ${
                              isSelected
                                ? 'text-slate-700 dark:text-[#d1c2c2] font-medium'
                                : 'text-slate-600 dark:text-[#b8a5a5]'
                            }`}>
                              {mode.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual Proxy Inputs */}
                  {settings.proxyMode === 'manual' && (
                    <div className="pt-2 border-t border-[#8E1616]/20 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Protocol */}
                        <div>
                          <label className="text-xs font-semibold text-slate-800 dark:text-[#EEEEEE] block mb-1">
                            Protocol
                          </label>
                          <Select
                            size="small"
                            fullWidth
                            value={settings.proxyProtocol || 'http'}
                            onChange={(e) => setSettings({ ...settings, proxyProtocol: e.target.value })}
                            className="!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg"
                            sx={{
                              color: 'inherit',
                              '.MuiSvgIcon-root': { color: 'var(--theme-primary)' },
                              '.MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' }
                            }}
                          >
                            <MenuItem value="http" className="!text-xs">HTTP</MenuItem>
                            <MenuItem value="https" className="!text-xs">HTTPS</MenuItem>
                            <MenuItem value="socks5" className="!text-xs">SOCKS5</MenuItem>
                          </Select>
                        </div>

                        {/* Server Host */}
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                            Proxy Host / IP
                          </label>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="127.0.0.1 or proxy.example.com"
                            value={settings.proxyHost || ''}
                            onChange={(e) => setSettings({ ...settings, proxyHost: e.target.value })}
                            InputProps={{
                              className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                            }}
                          />
                        </div>

                        {/* Port */}
                        <div>
                          <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                            Port
                          </label>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            placeholder="8080"
                            value={settings.proxyPort ?? 8080}
                            onChange={(e) => setSettings({ ...settings, proxyPort: Number(e.target.value) })}
                            InputProps={{
                              className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                            }}
                          />
                        </div>
                      </div>

                      {/* Bypass Rules */}
                      <div>
                        <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                          Bypass Proxy For (comma separated)
                        </label>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="<local>, 127.0.0.1, localhost"
                          value={settings.proxyBypass ?? '<local>'}
                          onChange={(e) => setSettings({ ...settings, proxyBypass: e.target.value })}
                          InputProps={{
                            className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                          }}
                        />
                        <span className="text-[10px] text-[#b8a5a5] mt-1 block">
                          Addresses or hosts that bypass proxy routing (e.g. <span className="font-mono text-[#D84040]">&lt;local&gt;</span>, localhost).
                        </span>
                      </div>

                      {/* Authentication Toggle & Inputs */}
                      <div className="pt-2 border-t border-[#8E1616]/20">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-[#D84040]" />
                            <div>
                              <span className="text-xs font-semibold text-[#EEEEEE] block">
                                Proxy Authentication
                              </span>
                              <span className="text-[11px] text-[#b8a5a5]">
                                Enable if your proxy server requires credentials.
                              </span>
                            </div>
                          </div>
                          <Switch
                            size="small"
                            checked={!!settings.proxyAuth}
                            onChange={(e) => setSettings({ ...settings, proxyAuth: e.target.checked })}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--theme-primary)' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--theme-primary)', opacity: 0.6 }
                            }}
                          />
                        </div>

                        {settings.proxyAuth && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 pt-1">
                            <div>
                              <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                                Username
                              </label>
                              <TextField
                                size="small"
                                fullWidth
                                value={settings.proxyUsername || ''}
                                onChange={(e) => setSettings({ ...settings, proxyUsername: e.target.value })}
                                InputProps={{
                                  className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-[#EEEEEE] block mb-1">
                                Password
                              </label>
                              <TextField
                                size="small"
                                type="password"
                                fullWidth
                                value={settings.proxyPassword || ''}
                                onChange={(e) => setSettings({ ...settings, proxyPassword: e.target.value })}
                                InputProps={{
                                  className: '!bg-[#140e0e] !text-xs !text-[#EEEEEE] border border-[#8E1616]/30 rounded-lg'
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test Connection and Action Row */}
                  <div className="pt-3 border-t border-[#8E1616]/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleTestProxy}
                        disabled={isTestingProxy}
                        className="!border-[#8E1616]/50 !text-[#EEEEEE] hover:!bg-[#8E1616]/30 !text-xs !py-1.5 !px-3"
                      >
                        {isTestingProxy ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D84040]" />
                            Testing Connection...
                          </span>
                        ) : (
                          'Test Proxy Connection'
                        )}
                      </Button>

                      {proxyTestResult && (
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ${
                            proxyTestResult.success
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-600/30'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-600/30'
                          }`}
                        >
                          {proxyTestResult.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{proxyTestResult.message || proxyTestResult.error}</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-[#b8a5a5]">
                      Click &apos;Save Settings&apos; above to apply proxy changes.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-[#EEEEEE]">About Voltrex Loader</h2>
                  <p className="text-xs text-[#b8a5a5] mt-0.5">
                    High-performance, modern cross-platform download accelerator.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#1D1616] border border-[#8E1616]/30 text-center space-y-4">
                  <div className="flex justify-center">
                    <Logo size={64} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#EEEEEE]">
                      VOLTREX <span className="text-[var(--theme-primary)]">LOADER</span>
                    </h3>
                    <p className="text-xs text-[#b8a5a5] mt-1">Version {appVersion} (Production Release)</p>
                    <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                      {onOpenWhatsNew && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={onOpenWhatsNew}
                          startIcon={<Sparkles className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                          className="border border-[var(--theme-border-accent)] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] text-[#EEEEEE] !text-xs !py-1 !px-3 rounded-lg"
                        >
                          What's New in v{appVersion}
                        </Button>
                      )}
                      {onOpenSetupWizard && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={onOpenSetupWizard}
                          startIcon={<Rocket className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                          className="border border-[var(--theme-border-accent)] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] text-[#EEEEEE] !text-xs !py-1 !px-3 rounded-lg"
                        >
                          Run Setup Wizard
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#b8a5a5] max-w-md mx-auto leading-relaxed">
                    Engineered with HTTP Range byte streaming, automatic resume recovery, multi-task priority scheduling, and full Chromium browser integration.
                  </p>

                  <div className="pt-2 border-t border-[#8E1616]/20 flex items-center justify-center gap-2 text-[11px] text-[#b8a5a5]">
                    <span>Crafted by <strong className="text-[#EEEEEE]">Mohomed Ziard</strong></span>
                    <span className="text-[var(--theme-primary)]">•</span>
                    <span className="text-[var(--theme-primary)] font-semibold">Voltrex Digital</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <div
          style={{
            backgroundColor: 'var(--theme-bg-surface)',
            color: 'var(--theme-text-primary)',
            border: '1px solid var(--theme-border-accent)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold backdrop-blur-md"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[#EEEEEE]">{toast.message}</span>
        </div>
      </Snackbar>
    </div>
  );
}
