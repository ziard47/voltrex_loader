import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  Download,
  FolderOpen,
  CheckCircle2,
  XCircle,
  HardDrive,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  X,
  FileCode,
  Globe,
  Layers,
  Zap,
  FolderTree
} from 'lucide-react';
import { extractUrlsFromText } from './BatchDownloadModal';
import { getFileCategory, CATEGORY_FOLDERS, CATEGORY_LABELS } from '../utils/formatters';

function inferFileNameFromUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr.trim());
    // Check common query parameters for filenames
    for (const key of ['filename', 'file_name', 'name', 'file', 'title', 'fn', 'f']) {
      const val = parsed.searchParams.get(key);
      if (val) {
        const decoded = decodeURIComponent(val.trim()).replace(/[\\/:*?"<>|\r\n]/g, '_');
        if (decoded && decoded.includes('.')) {
          return decoded;
        }
      }
    }
    const pathname = parsed.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      const decoded = decodeURIComponent(last).replace(/[\\/:*?"<>|\r\n]/g, '_');
      if (decoded && decoded.includes('.')) {
        return decoded;
      }
    }
  } catch {}
  return '';
}

export default function AddDownloadModal({
  open,
  onClose,
  onAddDownload,
  defaultSavePath,
  initialData,
  onSwitchToBatch,
  onCurrentDataChange,
  organizeByCategory = false
}) {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [savePath, setSavePath] = useState(defaultSavePath || '');
  const [priority, setPriority] = useState('NORMAL');
  const [connections, setConnections] = useState(8);
  const [isCustomFolder, setIsCustomFolder] = useState(false);

  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const urlInputRef = useRef(null);
  const pasteTimeoutRef = useRef(null);

  const activeName = (fileName.trim() || probeResult?.fileName || inferFileNameFromUrl(url) || 'file').trim();
  const detectedCategory = useMemo(() => {
    return getFileCategory(activeName, probeResult?.mimeType || '');
  }, [activeName, probeResult?.mimeType]);

  const categoryFolderName = CATEGORY_FOLDERS[detectedCategory] || 'Others';
  const categoryLabelName = CATEGORY_LABELS[detectedCategory] || 'Others';

  const getCategorizedPath = useCallback((basePath, catFolder) => {
    if (!basePath) return '';
    const cleanBase = basePath.replace(/[/\\]+$/, '');
    const currentLast = cleanBase.split(/[/\\]/).pop();
    if (currentLast && currentLast.toLowerCase() === catFolder.toLowerCase()) {
      return cleanBase;
    }
    const sep = basePath.includes('\\') ? '\\' : '/';
    return `${cleanBase}${sep}${catFolder}`;
  }, []);

  useEffect(() => {
    onCurrentDataChange?.({ url, fileName });
  }, [url, fileName, onCurrentDataChange]);

  const handlePasteUrl = (e) => {
    const pastedText = e.clipboardData?.getData('text')?.trim();
    if (pastedText) {
      const detectedUrls = extractUrlsFromText(pastedText);
      if (detectedUrls.length > 1 && onSwitchToBatch) {
        e.preventDefault();
        onSwitchToBatch(pastedText);
        return;
      }
      if (pastedText.startsWith('http://') || pastedText.startsWith('https://')) {
        setUrl(pastedText);
        const inferred = inferFileNameFromUrl(pastedText);
        if (inferred) setFileName(inferred);
        setProbeResult(null);
        setErrorMsg('');
        handleCheckUrl(pastedText);
      }
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setProbeResult(null);
    setErrorMsg('');

    // If a full URL is pasted via context menu or drag
    const trimmed = newUrl.trim();
    if ((!url || url.length < 5) && trimmed.length > 8 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      const inferred = inferFileNameFromUrl(trimmed);
      if (inferred) setFileName(inferred);

      if (pasteTimeoutRef.current) clearTimeout(pasteTimeoutRef.current);
      pasteTimeoutRef.current = setTimeout(() => {
        handleCheckUrl(trimmed);
      }, 150);
    }
  };

  useEffect(() => {
    if (open) {
      const incomingUrl = initialData?.url ? initialData.url.trim() : '';
      let incomingName = initialData?.fileName ? initialData.fileName.trim() : '';

      // If incomingName is empty, immediately infer from URL so field is never empty
      if (!incomingName && incomingUrl) {
        incomingName = inferFileNameFromUrl(incomingUrl);
      }

      setUrl(incomingUrl);
      setFileName(incomingName);
      setPriority('NORMAL');
      setProbeResult(null);
      setErrorMsg('');

      const customPicked = Boolean(initialData?.customFolderSelected);
      setIsCustomFolder(customPicked);

      const resolvedPath = initialData?.savePath || initialData?.defaultSavePath || defaultSavePath;
      if (resolvedPath) {
        if (organizeByCategory && !customPicked) {
          const cat = getFileCategory(incomingName || 'file');
          const folder = CATEGORY_FOLDERS[cat] || 'Others';
          setSavePath(getCategorizedPath(resolvedPath, folder));
        } else {
          setSavePath(resolvedPath);
        }
      } else if (window.electronAPI?.getDefaultDownloadPath) {
        window.electronAPI.getDefaultDownloadPath().then((p) => {
          if (p) {
            if (organizeByCategory && !customPicked) {
              const cat = getFileCategory(incomingName || 'file');
              const folder = CATEGORY_FOLDERS[cat] || 'Others';
              setSavePath(getCategorizedPath(p, folder));
            } else {
              setSavePath(p);
            }
          }
        });
      } else {
        setSavePath('');
      }

      if (incomingUrl) {
        handleCheckUrl(incomingUrl);
      }
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [open, defaultSavePath, initialData, organizeByCategory, getCategorizedPath]);

  // Dynamically update categorized path if category changes and user hasn't chosen custom folder
  useEffect(() => {
    if (open && organizeByCategory && !isCustomFolder) {
      const basePath = initialData?.defaultSavePath || defaultSavePath;
      if (basePath) {
        setSavePath(getCategorizedPath(basePath, categoryFolderName));
      }
    }
  }, [open, organizeByCategory, isCustomFolder, categoryFolderName, initialData?.defaultSavePath, defaultSavePath, getCategorizedPath]);

  // Handle URL probe
  const handleCheckUrl = async (overrideUrl) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) return;

    // Immediately populate inferred name if current state is blank
    setFileName((prev) => (prev && prev.trim() ? prev : inferFileNameFromUrl(targetUrl)));

    setIsProbing(true);
    setErrorMsg('');
    try {
      if (window.electronAPI?.probeUrl) {
        const result = await window.electronAPI.probeUrl(targetUrl);
        setProbeResult(result);
        if (result.online) {
          if (result.fileName) {
            // Always adopt server's authoritative filename from probe
            setFileName(result.fileName);
          }
        } else {
          setErrorMsg(result.error || 'The URL could not be reached or is offline.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while checking URL');
    } finally {
      setIsProbing(false);
    }
  };

  // Browse save directory
  const handleBrowseFolder = async () => {
    if (window.electronAPI?.browseDirectory) {
      const selected = await window.electronAPI.browseDirectory(savePath);
      if (selected) {
        setSavePath(selected);
        setIsCustomFolder(true);
      }
    }
  };

  // Submit download
  const handleSubmit = (autoStart = true) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setErrorMsg('Please enter a valid download URL.');
      return;
    }

    onAddDownload({
      url: trimmedUrl,
      fileName: fileName.trim() || probeResult?.fileName,
      savePath: savePath.trim(),
      priority,
      connections: Number(connections) || 8,
      autoStart,
      customFolderSelected: isCustomFolder
    });

    onClose();
  };

  // Handle Enter keypress
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!probeResult && !isProbing && url.trim()) {
        handleCheckUrl();
      } else if (url.trim()) {
        handleSubmit(true);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: '!bg-[#1D1616] !border !border-[#8E1616]/50 !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'
      }}
    >
      {/* Modal Header */}
      <DialogTitle className="!px-5 !py-3.5 flex items-center justify-between border-b border-[#8E1616]/35 bg-[#140e0e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#8E1616]/30 border border-[#D84040]/30 text-[#D84040] flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#EEEEEE] leading-tight">Add Download</h3>
          </div>

          {/* Mode Switcher Tabs */}
          {onSwitchToBatch && (
            <div className="flex items-center ml-2 p-0.5 rounded-lg bg-[#1D1616] border border-[#8E1616]/40">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#8E1616]/30 text-[#EEEEEE] border border-[#D84040]/40">
                Single URL
              </span>
              <button
                type="button"
                onClick={() => onSwitchToBatch(url)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#b8a5a5] hover:text-[#EEEEEE] hover:bg-[#2e1d1d] transition-colors cursor-pointer"
              >
                <Layers className="w-3 h-3 text-[#D84040]" />
                <span>Batch</span>
              </button>
            </div>
          )}
        </div>
        <Tooltip title="Close" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            className="!text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#2e1d1d] !p-1.5"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      {/* Modal Content */}
      <DialogContent className="!px-5 !py-3.5 space-y-3 bg-[#1D1616] overflow-y-auto flex-1 min-h-0">
        {/* URL Input Box & Check Action */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
            Download URL
          </label>
          <div className="flex items-center gap-2">
            <TextField
              fullWidth
              size="small"
              inputRef={urlInputRef}
              placeholder="https://example.com/archive.zip"
              value={url}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteUrl}
              onChange={handleUrlChange}
              className="!bg-[#140e0e] !rounded-lg"
              InputProps={{
                startAdornment: <Globe className="w-4 h-4 text-[#8E1616] mr-2 shrink-0" />,
                className: '!text-xs font-mono !text-[#EEEEEE] !h-10 border border-[#8E1616]/30'
              }}
            />
            <Button
              variant="outlined"
              onClick={() => handleCheckUrl()}
              disabled={isProbing || !url.trim()}
              startIcon={isProbing ? <CircularProgress size={13} color="inherit" /> : <RefreshCw className="w-3.5 h-3.5" />}
              className="!h-10 !px-4 !shrink-0 !border-[#D84040]/50 !text-[#D84040] hover:!bg-[#8E1616]/20 !text-xs font-semibold whitespace-nowrap !rounded-lg"
            >
              {isProbing ? 'Checking...' : probeResult ? 'Recheck' : 'Check URL'}
            </Button>
          </div>
        </div>

        {/* Online / Offline & Probe Results Display */}
        {probeResult && (
          <div
            className={`p-3 rounded-xl border transition-all ${
              probeResult.online
                ? 'bg-[#8E1616]/15 border-[#D84040]/40'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {probeResult.online ? (
                  <Chip
                    icon={<CheckCircle2 className="w-3.5 h-3.5 !text-emerald-400" />}
                    label="Online / Accessible"
                    size="small"
                    className="!bg-emerald-500/15 !text-emerald-300 !border !border-emerald-500/30 font-semibold !text-[11px] !h-6"
                  />
                ) : (
                  <Chip
                    icon={<XCircle className="w-3.5 h-3.5 !text-rose-400" />}
                    label="Offline / Unreachable"
                    size="small"
                    className="!bg-rose-500/15 !text-rose-300 !border !border-rose-500/30 font-semibold !text-[11px] !h-6"
                  />
                )}

                {probeResult.resumable && (
                  <Chip
                    icon={<ShieldCheck className="w-3.5 h-3.5 !text-[#D84040]" />}
                    label="Resume Supported"
                    size="small"
                    className="!bg-[#8E1616]/30 !text-[#EEEEEE] !border !border-[#D84040]/40 font-semibold !text-[11px] !h-6"
                  />
                )}
              </div>

              {probeResult.statusCode && (
                <span className="text-xs font-mono text-[#b8a5a5] bg-[#140e0e] px-2 py-0.5 rounded border border-[#8E1616]/30">
                  HTTP {probeResult.statusCode}
                </span>
              )}
            </div>

            {probeResult.online && (
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#8E1616]/30">
                <div>
                  <span className="text-[#b8a5a5]">Detected Size: </span>
                  <span className="font-semibold text-[#EEEEEE] font-mono-stat">{probeResult.formattedSize}</span>
                </div>
                <div>
                  <span className="text-[#b8a5a5]">Content Type: </span>
                  <span className="font-semibold text-[#EEEEEE] truncate inline-block max-w-[160px] align-bottom">
                    {probeResult.mimeType || 'application/octet-stream'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error notice */}
        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-[#8E1616]/20 border border-[#D84040]/40 text-[#D84040] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#D84040]" />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}

        {/* File Name */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
            File Name
          </label>
          <TextField
            fullWidth
            size="small"
            placeholder="example-file.ext"
            value={fileName}
            onKeyDown={handleKeyDown}
            onChange={(e) => setFileName(e.target.value)}
            className="!bg-[#140e0e] !rounded-lg"
            InputProps={{
              startAdornment: <FileCode className="w-4 h-4 text-[#8E1616] mr-2 shrink-0" />,
              className: '!text-xs !text-[#EEEEEE] !h-10 font-mono border border-[#8E1616]/30'
            }}
          />
        </div>

        {/* Save Location & Browse Button */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5]">
              Save Location
            </label>
            {organizeByCategory && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--theme-text-muted)]">
                <FolderTree className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                <span>Category:</span>
                <span className="font-bold text-[var(--theme-primary)] uppercase">
                  {categoryLabelName}
                </span>
                {isCustomFolder && (
                  <span className="text-[10px] text-amber-400">
                    (Custom)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TextField
              fullWidth
              size="small"
              value={savePath}
              onChange={(e) => {
                setSavePath(e.target.value);
                setIsCustomFolder(true);
              }}
              className="!bg-[#140e0e] !rounded-lg"
              InputProps={{
                startAdornment: <HardDrive className="w-4 h-4 text-[var(--theme-primary)] mr-2 shrink-0" />,
                className: '!text-xs font-mono !text-[#EEEEEE] !h-10 border border-[var(--theme-border-accent)]'
              }}
            />
            <Button
              variant="outlined"
              onClick={handleBrowseFolder}
              startIcon={<FolderOpen className="w-3.5 h-3.5" />}
              className="!h-10 !px-4 !shrink-0 !border-[var(--theme-border-accent)] !text-[#EEEEEE] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs font-medium whitespace-nowrap !rounded-lg"
            >
              Browse...
            </Button>
          </div>
          {organizeByCategory && !isCustomFolder && (
            <div className="text-[10px] text-[var(--theme-text-muted)] mt-1 flex items-center gap-1">
              <span>Auto-sorting into:</span>
              <code className="text-[var(--theme-primary)] bg-[var(--theme-bg-surface)] px-1 rounded border border-[var(--theme-border-accent)] font-semibold">
                {categoryFolderName}/
              </code>
            </div>
          )}
        </div>

        {/* Priority & Connection Streams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Priority Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
              Download Priority
            </label>
            <FormControl fullWidth size="small">
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="!bg-[#140e0e] !text-xs !text-[#EEEEEE] !rounded-lg !h-10 border border-[#8E1616]/30"
                sx={{
                  '& .MuiSelect-select': { py: '8px', fontSize: '0.75rem' }
                }}
              >
                <MenuItem value="HIGH" className="!text-xs !text-[#D84040]">
                  High Priority
                </MenuItem>
                <MenuItem value="NORMAL" className="!text-xs !text-[#EEEEEE]">
                  Normal Priority
                </MenuItem>
                <MenuItem value="LOW" className="!text-xs !text-emerald-400">
                  Low Priority
                </MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Connection Streams Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] flex items-center gap-1">
                <Zap className="w-3 h-3 text-[var(--theme-primary)]" />
                <span>Connection Streams</span>
              </label>
              {probeResult?.resumable && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-500/30">
                  Range Turbo
                </span>
              )}
            </div>
            <FormControl fullWidth size="small">
              <Select
                value={connections}
                onChange={(e) => setConnections(e.target.value)}
                className="!bg-[#140e0e] !text-xs !text-[#EEEEEE] !rounded-lg !h-10 border border-[#8E1616]/30"
                sx={{
                  '& .MuiSelect-select': { py: '8px', fontSize: '0.75rem' }
                }}
              >
                <MenuItem value={1} className="!text-xs">
                  1 Stream (Single)
                </MenuItem>
                <MenuItem value={2} className="!text-xs">
                  2 Parallel Streams
                </MenuItem>
                <MenuItem value={4} className="!text-xs">
                  4 Parallel Streams
                </MenuItem>
                <MenuItem value={8} className="!text-xs !font-bold !text-[var(--theme-primary)]">
                  8 Streams (Recommended)
                </MenuItem>
                <MenuItem value={16} className="!text-xs text-amber-400">
                  16 Streams (Turbo Acceleration)
                </MenuItem>
                <MenuItem value={32} className="!text-xs text-rose-400">
                  32 Streams (Extreme Max)
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions className="!px-5 !py-3 border-t border-[#8E1616]/35 bg-[#140e0e] flex items-center justify-between gap-2 shrink-0">
        <Button
          variant="outlined"
          size="small"
          onClick={onClose}
          className="border border-[var(--theme-border-accent)] text-slate-600 dark:text-[#b8a5a5] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1.5 !px-3 rounded-lg transition-all"
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outlined"
            onClick={() => handleSubmit(false)}
            disabled={!url.trim()}
            startIcon={<Clock className="w-3.5 h-3.5" />}
            className="border border-[var(--theme-border-accent)] text-slate-600 dark:text-[#b8a5a5] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1.5 !px-3 whitespace-nowrap rounded-lg transition-all"
          >
            Add Paused
          </Button>

          <Button
            variant="contained"
            onClick={() => handleSubmit(true)}
            disabled={!url.trim()}
            startIcon={<Download className="w-3.5 h-3.5" />}
            className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap rounded-lg"
          >
            Download Now
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
