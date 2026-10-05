import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import {
  DownloadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  RotateCw,
  FolderOpen,
  ArrowUpCircle,
  HardDrive,
  Calendar,
  Check,
  Zap
} from 'lucide-react';
import Logo from './Logo';
import { formatBytes, formatSpeed } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function UpdateModal({
  open,
  onClose,
  currentVersion = '1.3.0',
  autoCheckOnOpen = false,
  preloadedUpdateInfo = null
}) {
  const { isDark } = useTheme();
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(preloadedUpdateInfo);
  const [checkError, setCheckError] = useState(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: 0
  });
  const [downloadResult, setDownloadResult] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Sync preloaded update info
  useEffect(() => {
    if (preloadedUpdateInfo) {
      setUpdateInfo(preloadedUpdateInfo);
    }
  }, [preloadedUpdateInfo]);

  // Check for updates on modal open if needed
  useEffect(() => {
    if (open) {
      if (autoCheckOnOpen || (!updateInfo && !preloadedUpdateInfo)) {
        handleCheckForUpdates();
      }
    } else {
      // Reset transient errors on close
      setDownloadError(null);
    }
  }, [open]);

  // Listen to IPC download progress
  useEffect(() => {
    if (!window.electronAPI?.onUpdateProgress) return;

    const cleanup = window.electronAPI.onUpdateProgress((progress) => {
      setDownloadProgress({
        percent: progress.percent || 0,
        downloadedBytes: progress.downloadedBytes || 0,
        totalBytes: progress.totalBytes || 0,
        speed: progress.speed || 0
      });
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setIsChecking(true);
    setCheckError(null);
    setDownloadResult(null);
    setDownloadError(null);

    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res && res.success) {
        setUpdateInfo(res);
      } else {
        setCheckError(res?.error || 'Unable to fetch latest release from GitHub.');
      }
    } catch (err) {
      setCheckError(err.message || 'Network error while checking for updates.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartDownload = async () => {
    if (!updateInfo?.asset || !window.electronAPI?.downloadUpdate) return;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadProgress({
      percent: 0,
      downloadedBytes: 0,
      totalBytes: updateInfo.asset.size || 0,
      speed: 0
    });

    try {
      const result = await window.electronAPI.downloadUpdate(updateInfo.asset);
      if (result && result.success) {
        setDownloadResult(result);
      } else {
        setDownloadError(result?.error || 'Download failed');
      }
    } catch (err) {
      setDownloadError(err.message || 'Failed to download update');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelDownload = async () => {
    try {
      if (window.electronAPI?.cancelUpdateDownload) {
        await window.electronAPI.cancelUpdateDownload();
      }
    } catch (err) {
      console.error('Cancel download error:', err);
    }
    setIsDownloading(false);
  };

  const handleInstallNow = async () => {
    if (!downloadResult?.filePath || !window.electronAPI?.installUpdate) return;
    setIsInstalling(true);
    try {
      await window.electronAPI.installUpdate(downloadResult.filePath);
    } catch (err) {
      setDownloadError('Install error: ' + err.message);
      setIsInstalling(false);
    }
  };

  const handleOpenReleasePage = () => {
    const url = updateInfo?.releaseUrl || 'https://github.com/ziard47/voltrex_loader/releases';
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleShowFileInFolder = () => {
    if (downloadResult?.filePath && window.electronAPI?.openPath) {
      window.electronAPI.openPath(downloadResult.filePath);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  // Helper to render markdown-like release notes cleanly
  const renderReleaseNotes = (notes) => {
    if (!notes || !notes.trim()) {
      return (
        <div className="text-xs italic text-[var(--theme-text-muted)] py-2">
          No release notes provided for this version.
        </div>
      );
    }

    const lines = notes.split('\n');
    return (
      <div className="space-y-1.5 text-xs text-[var(--theme-text-primary)]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1.5" />;
          }

          if (trimmed.startsWith('# ')) {
            return (
              <h4 key={idx} className="text-sm font-bold text-[var(--theme-text-primary)] pt-1 pb-0.5 border-b border-[var(--theme-border-accent)]">
                {trimmed.replace(/^#\s+/, '')}
              </h4>
            );
          }

          if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
            return (
              <h5 key={idx} className="text-xs font-bold text-[var(--theme-primary)] pt-1">
                {trimmed.replace(/^#{2,3}\s+/, '')}
              </h5>
            );
          }

          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const content = trimmed.replace(/^[*\-]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-[var(--theme-primary)] font-bold text-xs leading-tight">•</span>
                <span className="text-[var(--theme-text-primary)] leading-relaxed">
                  {content}
                </span>
              </div>
            );
          }

          return (
            <p key={idx} className="text-[var(--theme-text-muted)] leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={isDownloading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className:
          '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col !text-[var(--theme-text-primary)]'
      }}
    >
      {/* Header */}
      <DialogTitle className="!px-5 !py-4 flex items-center justify-between border-b border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Logo size={32} />
            {updateInfo?.updateAvailable && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--theme-text-primary)] leading-tight">
                Software Updates
              </h3>
              <Chip
                label={`v${currentVersion}`}
                size="small"
                className="!bg-[var(--theme-secondary-subtle)] !text-[var(--theme-primary)] !border !border-[var(--theme-border-accent)] font-bold !text-[11px] !h-5"
              />
            </div>
            <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
              Official GitHub releases for Voltrex Loader
            </p>
          </div>
        </div>

        <Tooltip title="Close" arrow>
          <span>
            <IconButton
              size="small"
              onClick={onClose}
              disabled={isDownloading}
              className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !p-1.5"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>

      {/* Body Content */}
      <DialogContent className="!px-5 !py-4 space-y-4 bg-[var(--theme-bg-card)] overflow-y-auto flex-1 min-h-0">
        {/* Loading / Checking State */}
        {isChecking && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <CircularProgress size={36} sx={{ color: 'var(--theme-primary)' }} />
            <div>
              <p className="text-sm font-semibold text-[var(--theme-text-primary)]">
                Checking for updates on GitHub...
              </p>
              <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
                Connecting to repository releases
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isChecking && checkError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Could not check for updates</span>
            </div>
            <p className="text-xs text-[var(--theme-text-muted)] pl-6">
              {checkError}
            </p>
          </div>
        )}

        {/* Up to Date State */}
        {!isChecking && updateInfo && !updateInfo.updateAvailable && !checkError && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[var(--theme-text-primary)]">
                You&apos;re up to date!
              </h4>
              <p className="text-xs text-[var(--theme-text-muted)] mt-1 max-w-xs mx-auto">
                Voltrex Loader v{currentVersion} is currently the latest release available.
              </p>
            </div>
            {updateInfo.publishedAt && (
              <span className="text-[11px] text-[var(--theme-text-muted)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Latest release published on {formatDate(updateInfo.publishedAt)}
              </span>
            )}
          </div>
        )}

        {/* Update Available State */}
        {!isChecking && updateInfo && updateInfo.updateAvailable && (
          <div className="space-y-4">
            {/* Banner card */}
            <div className="p-4 rounded-xl bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 flex items-center justify-center shrink-0">
                  <ArrowUpCircle className="w-6 h-6 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--theme-text-primary)]">
                      {updateInfo.releaseName || `Version ${updateInfo.latestVersion}`}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                      New Version
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--theme-text-muted)] flex-wrap">
                    <span>Current: <strong className="text-[var(--theme-text-primary)]">v{currentVersion}</strong></span>
                    <span>•</span>
                    <span>New: <strong className="text-[var(--theme-primary)]">v{updateInfo.latestVersion}</strong></span>
                    {updateInfo.publishedAt && (
                      <>
                        <span>•</span>
                        <span>{formatDate(updateInfo.publishedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Asset Detected */}
            {updateInfo.asset ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-accent)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <HardDrive className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-[var(--theme-text-primary)] truncate">
                      {updateInfo.asset.name}
                    </div>
                    <div className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-wider mt-0.5">
                      OS Package: {updateInfo.platform === 'linux' ? 'Linux' : updateInfo.platform === 'win32' ? 'Windows' : 'macOS'} ({updateInfo.asset.type})
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs font-semibold text-[var(--theme-text-muted)] shrink-0 ml-3">
                  {formatBytes(updateInfo.asset.size)}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <span>Direct package not found for your OS. You can download manually from GitHub releases.</span>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleOpenReleasePage}
                  endIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  className="!text-xs shrink-0 ml-2"
                >
                  View Release
                </Button>
              </div>
            )}

            {/* Download Progress Card */}
            {isDownloading && (
              <div className="p-4 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-primary)]/40 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[var(--theme-text-primary)]">
                    <DownloadCloud className="w-4 h-4 text-[var(--theme-primary)] animate-bounce" />
                    <span>Downloading update package...</span>
                  </div>
                  <span className="font-mono font-bold text-[var(--theme-primary)]">
                    {downloadProgress.percent}%
                  </span>
                </div>

                <LinearProgress
                  variant="determinate"
                  value={downloadProgress.percent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(216, 64, 64, 0.15)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 'var(--theme-primary)',
                      borderRadius: 4
                    }
                  }}
                />

                <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] font-mono">
                  <span>
                    {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
                  </span>
                  <span>{formatSpeed(downloadProgress.speed)}</span>
                </div>
              </div>
            )}

            {/* Download Completed Banner */}
            {downloadResult && !isDownloading && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <div>Update downloaded and verified!</div>
                    <div className="text-[11px] text-[var(--theme-text-muted)] font-normal mt-0.5">
                      Ready to install. Click below to launch installer and restart.
                    </div>
                  </div>
                </div>
                {downloadResult.filePath && (
                  <Tooltip title="Reveal file in file manager" arrow>
                    <IconButton
                      size="small"
                      onClick={handleShowFileInFolder}
                      className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-primary)]"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Download Error Banner */}
            {downloadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{downloadError}</span>
              </div>
            )}

            {/* Release Notes Changelog Container */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--theme-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                  Release Notes & Changelog
                </span>
                <button
                  type="button"
                  onClick={handleOpenReleasePage}
                  className="hover:text-[var(--theme-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  GitHub Release <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-accent)] max-h-48 overflow-y-auto">
                {renderReleaseNotes(updateInfo.releaseNotes)}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions className="!px-5 !py-3.5 border-t border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] flex items-center justify-between shrink-0">
        <div>
          <Button
            size="small"
            variant="text"
            onClick={handleCheckForUpdates}
            disabled={isChecking || isDownloading}
            startIcon={<RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />}
            className="!text-xs !text-[var(--theme-text-muted)] hover:!text-[var(--theme-primary)]"
          >
            Check Again
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isDownloading ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleCancelDownload}
              className="!text-xs !py-1.5 !px-3 rounded-lg"
            >
              Cancel Download
            </Button>
          ) : downloadResult ? (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={onClose}
                className="!text-xs !py-1.5 !px-3 rounded-lg !border-[var(--theme-border-accent)] !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)]"
              >
                Install Later
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleInstallNow}
                disabled={isInstalling}
                startIcon={<Zap className="w-3.5 h-3.5" />}
                className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold rounded-lg shadow-md"
              >
                {isInstalling ? 'Launching...' : 'Restart & Install'}
              </Button>
            </>
          ) : updateInfo?.updateAvailable && updateInfo?.asset ? (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={onClose}
                className="!text-xs !py-1.5 !px-3 rounded-lg !border-[var(--theme-border-accent)] !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)]"
              >
                Later
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleStartDownload}
                startIcon={<DownloadCloud className="w-3.5 h-3.5" />}
                className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold rounded-lg shadow-md"
              >
                Download & Install
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={handleOpenReleasePage}
                endIcon={<ExternalLink className="w-3.5 h-3.5" />}
                className="!text-xs !py-1.5 !px-3 rounded-lg !border-[var(--theme-border-accent)] !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)]"
              >
                Releases on GitHub
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={onClose}
                className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold rounded-lg"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}
