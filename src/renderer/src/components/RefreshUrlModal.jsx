import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Collapse from '@mui/material/Collapse';
import {
  RefreshCw,
  Link,
  Clipboard,
  ExternalLink,
  AlertTriangle,
  X,
  Radio,
  FileCode,
  Sliders,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Sparkles,
  Play
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function RefreshUrlModal({ open, task, onClose, onSuccess }) {
  const { effectiveMode } = useTheme();
  const isDark = effectiveMode === 'dark';

  const [newUrl, setNewUrl] = useState('');
  const [customReferrer, setCustomReferrer] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedAlert, setCapturedAlert] = useState(false);
  const [sizeWarning, setSizeWarning] = useState(null);

  const inputRef = useRef(null);

  // Initialize and register for browser extension capture
  useEffect(() => {
    if (!open || !task) {
      setNewUrl('');
      setErrorMsg('');
      setSizeWarning(null);
      setCapturedAlert(false);
      setShowAdvanced(false);
      return;
    }

    setNewUrl('');
    setCustomReferrer(task.referrer || '');
    setCustomHeaders('');
    setErrorMsg('');
    setSizeWarning(null);
    setCapturedAlert(false);

    // Tell backend we are waiting for a refreshed URL for this task
    window.electronAPI?.setAwaitingRefresh?.(task.id);

    // Listen for extension capture
    const unsub = window.electronAPI?.onRefreshUrlCaptured?.((data) => {
      if (data && (data.taskId === task.id || !data.taskId)) {
        if (data.newUrl) {
          setNewUrl(data.newUrl);
          if (data.referrer) setCustomReferrer(data.referrer);
          setCapturedAlert(true);
          setErrorMsg('');
          setSizeWarning(null);
        }
      }
    });

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      clearTimeout(timer);
      unsub?.();
      window.electronAPI?.setAwaitingRefresh?.(null);
    };
  }, [open, task]);

  if (!task) return null;

  const currentPercent = task.totalBytes > 0
    ? Math.min(100, Math.round(((task.downloadedBytes || 0) / task.totalBytes) * 100))
    : (task.progress || 0);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        setNewUrl(text.trim());
        setErrorMsg('');
      } else if (text) {
        setNewUrl(text.trim());
      }
    } catch {
      // Fallback
    }
  };

  const handleOpenSourcePage = () => {
    const targetUrl = task.referrer || task.url;
    if (targetUrl && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(targetUrl);
    }
  };

  const parseHeaders = () => {
    if (!customHeaders.trim()) return {};
    const lines = customHeaders.split('\n');
    const headers = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.substring(0, idx).trim();
        const v = line.substring(idx + 1).trim();
        if (k && v) headers[k] = v;
      }
    }
    return headers;
  };

  const handleSubmit = async (force = false) => {
    if (!newUrl.trim()) {
      setErrorMsg('Please paste or enter the new download address');
      return;
    }

    const trimmed = newUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Download address must begin with http:// or https://');
      return;
    }

    setIsValidating(true);
    setErrorMsg('');
    if (!force) setSizeWarning(null);

    try {
      const headers = parseHeaders();
      const res = await window.electronAPI?.refreshDownloadUrl?.({
        taskId: task.id,
        newUrl: trimmed,
        options: {
          referrer: customReferrer.trim() || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          force
        }
      });

      if (!res) {
        setErrorMsg('Failed to communicate with download engine');
        return;
      }

      if (res.sizeMismatch && !force) {
        setSizeWarning(res);
        return;
      }

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to verify new address');
        return;
      }

      onSuccess?.(res.task);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred while refreshing address');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isValidating ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: '!bg-[#1D1616] !border !border-[#8E1616]/50 !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'
      }}
    >
      {/* Modal Header */}
      <DialogTitle className="!px-5 !py-3 flex items-center justify-between border-b border-[var(--theme-border)]/40 bg-[var(--theme-bg-surface)] shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] text-[var(--theme-primary)] flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--theme-text-primary)] leading-tight truncate">
                Refresh Download Address
              </h3>
              <Chip
                size="small"
                label="IDM RECOVERY"
                className="!bg-amber-500/15 !text-amber-400 !border !border-amber-500/30 !font-mono-stat !text-[9px] !h-4 !font-bold"
              />
            </div>
            <p className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
              Resume download without losing already downloaded chunk files
            </p>
          </div>
        </div>

        <Tooltip title="Close" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={isValidating}
            className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !p-1.5"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Modal Content */}
      <DialogContent className="!px-5 !py-3.5 space-y-3 bg-[#1D1616] overflow-y-auto flex-1 min-h-0">
        {/* Task File Summary Card */}
        <div className="p-3 rounded-xl bg-[#140e0e]/80 border border-[#8E1616]/40 space-y-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-[#241717] border border-[#8E1616]/40 flex items-center justify-center shrink-0 text-[#D84040]">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-[#EEEEEE] truncate" title={task.fileName}>
                  {task.fileName}
                </div>
                <div className="text-[10px] text-[#b8a5a5] truncate font-mono mt-0.5" title={task.url}>
                  {task.url}
                </div>
              </div>
            </div>

            <Chip
              size="small"
              label={task.status}
              className={`!font-mono-stat !text-[10px] !h-5 !font-bold shrink-0 ${
                task.status === 'ERROR'
                  ? '!bg-rose-500/20 !text-[#D84040] !border !border-[#D84040]/40'
                  : '!bg-amber-500/20 !text-amber-400 !border !border-amber-500/40'
              }`}
            />
          </div>

          {/* Preserved Progress Indicator */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[10px] font-mono-stat text-[#b8a5a5]">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <HardDrive className="w-3 h-3" />
                <span>Preserved on Disk: {formatBytes(task.downloadedBytes || 0)}</span>
              </span>
              <span>
                {currentPercent}% {task.totalBytes > 0 ? `of ${formatBytes(task.totalBytes)}` : ''}
              </span>
            </div>
            <LinearProgress
              variant="determinate"
              value={currentPercent}
              className="!rounded-full !h-2 !bg-[#261818]"
              sx={{
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: '#34d399',
                  boxShadow: '0 0 8px rgba(52, 211, 153, 0.4)'
                }
              }}
            />
          </div>
        </div>

        {/* IDM Instructions Box */}
        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200/90 text-xs flex gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1 text-[11px]">
            <div>
              <strong>Why refresh?</strong> File hosts, cloud drives, and streaming servers generate temporary download tokens that expire after a period of time.
            </div>
            <div className="opacity-90">
              Generate a fresh download link in your browser, then paste it below. Voltrex Loader will resume directly into the existing chunk parts without restarting from 0%.
            </div>
            {(task.referrer || task.url) && (
              <div className="pt-1">
                <Button
                  size="small"
                  onClick={handleOpenSourcePage}
                  variant="outlined"
                  className="!text-[10px] !py-0.5 !px-2.5 !border-amber-500/40 !text-amber-300 hover:!bg-amber-500/20 !rounded-lg !capitalize"
                  startIcon={<ExternalLink className="w-3 h-3" />}
                >
                  Open Original Source Page in Browser
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Extension Auto-Capture Banner */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
          capturedAlert
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 animate-pulse'
            : 'bg-[#140e0e]/90 border-[#8E1616]/40 text-[#b8a5a5]'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {capturedAlert ? (
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Radio className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            )}
            <span className="text-[11px] truncate">
              {capturedAlert
                ? '✨ New address automatically captured from browser extension!'
                : 'Listening for download from browser extension...'}
            </span>
          </div>

          {capturedAlert && (
            <Chip
              size="small"
              label="CAPTURED"
              className="!bg-emerald-500/20 !text-emerald-300 !border !border-emerald-500/40 !font-bold !text-[9px] !h-4 shrink-0"
            />
          )}
        </div>

        {/* Input: New Download URL */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <label className="font-semibold uppercase tracking-wider text-[#b8a5a5]">
              New Download Address (URL)
            </label>
            <Button
              size="small"
              onClick={handlePaste}
              className="!text-[10px] !py-0.5 !px-1.5 !text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !capitalize"
              startIcon={<Clipboard className="w-3 h-3" />}
            >
              Paste from Clipboard
            </Button>
          </div>

          <div className="relative">
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder="https://example.com/download/file.zip?token=..."
              value={newUrl}
              onChange={(e) => {
                setNewUrl(e.target.value);
                setErrorMsg('');
                setSizeWarning(null);
              }}
              disabled={isValidating}
              className="!bg-[#140e0e] !rounded-lg border border-[#8E1616]/50"
              InputProps={{
                startAdornment: <Link className="w-4 h-4 mr-2 text-[#b8a5a5] shrink-0" />,
                className: '!text-xs font-mono !py-1.5 !px-2.5 !text-[#EEEEEE]'
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: '#D84040' },
                  '&.Mui-focused fieldset': { borderColor: '#D84040' }
                }
              }}
            />
          </div>
        </div>

        {/* Size Mismatch Warning Alert */}
        {sizeWarning && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>File Size Mismatch!</span>
            </div>
            <div className="text-[11px] leading-relaxed">
              Original download was <strong>{sizeWarning.originalSize}</strong>, but the new link reports <strong>{sizeWarning.newSize}</strong>.
            </div>
            <div className="text-[10px] text-amber-300/80">
              If this address points to an expired/login web page instead of the actual file, resuming may corrupt your data.
            </div>
            <div className="pt-1 flex justify-end">
              <Button
                size="small"
                onClick={() => handleSubmit(true)}
                className="!text-[10px] !font-bold !text-amber-300 !border !border-amber-500/50 hover:!bg-amber-500/20 !rounded-lg !capitalize"
              >
                Force Resume Anyway
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}

        {/* Advanced Headers & Referrer Toggle */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[11px] text-[#b8a5a5] hover:text-[var(--theme-primary)] transition-colors select-none font-medium"
          >
            <Sliders className="w-3 h-3" />
            <span>Advanced Connection Headers</span>
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <Collapse in={showAdvanced}>
            <div className="space-y-2.5 pt-2 pb-0.5">
              <div>
                <label className="block text-[10px] font-semibold text-[#b8a5a5] uppercase tracking-wider mb-1">
                  Referrer URL (Optional):
                </label>
                <TextField
                  fullWidth
                  size="small"
                  value={customReferrer}
                  onChange={(e) => setCustomReferrer(e.target.value)}
                  placeholder="https://source-website.com/download-page"
                  className="!bg-[#140e0e] !rounded-lg border border-[#8E1616]/40"
                  InputProps={{
                    className: '!text-xs font-mono !py-1.5 !px-2.5 !text-[#EEEEEE]'
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'transparent' },
                      '&:hover fieldset': { borderColor: '#D84040' },
                      '&.Mui-focused fieldset': { borderColor: '#D84040' }
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#b8a5a5] uppercase tracking-wider mb-1">
                  Custom HTTP Headers (Cookie / Authorization, one per line):
                </label>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  placeholder="Cookie: session_id=...&#10;User-Agent: ..."
                  className="!bg-[#140e0e] !rounded-lg border border-[#8E1616]/40"
                  InputProps={{
                    className: '!text-xs font-mono !py-1.5 !px-2.5 !text-[#EEEEEE]'
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'transparent' },
                      '&:hover fieldset': { borderColor: '#D84040' },
                      '&.Mui-focused fieldset': { borderColor: '#D84040' }
                    }
                  }}
                />
              </div>
            </div>
          </Collapse>
        </div>
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions className="!px-5 !py-3 border-t border-[#8E1616]/35 bg-[#140e0e] flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          disabled={isValidating}
          className="border border-[var(--theme-border-accent)] text-slate-600 dark:text-[#b8a5a5] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1.5 !px-3 rounded-lg transition-all !capitalize"
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={() => handleSubmit(false)}
          disabled={isValidating || !newUrl.trim()}
          className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap rounded-lg shadow-md shadow-[#8E1616]/30 !capitalize"
          startIcon={
            isValidating ? (
              <CircularProgress size={14} color="inherit" className="mr-1" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )
          }
        >
          {isValidating ? 'Verifying & Connecting...' : 'Update & Resume Download'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
