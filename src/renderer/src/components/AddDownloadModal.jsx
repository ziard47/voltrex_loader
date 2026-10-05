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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
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
  FolderTree,
  Magnet,
  FileUp,
  FileText,
  Copy,
  Check,
  Users,
  Radio,
  Gauge,
  Plus,
  ChevronDown,
  ChevronUp,
  Sliders,
  Search,
  Film,
  Music,
  Archive,
  File
} from 'lucide-react';
import { extractUrlsFromText } from './BatchDownloadModal';
import { getFileCategory, CATEGORY_FOLDERS, CATEGORY_LABELS, formatBytes } from '../utils/formatters';
import { POPULAR_TRACKERS, parseTrackersInput } from '../utils/torrentTrackers';
import { useTheme } from '../context/ThemeContext';

function inferFileNameFromUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  try {
    const parsed = new URL(urlStr.trim());
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
  initialTab = 'single',
  onSwitchToBatch,
  onCurrentDataChange,
  organizeByCategory = false
}) {
  const { effectiveMode } = useTheme();
  const isDark = effectiveMode === 'dark';
  const [activeTab, setActiveTab] = useState(initialTab || 'single'); // 'single' | 'torrent'

  // Single URL state
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [savePath, setSavePath] = useState(defaultSavePath || '');
  const [priority, setPriority] = useState('NORMAL');
  const [connections, setConnections] = useState(8);
  const [isCustomFolder, setIsCustomFolder] = useState(false);

  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Torrent mode state
  const [torrentSource, setTorrentSource] = useState('');
  const [torrentFilePath, setTorrentFilePath] = useState(null);
  const [torrentName, setTorrentName] = useState('');
  const [isProbingTorrent, setIsProbingTorrent] = useState(false);
  const [torrentProbeResult, setTorrentProbeResult] = useState(null);
  const [torrentError, setTorrentError] = useState('');
  const [selectedFileIndices, setSelectedFileIndices] = useState(new Set());
  const [torrentFileSearch, setTorrentFileSearch] = useState('');
  const [torrentCategoryFilter, setTorrentCategoryFilter] = useState('ALL');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Torrent trackers and speed limits state
  const [customTrackersText, setCustomTrackersText] = useState('');
  const [showTrackersSection, setShowTrackersSection] = useState(false);
  const [torrentDownloadLimitKBps, setTorrentDownloadLimitKBps] = useState('');
  const [torrentUploadLimitKBps, setTorrentUploadLimitKBps] = useState('');
  const [showLimitsSection, setShowLimitsSection] = useState(false);

  const handleAppendPopularTrackers = () => {
    setCustomTrackersText((prev) => {
      const existing = parseTrackersInput(prev);
      const combined = Array.from(new Set([...existing, ...POPULAR_TRACKERS]));
      return combined.join('\n');
    });
    setShowTrackersSection(true);
  };

  const urlInputRef = useRef(null);
  const torrentInputRef = useRef(null);
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
      if (pastedText.startsWith('magnet:?')) {
        e.preventDefault();
        setActiveTab('torrent');
        setTorrentSource(pastedText);
        setTorrentFilePath(null);
        handleProbeTorrent(pastedText);
        return;
      }
      const detectedUrls = extractUrlsFromText(pastedText);
      if (detectedUrls.length > 1 && onSwitchToBatch) {
        e.preventDefault();
        onSwitchToBatch(pastedText);
        return;
      }
      if (pastedText.startsWith('http://') || pastedText.startsWith('https://')) {
        if (pastedText.endsWith('.torrent') || pastedText.includes('.torrent?')) {
          e.preventDefault();
          setActiveTab('torrent');
          setTorrentSource(pastedText);
          setTorrentFilePath(null);
          handleProbeTorrent(pastedText);
          return;
        }
        setUrl(pastedText);
        const inferred = inferFileNameFromUrl(pastedText);
        if (inferred) setFileName(inferred);
        setProbeResult(null);
        setErrorMsg('');
        handleCheckUrl(pastedText);
      }
    }
  };

  const extractTorrentNameFromUri = (src) => {
    if (!src || typeof src !== 'string') return '';
    if (src.startsWith('magnet:')) {
      const match = src.match(/[?&]dn=([^&]+)/i);
      if (match && match[1]) {
        try {
          return decodeURIComponent(match[1].replace(/\+/g, ' ')).replace(/[\\/:*?"<>|\r\n]/g, '_');
        } catch {}
      }
    }
    return '';
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setProbeResult(null);
    setErrorMsg('');

    const trimmed = newUrl.trim();
    if (trimmed.startsWith('magnet:')) {
      setActiveTab('torrent');
      setTorrentSource(trimmed);
      setTorrentFilePath(null);
      const title = extractTorrentNameFromUri(trimmed);
      if (title) setTorrentName(title);
      handleProbeTorrent(trimmed);
      return;
    }
    if ((!url || url.length < 5) && trimmed.length > 8 && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      if (trimmed.endsWith('.torrent') || trimmed.includes('.torrent?')) {
        setActiveTab('torrent');
        setTorrentSource(trimmed);
        setTorrentFilePath(null);
        handleProbeTorrent(trimmed);
        return;
      }
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

      // Check whether this incoming data is specifically a torrent
      const isTorrentData = Boolean(
        initialData?.isTorrent ||
        initialData?.torrentPath ||
        initialData?.magnet ||
        incomingUrl.startsWith('magnet:') ||
        incomingUrl.endsWith('.torrent') ||
        incomingUrl.includes('.torrent?')
      );

      // If initialData is provided (such as from browser capture), strictly use its type
      // Only fall back to initialTab when opening fresh from TopBar buttons without data
      const isTorrentInitial = initialData ? isTorrentData : (initialTab === 'torrent');

      if (isTorrentInitial) {
        setActiveTab('torrent');
        const src = initialData?.torrentPath || initialData?.magnet || incomingUrl;
        setTorrentSource(src || '');
        setTorrentFilePath(initialData?.torrentPath || null);
        setTorrentProbeResult(null);
        setTorrentError('');
        setCustomTrackersText('');
        setTorrentDownloadLimitKBps('');
        setTorrentUploadLimitKBps('');
        setShowTrackersSection(false);
        setShowLimitsSection(false);
        const initialTorrentTitle = incomingName || extractTorrentNameFromUri(src);
        if (initialTorrentTitle) {
          setTorrentName(initialTorrentTitle);
        }
        if (src) {
          handleProbeTorrent(src);
        }
      } else {
        setActiveTab('single');
      }

      if (!incomingName && incomingUrl && !isTorrentInitial) {
        incomingName = inferFileNameFromUrl(incomingUrl);
      }

      setUrl(isTorrentInitial ? '' : incomingUrl);
      setFileName(incomingName);
      setPriority('NORMAL');
      setProbeResult(null);
      setErrorMsg('');

      const customPicked = Boolean(initialData?.customFolderSelected);
      setIsCustomFolder(customPicked);

      const resolvedPath = initialData?.savePath || initialData?.defaultSavePath || defaultSavePath;
      if (resolvedPath) {
        if (organizeByCategory && !customPicked) {
          const cat = isTorrentInitial ? 'torrents' : getFileCategory(incomingName || 'file');
          const folder = CATEGORY_FOLDERS[cat] || 'Others';
          setSavePath(getCategorizedPath(resolvedPath, folder));
        } else {
          setSavePath(resolvedPath);
        }
      } else if (window.electronAPI?.getDefaultDownloadPath) {
        window.electronAPI.getDefaultDownloadPath().then((p) => {
          if (p) {
            if (organizeByCategory && !customPicked) {
              const cat = isTorrentInitial ? 'torrents' : getFileCategory(incomingName || 'file');
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

      if (incomingUrl && !isTorrentInitial) {
        handleCheckUrl(incomingUrl);
      }

      setTimeout(() => {
        if (isTorrentInitial) {
          torrentInputRef.current?.focus();
        } else {
          urlInputRef.current?.focus();
        }
      }, 100);
    }
  }, [open, defaultSavePath, initialData, initialTab, organizeByCategory, getCategorizedPath]);

  useEffect(() => {
    if (open && organizeByCategory && !isCustomFolder) {
      const basePath = initialData?.defaultSavePath || defaultSavePath;
      if (basePath) {
        const catFolder = activeTab === 'torrent' ? 'Torrents' : categoryFolderName;
        setSavePath(getCategorizedPath(basePath, catFolder));
      }
    }
  }, [open, organizeByCategory, isCustomFolder, categoryFolderName, activeTab, initialData?.defaultSavePath, defaultSavePath, getCategorizedPath]);

  // Handle URL probe
  const handleCheckUrl = async (overrideUrl) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) return;

    setFileName((prev) => (prev && prev.trim() ? prev : inferFileNameFromUrl(targetUrl)));
    setIsProbing(true);
    setErrorMsg('');
    try {
      if (window.electronAPI?.probeUrl) {
        const result = await window.electronAPI.probeUrl(targetUrl);
        setProbeResult(result);
        if (result.online) {
          if (result.isTorrent) {
            setActiveTab('torrent');
            setTorrentSource(targetUrl);
            setTorrentProbeResult(result);
            setTorrentName(result.fileName || '');
            if (Array.isArray(result.files)) {
              setSelectedFileIndices(new Set(result.files.map((_, i) => i)));
              setTorrentFileSearch('');
              setTorrentCategoryFilter('ALL');
            }
            return;
          }
          if (result.fileName) {
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

  // Handle Torrent Probing
  const handleProbeTorrent = async (overrideSource) => {
    const targetSource = (overrideSource || torrentFilePath || torrentSource).trim();
    if (!targetSource) return;

    setIsProbingTorrent(true);
    setTorrentError('');
    try {
      if (window.electronAPI?.probeTorrent) {
        const result = await window.electronAPI.probeTorrent(targetSource);
        setTorrentProbeResult(result);
        if (result.name) {
          setTorrentName(result.name);
        }
        if (Array.isArray(result.files)) {
          setSelectedFileIndices(new Set(result.files.map((_, i) => i)));
          setTorrentFileSearch('');
          setTorrentCategoryFilter('ALL');
        }
      }
    } catch (err) {
      setTorrentError(err.message || 'Failed to inspect torrent file or magnet link');
    } finally {
      setIsProbingTorrent(false);
    }
  };

  // Browse local .torrent file
  const handleBrowseTorrentFile = async () => {
    if (window.electronAPI?.browseTorrentFile) {
      const res = await window.electronAPI.browseTorrentFile();
      if (res && res.filePath) {
        setTorrentFilePath(res.filePath);
        setTorrentSource(res.filePath);
        handleProbeTorrent(res.filePath);
      }
    }
  };

  // Drag and drop for .torrent file
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDropTorrent = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const file = droppedFiles[0];
      const filePath = file.path;
      if (filePath) {
        setTorrentFilePath(filePath);
        setTorrentSource(filePath);
        handleProbeTorrent(filePath);
      }
    }
  };

  // Torrent Files computations & filtering
  const torrentFiles = useMemo(() => torrentProbeResult?.files || [], [torrentProbeResult]);

  const { totalFilesCount, selectedFilesCount, totalBytesCount, selectedBytesCount } = useMemo(() => {
    let totalBytes = 0;
    let selectedBytes = 0;
    torrentFiles.forEach((file) => {
      const len = file.length || 0;
      totalBytes += len;
      if (selectedFileIndices.has(file.index)) {
        selectedBytes += len;
      }
    });
    return {
      totalFilesCount: torrentFiles.length,
      selectedFilesCount: selectedFileIndices.size,
      totalBytesCount: totalBytes || torrentProbeResult?.totalSize || 0,
      selectedBytesCount: selectedBytes
    };
  }, [torrentFiles, selectedFileIndices, torrentProbeResult?.totalSize]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: torrentFiles.length };
    torrentFiles.forEach((f) => {
      const cat = getFileCategory(f.name || f.path);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [torrentFiles]);

  const filteredTorrentFiles = useMemo(() => {
    if (!torrentFiles.length) return [];
    return torrentFiles.filter((file) => {
      if (torrentCategoryFilter !== 'ALL') {
        const cat = getFileCategory(file.name || file.path);
        if (cat !== torrentCategoryFilter) return false;
      }
      if (torrentFileSearch.trim()) {
        const query = torrentFileSearch.trim().toLowerCase();
        const target = (file.name || file.path || '').toLowerCase();
        if (!target.includes(query)) return false;
      }
      return true;
    });
  }, [torrentFiles, torrentCategoryFilter, torrentFileSearch]);

  const renderFileCategoryIcon = (fileName) => {
    const cat = getFileCategory(fileName);
    switch (cat) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      case 'compressed':
        return <Archive className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'documents':
        return <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <File className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    }
  };

  // Toggle file selection in torrent files list
  const toggleFileSelected = (idx) => {
    setSelectedFileIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const selectAllFiles = () => {
    if (torrentFiles.length > 0) {
      setSelectedFileIndices(new Set(torrentFiles.map((_, i) => i)));
    }
  };

  const deselectAllFiles = () => {
    setSelectedFileIndices(new Set());
  };

  const invertFileSelection = () => {
    if (torrentFiles.length > 0) {
      setSelectedFileIndices((prev) => {
        const next = new Set();
        torrentFiles.forEach((_, i) => {
          if (!prev.has(i)) next.add(i);
        });
        return next;
      });
    }
  };

  const selectFilteredFiles = () => {
    setSelectedFileIndices((prev) => {
      const next = new Set(prev);
      filteredTorrentFiles.forEach((f) => next.add(f.index));
      return next;
    });
  };

  const deselectFilteredFiles = () => {
    setSelectedFileIndices((prev) => {
      const next = new Set(prev);
      filteredTorrentFiles.forEach((f) => next.delete(f.index));
      return next;
    });
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
    if (activeTab === 'torrent') {
      const source = torrentFilePath || torrentSource.trim();
      if (!source) {
        setTorrentError('Please enter a Magnet link or browse a .torrent file.');
        return;
      }

      if (torrentFiles.length > 0 && selectedFileIndices.size === 0) {
        setTorrentError('Please select at least one file to download from this torrent.');
        return;
      }

      const parsedTrackers = parseTrackersInput(customTrackersText);

      onAddDownload({
        url: source,
        fileName: (torrentName.trim() || torrentProbeResult?.name || 'torrent_download').trim(),
        savePath: savePath.trim(),
        priority,
        autoStart,
        isTorrent: true,
        torrentFilePath: torrentFilePath || null,
        selectedFileIndices: Array.from(selectedFileIndices),
        customFolderSelected: isCustomFolder,
        trackers: parsedTrackers,
        downloadLimitKBps: Math.max(0, parseInt(torrentDownloadLimitKBps, 10) || 0),
        uploadLimitKBps: Math.max(0, parseInt(torrentUploadLimitKBps, 10) || 0)
      });

      onClose();
      return;
    }

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
      if (activeTab === 'torrent') {
        if (!torrentProbeResult && !isProbingTorrent && torrentSource.trim()) {
          handleProbeTorrent(torrentSource);
        } else if (torrentSource.trim() || torrentFilePath) {
          handleSubmit(true);
        }
      } else {
        if (!probeResult && !isProbing && url.trim()) {
          handleCheckUrl();
        } else if (url.trim()) {
          handleSubmit(true);
        }
      }
    }
  };

  const copyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard?.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
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
      <DialogTitle className="!px-5 !py-3 flex items-center justify-between border-b border-[var(--theme-border)]/40 bg-[var(--theme-bg-surface)] shrink-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
              activeTab === 'torrent'
                ? 'bg-purple-950/50 border-purple-500/40 text-purple-400'
                : 'bg-[var(--theme-secondary-subtle)] border-[var(--theme-border-accent)] text-[var(--theme-primary)]'
            }`}
          >
            {activeTab === 'torrent' ? <Magnet className="w-4 h-4" /> : <Download className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--theme-text-primary)] leading-tight truncate">
              {activeTab === 'torrent' ? 'Add Torrent Download' : 'Add Download'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mode Switcher Tabs */}
          <div
            className={`flex items-center p-1 rounded-xl border shadow-inner gap-1 transition-all ${
              isDark
                ? 'bg-black/40 border-white/10'
                : 'bg-slate-200/70 border-slate-300/80'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] text-white shadow-md shadow-[var(--theme-primary)]/25'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Single URL</span>
            </button>
            {onSwitchToBatch && (
              <button
                type="button"
                onClick={() => onSwitchToBatch(url)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0 text-[var(--theme-primary)]" />
                <span>Batch</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('torrent')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                activeTab === 'torrent'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : isDark
                  ? 'text-purple-300/80 hover:text-purple-100 hover:bg-purple-950/30'
                  : 'text-purple-700/80 hover:text-purple-950 hover:bg-purple-100/70'
              }`}
            >
              <Magnet className="w-3.5 h-3.5 shrink-0" />
              <span>Torrent</span>
            </button>
          </div>

          <Tooltip title="Close" arrow>
            <IconButton
              size="small"
              onClick={onClose}
              className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !p-1.5"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </DialogTitle>

      {/* Modal Content */}
      <DialogContent className="!px-5 !py-3.5 space-y-3 bg-[#1D1616] overflow-y-auto flex-1 min-h-0">
        {activeTab === 'torrent' ? (
          /* ================= BIT TORRENT MODE ================= */
          <div className="space-y-3">
            {/* .torrent File Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDropTorrent}
              onClick={handleBrowseTorrentFile}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDraggingFile
                  ? 'border-purple-400 bg-purple-950/40 scale-[1.01]'
                  : torrentFilePath
                  ? 'border-purple-500/50 bg-purple-950/20'
                  : 'border-[#8E1616]/40 hover:border-purple-400/60 bg-[#140e0e]/80 hover:bg-[#1a1111]'
              }`}
            >
              <FileUp className="w-6 h-6 mx-auto mb-1.5 text-purple-400" />
              <div className="text-xs font-semibold text-zinc-200">
                {torrentFilePath ? (
                  <span className="text-purple-300 font-mono text-[11px] break-all">
                    {torrentFilePath}
                  </span>
                ) : (
                  <span>Click to browse .torrent file or drag & drop here</span>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Supports all standard BitTorrent .torrent files
              </div>
            </div>

            {/* Magnet URI Input Field */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1">
                Or Paste Magnet Link
              </label>
              <div className="flex items-center gap-2">
                <TextField
                  inputRef={torrentInputRef}
                  fullWidth
                  size="small"
                  placeholder="magnet:?xt=urn:btih:..."
                  value={torrentSource}
                  onChange={(e) => {
                    setTorrentSource(e.target.value);
                    setTorrentFilePath(null);
                    setTorrentProbeResult(null);
                    setTorrentError('');
                  }}
                  onKeyDown={handleKeyDown}
                  className="!bg-[#140e0e] !rounded-lg border border-purple-500/30"
                  inputProps={{
                    className: '!text-xs !text-[#EEEEEE] font-mono !py-2 !px-3'
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleProbeTorrent(torrentSource)}
                  disabled={isProbingTorrent || (!torrentSource.trim() && !torrentFilePath)}
                  className="!border-purple-500/40 hover:!border-purple-400 !text-purple-300 hover:!bg-purple-950/30 !text-xs !py-2 !px-3.5 whitespace-nowrap !rounded-lg shrink-0 font-medium"
                >
                  {isProbingTorrent ? (
                    <CircularProgress size={14} className="!text-purple-400 mr-1" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1 text-purple-400" />
                  )}
                  <span>Inspect Swarm</span>
                </Button>
              </div>
            </div>

            {/* Torrent Error Alert */}
            {torrentError && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{torrentError}</span>
              </div>
            )}

            {/* Torrent Telemetry / Metadata Inspection Card */}
            {torrentProbeResult && (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Magnet className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold text-zinc-100 truncate">
                      {torrentProbeResult.name || 'BitTorrent Transfer'}
                    </span>
                  </div>
                  <Chip
                    size="small"
                    label={torrentProbeResult.totalSize > 0 ? formatBytes(torrentProbeResult.totalSize) : 'Swarm Resolving'}
                    className="!bg-purple-900/40 !text-purple-200 !border !border-purple-500/40 !font-bold !text-[10px] !h-5 shrink-0"
                  />
                </div>

                {/* Torrent Editable Name */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">
                    Download Name
                  </label>
                  <TextField
                    fullWidth
                    size="small"
                    value={torrentName}
                    onChange={(e) => setTorrentName(e.target.value)}
                    className="!bg-[#140e0e] !rounded-lg border border-purple-500/20"
                    inputProps={{
                      className: '!text-xs !text-zinc-200 !py-1.5 !px-2.5'
                    }}
                  />
                </div>

                {/* Badges: InfoHash, Pieces */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-300 font-mono-stat pt-1">
                  {torrentProbeResult.infoHash && (
                    <div className="flex items-center gap-1 bg-[#1a1111] px-2 py-0.5 rounded border border-purple-500/20">
                      <span>Hash: {torrentProbeResult.infoHash.substring(0, 12)}...</span>
                      <button
                        type="button"
                        onClick={() => copyHash(torrentProbeResult.infoHash)}
                        className="text-purple-400 hover:text-white"
                        title="Copy full InfoHash"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  {torrentProbeResult.piecesCount > 0 && (
                    <div className="bg-[#1a1111] px-2 py-0.5 rounded border border-purple-500/20 text-zinc-400">
                      {torrentProbeResult.piecesCount} Pieces ({formatBytes(torrentProbeResult.pieceLength || 0)}/ea)
                    </div>
                  )}
                  {torrentProbeResult.files?.length > 0 && (
                    <div className="bg-[#1a1111] px-2 py-0.5 rounded border border-purple-500/20 text-purple-300">
                      {torrentProbeResult.files.length} Files
                    </div>
                  )}
                </div>

                {/* Torrent Files Selection Section */}
                {torrentFiles.length > 0 && (
                  <div className="mt-3 border-t border-purple-500/20 pt-2.5 space-y-2">
                    {/* Header with Title and Selected Size Stat */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] font-semibold text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-purple-400" />
                        <span>Files to Download ({selectedFilesCount} / {totalFilesCount})</span>
                      </div>
                      <div className="text-[10px] font-mono-stat px-2 py-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-purple-200">
                        Selected: <span className="font-bold text-white">{formatBytes(selectedBytesCount)}</span> / {formatBytes(totalBytesCount)}
                      </div>
                    </div>

                    {/* Batch Action Buttons & Quick Filter Controls */}
                    <div className="flex items-center justify-between flex-wrap gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={selectAllFiles}
                          className="px-2 py-0.5 rounded bg-[#1e1313] hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 cursor-pointer transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllFiles}
                          className="px-2 py-0.5 rounded bg-[#1e1313] hover:bg-zinc-800 text-zinc-400 border border-zinc-700/50 cursor-pointer transition-colors"
                        >
                          Deselect All
                        </button>
                        <button
                          type="button"
                          onClick={invertFileSelection}
                          className="px-2 py-0.5 rounded bg-[#1e1313] hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 cursor-pointer transition-colors"
                        >
                          Invert Selection
                        </button>
                        {(torrentFileSearch.trim() || torrentCategoryFilter !== 'ALL') && (
                          <>
                            <span className="text-zinc-600">|</span>
                            <button
                              type="button"
                              onClick={selectFilteredFiles}
                              className="px-2 py-0.5 rounded bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-400/40 cursor-pointer transition-colors"
                            >
                              Select Filtered ({filteredTorrentFiles.length})
                            </button>
                            <button
                              type="button"
                              onClick={deselectFilteredFiles}
                              className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700/50 cursor-pointer transition-colors"
                            >
                              Deselect Filtered
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Search & Category Tabs */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Filter files by name..."
                            value={torrentFileSearch}
                            onChange={(e) => setTorrentFileSearch(e.target.value)}
                            className="w-full pl-8 pr-7 py-1 text-xs bg-[#120b0b] border border-purple-500/20 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                          />
                          {torrentFileSearch && (
                            <button
                              type="button"
                              onClick={() => setTorrentFileSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                        {[
                          { id: 'ALL', label: 'All', count: categoryCounts.ALL },
                          { id: 'video', label: 'Videos', count: categoryCounts.video },
                          { id: 'audio', label: 'Audio', count: categoryCounts.audio },
                          { id: 'compressed', label: 'Archives', count: categoryCounts.compressed },
                          { id: 'documents', label: 'Docs', count: categoryCounts.documents },
                          { id: 'programs', label: 'Programs', count: categoryCounts.programs },
                          { id: 'others', label: 'Others', count: categoryCounts.others }
                        ]
                          .filter((cat) => cat.id === 'ALL' || (cat.count && cat.count > 0))
                          .map((cat) => {
                            const isActive = torrentCategoryFilter === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setTorrentCategoryFilter(cat.id)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap cursor-pointer transition-colors ${
                                  isActive
                                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/60 font-medium'
                                    : 'bg-[#150d0d] text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/50 hover:text-zinc-300'
                                }`}
                              >
                                {cat.label} ({cat.count || 0})
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Validation Warning if 0 files selected */}
                    {selectedFilesCount === 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs animate-pulse">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>No files selected. Please select at least one file to download from this torrent.</span>
                      </div>
                    )}

                    {/* Files Scrollable Container */}
                    <div className="max-h-44 overflow-y-auto space-y-1 bg-[#120b0b] rounded-lg p-1.5 border border-purple-500/20">
                      {filteredTorrentFiles.length === 0 ? (
                        <div className="text-center py-4 text-xs text-zinc-500">
                          No files matching your search or category filter.
                        </div>
                      ) : (
                        filteredTorrentFiles.map((file) => {
                          const isSelected = selectedFileIndices.has(file.index);
                          return (
                            <div
                              key={file.index}
                              onClick={() => toggleFileSelected(file.index)}
                              className={`flex items-center justify-between gap-2 p-1.5 rounded cursor-pointer transition-colors text-[11px] font-mono-stat border ${
                                isSelected
                                  ? 'bg-purple-950/40 border-purple-500/30 text-zinc-100'
                                  : 'bg-[#150d0d]/40 border-transparent text-zinc-500 opacity-60 hover:opacity-100 hover:bg-zinc-900/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Checkbox
                                  size="small"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="!p-0 !text-purple-400"
                                />
                                {renderFileCategoryIcon(file.name || file.path)}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium" title={file.name || file.path}>
                                    {file.name || file.path}
                                  </div>
                                  {file.path && file.name && file.path !== file.name && (
                                    <div className="truncate text-[9px] text-zinc-500" title={file.path}>
                                      {file.path}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[10px] shrink-0 font-medium ${isSelected ? 'text-purple-300' : 'text-zinc-500'}`}>
                                {formatBytes(file.length || 0)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= SINGLE URL MODE ================= */
          <div className="space-y-3">
            {/* URL Input Box & Check Action */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
                Download URL
              </label>
              <div className="flex items-center gap-2">
                <TextField
                  inputRef={urlInputRef}
                  fullWidth
                  size="small"
                  placeholder="https://example.com/file.zip or magnet:?xt=..."
                  value={url}
                  onChange={handleUrlChange}
                  onPaste={handlePasteUrl}
                  onKeyDown={handleKeyDown}
                  className="!bg-[#140e0e] !rounded-lg border border-[#8E1616]/30"
                  inputProps={{
                    className: '!text-xs !text-[#EEEEEE] font-mono !py-2 !px-3'
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleCheckUrl()}
                  disabled={isProbing || !url.trim()}
                  className="btn-theme-outlined !text-xs !py-2 !px-3.5 whitespace-nowrap !rounded-lg shrink-0 font-medium"
                >
                  {isProbing ? (
                    <CircularProgress size={14} className="!text-[var(--theme-primary)] mr-1" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  )}
                  <span>Check URL</span>
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{errorMsg}</span>
              </div>
            )}

            {/* Probed Details Card */}
            {probeResult && probeResult.online && (
              <div className="p-2.5 rounded-xl bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-zinc-200 font-semibold truncate">
                      {probeResult.fileName || activeName}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                      <span>{probeResult.formattedSize || formatBytes(probeResult.fileSize || 0)}</span>
                      <span>•</span>
                      <span>{probeResult.resumable ? 'Resumable Range Stream' : 'Single Stream'}</span>
                    </div>
                  </div>
                </div>

                <Chip
                  size="small"
                  label={categoryLabelName}
                  className="!bg-[var(--theme-primary)]/15 !text-[var(--theme-primary)] !border !border-[var(--theme-primary)]/30 !font-bold !text-[10px] !h-5 shrink-0"
                />
              </div>
            )}

            {/* Custom Filename */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
                Save As (Filename)
              </label>
              <TextField
                fullWidth
                size="small"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="!bg-[#140e0e] !rounded-lg border border-[#8E1616]/30"
                inputProps={{
                  className: '!text-xs !text-[#EEEEEE] !py-2 !px-3'
                }}
              />
            </div>
          </div>
        )}

        {/* Save Folder Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#b8a5a5] mb-1">
            Destination Folder
          </label>
          <div className="flex items-center gap-2">
            <TextField
              fullWidth
              size="small"
              value={savePath}
              onChange={(e) => {
                setSavePath(e.target.value);
                setIsCustomFolder(true);
              }}
              className="!bg-[#140e0e] !rounded-lg border border-[#8E1616]/30"
              inputProps={{
                className: '!text-xs !text-[#EEEEEE] font-mono !py-2 !px-3'
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleBrowseFolder}
              className="btn-theme-outlined !text-xs !py-2 !px-3 whitespace-nowrap !rounded-lg shrink-0 font-medium"
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1" />
              <span>Browse</span>
            </Button>
          </div>
          {organizeByCategory && !isCustomFolder && (
            <div className="text-[10px] text-[var(--theme-text-muted)] mt-1 flex items-center gap-1">
              <span>Auto-sorting into:</span>
              <code className="text-[var(--theme-primary)] bg-[var(--theme-bg-surface)] px-1 rounded border border-[var(--theme-border-accent)] font-semibold">
                {activeTab === 'torrent' ? 'Torrents' : categoryFolderName}/
              </code>
            </div>
          )}
        </div>

        {/* Priority & Connections Grid */}
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

          {/* Connection Streams (for Single URL) or Peer Swarm (for Torrents) */}
          {activeTab === 'single' ? (
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
          ) : (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-purple-300 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" />
                <span>P2P Protocol Engine</span>
              </label>
              <div className="h-10 rounded-lg bg-[#140e0e] border border-purple-500/30 px-3 flex items-center justify-between text-xs text-purple-200">
                <span>WebTorrent Native Swarm</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  DHT + PEX Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BitTorrent Trackers & Per-Torrent Speed Limits (Torrent Mode Only) */}
        {activeTab === 'torrent' && (
          <div className="space-y-3 pt-1 border-t border-purple-500/20">
            {/* Trackers Management Section */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">Torrent Swarm Trackers</span>
                  {torrentProbeResult?.trackers?.length > 0 && (
                    <Chip
                      size="small"
                      label={`${torrentProbeResult.trackers.length} detected`}
                      className="!bg-purple-900/50 !text-purple-300 !border !border-purple-500/40 !font-bold !text-[9px] !h-4"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleAppendPopularTrackers}
                    className="!text-[10px] !text-purple-300 hover:!text-purple-100 !py-0.5 !px-2 !min-w-0 !bg-purple-900/30 hover:!bg-purple-900/50 !border !border-purple-500/40 !rounded-md"
                  >
                    <Plus className="w-2.5 h-2.5 mr-1" />
                    + Append Best Trackers
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowTrackersSection((prev) => !prev)}
                    className="!text-[10px] !text-purple-300 hover:!text-purple-100 !py-0.5 !px-2 !min-w-0 !bg-purple-900/20 hover:!bg-purple-900/40 !border !border-purple-500/30 !rounded-md"
                  >
                    {showTrackersSection ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span className="ml-1">{showTrackersSection ? 'Hide' : 'Add Trackers'}</span>
                  </Button>
                </div>
              </div>

              {/* Collapsible Custom Trackers Textarea */}
              {showTrackersSection && (
                <div className="space-y-1.5 animate-in fade-in duration-200 pt-1">
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    value={customTrackersText}
                    onChange={(e) => setCustomTrackersText(e.target.value)}
                    placeholder="udp://tracker.opentrackr.org:1337/announce&#10;udp://open.stealth.si:80/announce&#10;wss://tracker.openwebtorrent.com&#10;(one tracker URL per line)"
                    className="!bg-[#140e0e] !rounded-lg border border-purple-500/30 font-mono"
                    inputProps={{
                      className: '!text-[11px] !text-zinc-200 font-mono !py-1.5 !px-2'
                    }}
                  />
                  <div className="flex items-center justify-between text-[10px] text-purple-300/70">
                    <span>Supports UDP, HTTP, HTTPS, WS, and WSS announce URLs.</span>
                    {customTrackersText && (
                      <span className="text-purple-300 font-bold">
                        {parseTrackersInput(customTrackersText).length} custom trackers configured
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Per-Torrent Speed Limits Section */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">Torrent Speed Limits (Optional)</span>
                  <Chip
                    size="small"
                    label={
                      (torrentDownloadLimitKBps > 0 || torrentUploadLimitKBps > 0)
                        ? `DL: ${torrentDownloadLimitKBps > 0 ? torrentDownloadLimitKBps + ' KB/s' : '∞'} | UL: ${torrentUploadLimitKBps > 0 ? torrentUploadLimitKBps + ' KB/s' : '∞'}`
                        : 'Unlimited'
                    }
                    className="!bg-purple-900/50 !text-purple-300 !border !border-purple-500/40 !font-bold !text-[9px] !h-4"
                  />
                </div>

                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowLimitsSection((prev) => !prev)}
                  className="!text-[10px] !text-purple-300 hover:!text-purple-100 !py-0.5 !px-2 !min-w-0 !bg-purple-900/20 hover:!bg-purple-900/40 !border !border-purple-500/30 !rounded-md"
                >
                  <Sliders className="w-2.5 h-2.5 mr-1" />
                  {showLimitsSection ? 'Collapse Limits' : 'Configure Limits'}
                </Button>
              </div>

              {showLimitsSection && (
                <div className="space-y-2 animate-in fade-in duration-200 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Download Limit */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-purple-300/80 mb-1">
                        Download Limit (KB/s)
                      </label>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0 (Unlimited)"
                        value={torrentDownloadLimitKBps}
                        onChange={(e) => setTorrentDownloadLimitKBps(e.target.value)}
                        className="!bg-[#140e0e] !rounded-lg border border-purple-500/30"
                        inputProps={{
                          min: 0,
                          step: 100,
                          className: '!text-xs !text-zinc-200 font-mono !py-1.5 !px-2.5'
                        }}
                      />
                      <span className="text-[9px] text-zinc-400 mt-0.5 block">0 = unlimited download speed</span>
                    </div>

                    {/* Upload Limit */}
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-purple-300/80 mb-1">
                        Upload Limit (KB/s)
                      </label>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0 (Unlimited)"
                        value={torrentUploadLimitKBps}
                        onChange={(e) => setTorrentUploadLimitKBps(e.target.value)}
                        className="!bg-[#140e0e] !rounded-lg border border-purple-500/30"
                        inputProps={{
                          min: 0,
                          step: 50,
                          className: '!text-xs !text-zinc-200 font-mono !py-1.5 !px-2.5'
                        }}
                      />
                      <span className="text-[9px] text-zinc-400 mt-0.5 block">0 = unlimited upload speed</span>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-zinc-400 font-medium mr-1">Presets:</span>
                    {[
                      { label: 'No Limit', dl: 0, ul: 0 },
                      { label: '500 KB/s', dl: 500, ul: 100 },
                      { label: '1 MB/s', dl: 1024, ul: 256 },
                      { label: '2 MB/s', dl: 2048, ul: 512 },
                      { label: '5 MB/s', dl: 5120, ul: 1024 }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTorrentDownloadLimitKBps(p.dl === 0 ? '' : p.dl);
                          setTorrentUploadLimitKBps(p.ul === 0 ? '' : p.ul);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#1e1313] hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 cursor-pointer transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
            disabled={
              activeTab === 'torrent'
                ? (!torrentSource.trim() && !torrentFilePath) || (torrentFiles.length > 0 && selectedFilesCount === 0)
                : !url.trim()
            }
            startIcon={<Clock className="w-3.5 h-3.5" />}
            className="border border-[var(--theme-border-accent)] text-slate-600 dark:text-[#b8a5a5] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1.5 !px-3 whitespace-nowrap rounded-lg transition-all"
          >
            Add Paused
          </Button>

          <Button
            variant="contained"
            onClick={() => handleSubmit(true)}
            disabled={
              activeTab === 'torrent'
                ? (!torrentSource.trim() && !torrentFilePath) || (torrentFiles.length > 0 && selectedFilesCount === 0)
                : !url.trim()
            }
            startIcon={activeTab === 'torrent' ? <Magnet className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            className={
              activeTab === 'torrent'
                ? '!bg-purple-600 hover:!bg-purple-500 !text-white !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap rounded-lg shadow-lg shadow-purple-900/30'
                : 'btn-theme-primary !text-white !text-xs !py-1.5 !px-4 font-semibold whitespace-nowrap rounded-lg'
            }
          >
            {activeTab === 'torrent' ? 'Start Torrent Download' : 'Download Now'}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
