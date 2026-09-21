import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  Layers,
  FolderOpen,
  CheckCircle2,
  XCircle,
  HardDrive,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  X,
  Trash2,
  Folder,
  ClipboardList,
  Download,
  Info,
  Check
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

// Extract valid HTTP/HTTPS URLs from multi-line or delimited text
export function extractUrlsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/[\r\n, \t]+/);
  const urls = [];
  const seen = new Set();
  for (let line of lines) {
    line = line.trim();
    if ((line.startsWith('http://') || line.startsWith('https://')) && !seen.has(line)) {
      seen.add(line);
      urls.push(line);
    }
  }
  return urls;
}

// Infer filename from single URL
function inferFileName(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr.trim());
    for (const key of ['filename', 'file_name', 'name', 'file', 'title', 'fn', 'f']) {
      const val = parsed.searchParams.get(key);
      if (val) {
        const decoded = decodeURIComponent(val.trim()).replace(/[\\/:*?"<>|\r\n]/g, '_');
        if (decoded) return decoded;
      }
    }
    const pathname = parsed.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      const decoded = decodeURIComponent(last).replace(/[\\/:*?"<>|\r\n]/g, '_');
      if (decoded && decoded !== '/' && decoded !== '.') {
        return decoded;
      }
    }
  } catch {}
  return '';
}

// Automatically infer package name from a set of filenames (stripping part1, part2, etc.)
function detectPackageName(items) {
  if (!items || items.length === 0) return '';
  const names = items.map((it) => it.fileName || inferFileName(it.url)).filter(Boolean);
  if (names.length === 0) return '';

  // Clean part indicators from names
  const cleanedNames = names.map((name) => {
    let cleaned = name.trim();
    if (/\.(part\d+|z\d+|r\d+|\d{3})\.[a-z0-9]+$/i.test(cleaned)) {
      return cleaned.replace(/\.(part\d+|z\d+|r\d+|\d{3})\.[a-z0-9]+$/i, '').trim();
    }
    cleaned = cleaned
      .replace(/[-_.]*(part|pt|p)[-_.]*\d+.*$/i, '')
      .replace(/\s*\(\d+\)\.[a-z0-9]+$/i, '')
      .trim();
    cleaned = cleaned.replace(/\.(zip|rar|7z|tar|gz|bz2|xz|iso|bin|exe|msi|mp4|mkv|avi|mp3)$/i, '').trim();
    return cleaned;
  });

  // Find longest common prefix among cleaned names
  let prefix = cleanedNames[0] || '';
  for (let i = 1; i < cleanedNames.length; i++) {
    const curr = cleanedNames[i];
    let j = 0;
    while (j < prefix.length && j < curr.length && prefix[j].toLowerCase() === curr[j].toLowerCase()) {
      j++;
    }
    prefix = prefix.substring(0, j);
    if (!prefix) break;
  }

  // Trim trailing separators
  prefix = prefix.replace(/[-_.\s]+$/, '').trim();

  // If common prefix is short or empty, fallback to first cleaned name
  if (prefix.length >= 3) {
    return prefix;
  }
  return cleanedNames[0] || 'Batch_Download';
}

export default function BatchDownloadModal({
  open,
  onClose,
  onAddBatchDownloads,
  defaultSavePath,
  initialUrls = '',
  incomingAppendItem = null
}) {
  const [rawText, setRawText] = useState('');
  const [items, setItems] = useState([]); // Array of { id, url, fileName, fileSize, formattedSize, online, statusCode, error, resumable, mimeType, isChecking }
  const [packageName, setPackageName] = useState('');
  const [createSubfolder, setCreateSubfolder] = useState(true);
  const [savePath, setSavePath] = useState(defaultSavePath || '');
  const [priority, setPriority] = useState('NORMAL');
  const [isProbingAll, setIsProbingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const textareaRef = useRef(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (open) {
      const textToUse = initialUrls || '';
      setRawText(textToUse);
      if (defaultSavePath) {
        setSavePath(defaultSavePath);
      } else if (window.electronAPI?.getDefaultDownloadPath) {
        window.electronAPI.getDefaultDownloadPath().then((p) => {
          if (p) setSavePath(p);
        });
      } else {
        setSavePath('');
      }
      setPriority('NORMAL');
      setCreateSubfolder(true);
      setErrorMessage('');
      setIsProbingAll(false);

      if (textToUse.trim()) {
        const detectedUrls = extractUrlsFromText(textToUse);
        parseAndPopulateItems(detectedUrls);
      } else {
        setItems([]);
        setPackageName('');
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open, defaultSavePath, initialUrls]);

  // Handle incoming item appended while batch modal is already open
  useEffect(() => {
    if (open && incomingAppendItem) {
      const newUrl = typeof incomingAppendItem === 'string' ? incomingAppendItem : incomingAppendItem?.url;
      if (newUrl && newUrl.trim()) {
        const trimmed = newUrl.trim();
        setRawText((prev) => {
          const currentUrls = extractUrlsFromText(prev);
          if (!currentUrls.includes(trimmed)) {
            const nextUrls = [...currentUrls, trimmed];
            parseAndPopulateItems(nextUrls, true);
            return nextUrls.join('\n');
          }
          return prev;
        });
      }
    }
  }, [open, incomingAppendItem]);

  // Parse URLs into items
  const parseAndPopulateItems = (urls, preserveProbes = false) => {
    if (!urls || urls.length === 0) {
      setItems([]);
      setPackageName('');
      return;
    }

    const existingMap = new Map(items.map((it) => [it.url, it]));

    const newItems = urls.map((u, idx) => {
      const existing = preserveProbes ? existingMap.get(u) : null;
      if (existing) return existing;

      const name = inferFileName(u) || `part_${idx + 1}`;
      return {
        id: `url_${idx}_${Date.now()}`,
        url: u,
        fileName: name,
        fileSize: 0,
        formattedSize: '',
        online: null,
        statusCode: null,
        error: null,
        resumable: true,
        mimeType: '',
        isChecking: false
      };
    });

    setItems(newItems);

    // Auto-detect package name if currently empty or default
    setPackageName((prev) => {
      if (!prev || prev === 'Batch_Download') {
        return detectPackageName(newItems);
      }
      return prev;
    });
  };

  // Handle textarea text change
  const handleRawTextChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    setErrorMessage('');
    const detected = extractUrlsFromText(text);
    parseAndPopulateItems(detected, true);
  };

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        const currentUrls = extractUrlsFromText(rawText);
        const clipUrls = extractUrlsFromText(clip);
        if (clipUrls.length === 0) {
          setErrorMessage('No valid URLs found in clipboard.');
          return;
        }
        const combined = Array.from(new Set([...currentUrls, ...clipUrls]));
        const combinedText = combined.join('\n');
        setRawText(combinedText);
        parseAndPopulateItems(combined);
      }
    } catch (err) {
      setErrorMessage('Could not read clipboard. Please paste manually.');
    }
  };

  // Browse save directory
  const handleBrowseFolder = async () => {
    if (window.electronAPI?.browseDirectory) {
      const selected = await window.electronAPI.browseDirectory(savePath);
      if (selected) {
        setSavePath(selected);
      }
    }
  };

  // Check / probe all URLs
  const handleCheckAllUrls = async () => {
    if (items.length === 0) return;
    setIsProbingAll(true);
    setErrorMessage('');

    try {
      if (window.electronAPI?.batchProbeUrls) {
        // Send batch request
        const probeResults = await window.electronAPI.batchProbeUrls(items.map((it) => it.url));
        setItems((prev) => {
          const updated = prev.map((item, idx) => {
            const probe = probeResults[idx];
            if (!probe) return item;
            return {
              ...item,
              online: probe.online,
              statusCode: probe.statusCode,
              fileName: probe.fileName || item.fileName,
              fileSize: probe.fileSize || 0,
              formattedSize: probe.formattedSize || (probe.fileSize ? formatBytes(probe.fileSize) : ''),
              resumable: probe.resumable ?? true,
              mimeType: probe.mimeType || '',
              error: probe.error || null
            };
          });

          // Re-evaluate package name if we got better server filenames
          setPackageName((currPkg) => {
            if (!currPkg || currPkg === 'Batch_Download') {
              return detectPackageName(updated);
            }
            return currPkg;
          });

          return updated;
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while probing URLs');
    } finally {
      setIsProbingAll(false);
    }
  };

  // Remove single item
  const handleRemoveItem = (idToRemove) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== idToRemove);
      setRawText(next.map((it) => it.url).join('\n'));
      return next;
    });
  };

  // Update item filename
  const handleUpdateItemName = (id, newName) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, fileName: newName } : it)));
  };

  // Computed summary metrics
  const summary = useMemo(() => {
    const totalParts = items.length;
    let totalBytes = 0;
    let onlineCount = 0;
    let offlineCount = 0;

    for (const item of items) {
      if (item.fileSize) totalBytes += item.fileSize;
      if (item.online === true) onlineCount++;
      else if (item.online === false) offlineCount++;
    }

    return {
      totalParts,
      totalBytes,
      formattedTotalBytes: totalBytes > 0 ? formatBytes(totalBytes) : 'Unknown total size',
      onlineCount,
      offlineCount
    };
  }, [items]);

  // Destination path preview
  const destinationPreview = useMemo(() => {
    const base = (savePath || defaultSavePath || '').replace(/[/\\]+$/, '');
    const pkg = packageName.trim().replace(/[\\/:*?"<>|]/g, '_');
    if (createSubfolder && pkg) {
      return `${base}/${pkg}`;
    }
    return base;
  }, [savePath, defaultSavePath, createSubfolder, packageName]);

  // Submit batch download
  const handleSubmit = (autoStart = true) => {
    if (items.length === 0) {
      setErrorMessage('Please add at least one valid download URL.');
      return;
    }

    const payload = {
      items: items.map((it) => ({
        url: it.url,
        fileName: it.fileName.trim(),
        fileSize: it.fileSize,
        mimeType: it.mimeType,
        resumable: it.resumable
      })),
      baseSavePath: savePath.trim() || defaultSavePath,
      packageName: packageName.trim(),
      createSubfolder,
      priority,
      autoStart
    };

    onAddBatchDownloads(payload);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: '!bg-[#1D1616] !border !border-[#8E1616]/50 !rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col'
      }}
    >
      {/* Modal Header */}
      <DialogTitle className="!px-5 !py-3.5 flex items-center justify-between border-b border-[#8E1616]/35 bg-[#140e0e] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#8E1616]/30 border border-[#D84040]/30 text-[#D84040] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#EEEEEE] leading-tight">Batch Download Package</h3>
              <Chip
                label="Multi-Part"
                size="small"
                className="!bg-[#8E1616]/40 !text-[#D84040] !border !border-[#D84040]/40 font-semibold !text-[10px] !h-4"
              />
            </div>
            <p className="text-[11px] text-[#b8a5a5] mt-0.5">
              Add multiple URLs at once. Voltrex will probe files, create a dedicated folder, and queue them.
            </p>
          </div>
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
      <DialogContent className="!px-5 !py-3.5 space-y-3.5 bg-[#1D1616] overflow-y-auto flex-1 min-h-0">
        {/* Step 1: Multi-line URLs input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5]">
                Download URLs (One per line)
              </label>
              {items.length > 0 && (
                <span className="text-[11px] font-mono text-[#D84040] bg-[#8E1616]/20 px-2 py-0.2 rounded border border-[#D84040]/30">
                  {items.length} part{items.length === 1 ? '' : 's'} detected
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outlined"
                size="small"
                onClick={handlePasteFromClipboard}
                startIcon={<ClipboardList className="w-3.5 h-3.5 text-[var(--theme-primary)]" />}
                className="border border-[var(--theme-border-accent)] text-slate-700 dark:text-[#EEEEEE] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-[11px] !py-0.5 !px-2.5 normal-case rounded-lg font-medium transition-all"
              >
                Paste Clipboard
              </Button>
              {rawText && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setRawText('');
                    setItems([]);
                    setPackageName('');
                  }}
                  className="!text-[11px] !text-[#b8a5a5] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-0.5 !px-2 normal-case"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <TextField
            fullWidth
            multiline
            rows={3}
            inputRef={textareaRef}
            placeholder={`https://example.com/spiderman.part1.rar\nhttps://example.com/spiderman.part2.rar\nhttps://example.com/spiderman.part3.rar`}
            value={rawText}
            onChange={handleRawTextChange}
            className="!bg-[#140e0e] !rounded-lg"
            InputProps={{
              className: '!text-xs font-mono !text-[#EEEEEE] border border-[#8E1616]/30'
            }}
          />
        </div>

        {/* Step 2: Package Name & Save Folder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#140e0e]/80 border border-[#8E1616]/30">
          {/* Package / Subfolder Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5]">
                Package / Folder Name
              </label>
            </div>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. Spiderman Game"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="!bg-[#1D1616] !rounded-lg"
              InputProps={{
                startAdornment: <Folder className="w-4 h-4 text-[#D84040] mr-2 shrink-0" />,
                className: '!text-xs !text-[#EEEEEE] !h-10 border border-[#8E1616]/30'
              }}
            />
            <div className="mt-1.5">
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={createSubfolder}
                    onChange={(e) => setCreateSubfolder(e.target.checked)}
                    sx={{
                      color: 'var(--theme-border-accent)',
                      '&.Mui-checked': { color: 'var(--theme-primary)' },
                      padding: '2px 6px 2px 2px'
                    }}
                  />
                }
                label={
                  <span className="text-[11px] text-slate-700 dark:text-[#EEEEEE]">
                    Create subfolder for package (Downloads all parts inside)
                  </span>
                }
                className="!m-0"
              />
            </div>
          </div>

          {/* Base Save Location */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
              Save Location
            </label>
            <div className="flex items-center gap-2">
              <TextField
                fullWidth
                size="small"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                className="!bg-[#1D1616] !rounded-lg"
                InputProps={{
                  startAdornment: <HardDrive className="w-4 h-4 text-[var(--theme-primary)] mr-2 shrink-0" />,
                  className: '!text-xs font-mono !text-[#EEEEEE] !h-10 border border-[var(--theme-border-accent)]'
                }}
              />
              <Button
                variant="outlined"
                onClick={handleBrowseFolder}
                startIcon={<FolderOpen className="w-3.5 h-3.5" />}
                className="!h-10 !px-3 !shrink-0 !border-[var(--theme-border-accent)] !text-[#EEEEEE] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs font-medium whitespace-nowrap !rounded-lg"
              >
                Browse...
              </Button>
            </div>

            {/* Destination Preview banner */}
            <div className="mt-2 text-[11px] text-[#b8a5a5] flex items-center gap-1.5 truncate">
              <span className="shrink-0 font-semibold text-[#EEEEEE]">Target:</span>
              <span className="font-mono text-[var(--theme-primary)] truncate bg-[#1D1616] px-1.5 py-0.5 rounded border border-[var(--theme-border-accent)]">
                {destinationPreview || 'Default Downloads'}
              </span>
            </div>
          </div>
        </div>

        {/* Priority & URL Probe Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              onClick={handleCheckAllUrls}
              disabled={isProbingAll || items.length === 0}
              startIcon={
                isProbingAll ? (
                  <CircularProgress size={13} color="inherit" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )
              }
              className="!h-9 !px-3.5 !border-[#D84040]/50 !text-[#D84040] hover:!bg-[#8E1616]/20 !text-xs font-semibold !rounded-lg"
            >
              {isProbingAll ? 'Checking URLs...' : 'Check All URLs'}
            </Button>

            {items.length > 0 && (
              <span className="text-xs text-[#b8a5a5]">
                {summary.onlineCount > 0 ? (
                  <span className="text-emerald-400 font-semibold">{summary.onlineCount} online</span>
                ) : null}
                {summary.offlineCount > 0 ? (
                  <span className="text-rose-400 ml-1.5 font-semibold">({summary.offlineCount} unreachable)</span>
                ) : null}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5]">
              Priority:
            </label>
            <FormControl size="small">
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="!bg-[#140e0e] !text-xs !text-[#EEEEEE] !rounded-lg !h-9 border border-[#8E1616]/30"
                sx={{
                  '& .MuiSelect-select': { py: '6px', fontSize: '0.75rem' }
                }}
              >
                <MenuItem value="HIGH" className="!text-xs !text-[#D84040]">
                  High
                </MenuItem>
                <MenuItem value="NORMAL" className="!text-xs !text-[#EEEEEE]">
                  Normal
                </MenuItem>
                <MenuItem value="LOW" className="!text-xs !text-emerald-400">
                  Low
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-[#8E1616]/20 border border-[#D84040]/40 text-[#D84040] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#D84040]" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {/* Step 3: Parts List / Table */}
        {items.length > 0 ? (
          <div className="border border-[#8E1616]/35 rounded-xl overflow-hidden bg-[#140e0e]">
            <div className="px-3 py-2 bg-[#1b1212] border-b border-[#8E1616]/30 flex items-center justify-between text-[11px] font-semibold text-[#b8a5a5] uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span>Parts ({items.length})</span>
                {summary.totalBytes > 0 && (
                  <span className="text-[#EEEEEE] font-mono font-bold bg-[#8E1616]/30 px-2 py-0.5 rounded">
                    Total: {summary.formattedTotalBytes}
                  </span>
                )}
              </div>
              <span className="text-[10px] lowercase text-[#b8a5a5]">
                edit filename or remove invalid parts below
              </span>
            </div>

            <div className="divide-y divide-[#8E1616]/20 max-h-[240px] overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-[#1f1515] transition-colors"
                >
                  {/* Part Index Badge */}
                  <div className="w-6 h-6 rounded-md bg-[#241717] border border-[#8E1616]/40 text-[#b8a5a5] text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>

                  {/* File Name & URL */}
                  <div className="flex-1 min-w-0">
                    <TextField
                      fullWidth
                      size="small"
                      value={item.fileName}
                      onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                      className="!bg-[#170e0e]"
                      InputProps={{
                        className: '!text-xs font-mono !text-[#EEEEEE] !h-7 border border-[#8E1616]/20'
                      }}
                    />
                    <div className="text-[10px] text-[#b8a5a5] font-mono truncate mt-0.5" title={item.url}>
                      {item.url}
                    </div>
                  </div>

                  {/* Size & Probe status */}
                  <div className="flex items-center gap-2 shrink-0 font-mono-stat">
                    {item.online === true && (
                      <Chip
                        icon={<CheckCircle2 className="w-3 h-3 !text-emerald-400" />}
                        label={item.formattedSize || 'Online'}
                        size="small"
                        className="!bg-emerald-500/15 !text-emerald-300 !border !border-emerald-500/30 !font-semibold !text-[10px] !h-5 !px-1"
                      />
                    )}
                    {item.online === false && (
                      <Tooltip title={item.error || 'Server returned an error'} arrow>
                        <Chip
                          icon={<XCircle className="w-3 h-3 !text-rose-400" />}
                          label="Offline"
                          size="small"
                          className="!bg-rose-500/15 !text-rose-300 !border !border-rose-500/30 !font-semibold !text-[10px] !h-5 !px-1"
                        />
                      </Tooltip>
                    )}
                    {item.online === null && (
                      <span className="text-[11px] text-[#b8a5a5] italic">Unchecked</span>
                    )}

                    {/* Delete Part Button */}
                    <Tooltip title="Remove part" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(item.id)}
                        className="!text-[#b8a5a5] hover:!text-[#D84040] hover:!bg-[#8E1616]/20 !p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-[#8E1616]/40 rounded-xl bg-[#140e0e]/50">
            <Layers className="w-8 h-8 text-[#8E1616] mx-auto mb-2 opacity-60" />
            <p className="text-xs text-[#EEEEEE] font-medium">No download URLs entered</p>
            <p className="text-[11px] text-[#b8a5a5] mt-1">
              Paste multi-part archive links in the box above to generate your batch download package.
            </p>
          </div>
        )}

        {/* Queue concurrency note */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#140e0e] border border-[#8E1616]/25 text-[11px] text-[#b8a5a5]">
          <Info className="w-3.5 h-3.5 text-[#D84040] shrink-0" />
          <span>
            <strong>Queue Limit Applies:</strong> Downloads will start concurrently up to your maximum download limit. Remaining parts will wait queued and begin automatically as each part finishes.
          </span>
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
            disabled={items.length === 0}
            startIcon={<Clock className="w-3.5 h-3.5" />}
            className="border border-[var(--theme-border-accent)] text-slate-600 dark:text-[#b8a5a5] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1.5 !px-3 whitespace-nowrap rounded-lg transition-all"
          >
            Add All Paused
          </Button>

          <Button
            variant="contained"
            onClick={() => handleSubmit(true)}
            disabled={items.length === 0}
            startIcon={<Download className="w-3.5 h-3.5" />}
            className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap rounded-lg"
          >
            Download All {items.length > 0 ? `(${items.length})` : ''}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
