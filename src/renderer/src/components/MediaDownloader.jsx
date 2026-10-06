import React, { useState, useEffect, useRef, useMemo } from 'react';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

// Material Icons from @mui/icons-material
import OndemandVideoRounded from '@mui/icons-material/OndemandVideoRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import FolderRounded from '@mui/icons-material/FolderRounded';
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded';
import ContentPasteRounded from '@mui/icons-material/ContentPasteRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import MusicNoteRounded from '@mui/icons-material/MusicNoteRounded';
import MovieRounded from '@mui/icons-material/MovieRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import ClearRounded from '@mui/icons-material/ClearRounded';
import VideoLibraryRounded from '@mui/icons-material/VideoLibraryRounded';
import PlaylistPlayRounded from '@mui/icons-material/PlaylistPlayRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import PlaylistAddCheckRounded from '@mui/icons-material/PlaylistAddCheckRounded';
import CheckBoxOutlineBlankRounded from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import CheckBoxRounded from '@mui/icons-material/CheckBoxRounded';
import IndeterminateCheckBoxRounded from '@mui/icons-material/IndeterminateCheckBoxRounded';
import CreateNewFolderRounded from '@mui/icons-material/CreateNewFolderRounded';
import ExploreRounded from '@mui/icons-material/ExploreRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';

import { formatBytes } from '../utils/formatters';

// Curated format options available for each individual item in batch mode
export const BATCH_FORMAT_OPTIONS = [
  {
    id: 'video_1080p',
    label: '1080p Full HD (MP4)',
    badge: '1080p',
    ext: 'mp4',
    audioOnly: false,
    formatSelector: 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
  },
  {
    id: 'best_quality',
    label: 'Best Available (Max MP4)',
    badge: 'MAX',
    ext: 'mp4',
    audioOnly: false,
    formatSelector: 'bestvideo+bestaudio/best'
  },
  {
    id: 'video_720p',
    label: '720p HD (MP4)',
    badge: '720p',
    ext: 'mp4',
    audioOnly: false,
    formatSelector: 'bestvideo[height<=720]+bestaudio/best[height<=720]/best'
  },
  {
    id: 'video_480p',
    label: '480p SD (MP4)',
    badge: '480p',
    ext: 'mp4',
    audioOnly: false,
    formatSelector: 'bestvideo[height<=480]+bestaudio/best[height<=480]/best'
  },
  {
    id: 'video_360p',
    label: '360p Mobile (MP4)',
    badge: '360p',
    ext: 'mp4',
    audioOnly: false,
    formatSelector: 'bestvideo[height<=360]+bestaudio/best[height<=360]/best'
  },
  {
    id: 'audio_mp3_best',
    label: 'MP3 Audio (320kbps)',
    badge: 'MP3',
    ext: 'mp3',
    audioOnly: true,
    audioFormat: 'mp3',
    formatSelector: 'bestaudio/best'
  },
  {
    id: 'audio_m4a_best',
    label: 'M4A Audio (AAC)',
    badge: 'M4A',
    ext: 'm4a',
    audioOnly: true,
    audioFormat: 'm4a',
    formatSelector: 'bestaudio[ext=m4a]/bestaudio/best'
  },
  {
    id: 'audio_wav_lossless',
    label: 'WAV Lossless Audio',
    badge: 'WAV',
    ext: 'wav',
    audioOnly: true,
    audioFormat: 'wav',
    formatSelector: 'bestaudio/best'
  }
];

export default function MediaDownloader({
  defaultSavePath,
  onNavigateToDownloads,
  activeCount = 0
}) {
  // Navigation Tabs: 'browse' | 'single' | 'batch'
  const [activeTab, setActiveTab] = useState('browse');

  // Shared Global Save Path across single & batch mode
  const [savePath, setSavePath] = useState(defaultSavePath || '');

  // ----------------------------------------------------
  // BROWSE / SEARCH MODE STATE
  // ----------------------------------------------------
  const [browseQuery, setBrowseQuery] = useState('');
  const [isSearchingBrowse, setIsSearchingBrowse] = useState(false);
  const [browseResults, setBrowseResults] = useState([]);
  const [browseError, setBrowseError] = useState(null);
  const [lastSearchedTerm, setLastSearchedTerm] = useState('');
  const [addedToBatchMap, setAddedToBatchMap] = useState({});
  const browseInputRef = useRef(null);

  // ----------------------------------------------------
  // SINGLE MODE STATE
  // ----------------------------------------------------
  const [urlInput, setUrlInput] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [downloadMode, setDownloadMode] = useState('video'); // 'video' | 'audio'
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  const [successModal, setSuccessModal] = useState({
    open: false,
    taskInfo: null
  });

  const singleInputRef = useRef(null);

  // ----------------------------------------------------
  // BATCH MODE STATE
  // ----------------------------------------------------
  const [batchUrlInput, setBatchUrlInput] = useState('');
  const [isBatchProbing, setIsBatchProbing] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState('');
  const [batchError, setBatchError] = useState(null);
  const [batchItems, setBatchItems] = useState([]);
  const [playlistTitle, setPlaylistTitle] = useState(null);
  const [batchFolderName, setBatchFolderName] = useState('');
  const [isStartingBatchDownload, setIsStartingBatchDownload] = useState(false);
  const [batchSuccessModal, setBatchSuccessModal] = useState({
    open: false,
    count: 0,
    savePath: ''
  });

  const batchInputRef = useRef(null);

  // Computes the effective target directory for batch downloads including the subfolder if specified
  const effectiveBatchSavePath = useMemo(() => {
    const base = (savePath || defaultSavePath || '').trim();
    const sub = (batchFolderName || '').trim().replace(/^[/\\|]+|[/\\|]+$/g, '');
    if (!sub) return base;
    const sep = base.includes('\\') ? '\\' : '/';
    return `${base}${sep}${sub}`;
  }, [savePath, defaultSavePath, batchFolderName]);

  useEffect(() => {
    if (defaultSavePath && !savePath) {
      setSavePath(defaultSavePath);
    }
  }, [defaultSavePath]);

  // Global Browse Directory Handler
  const handleBrowseDirectory = async () => {
    try {
      if (window.electronAPI?.browseDirectory) {
        const selected = await window.electronAPI.browseDirectory(savePath || defaultSavePath);
        if (selected) {
          setSavePath(selected);
        }
      }
    } catch (e) {
      console.error('Directory browse failed:', e);
    }
  };

  // ----------------------------------------------------
  // BROWSE / SEARCH MODE LOGIC
  // ----------------------------------------------------
  const handleBrowseSearch = async (overrideTerm) => {
    const term = (overrideTerm !== undefined ? overrideTerm : browseQuery).trim();
    if (!term) return;

    if (overrideTerm !== undefined) {
      setBrowseQuery(overrideTerm);
    }

    setIsSearchingBrowse(true);
    setBrowseError(null);

    try {
      if (!window.electronAPI?.searchMedia) {
        throw new Error('Search API is not available.');
      }
      const data = await window.electronAPI.searchMedia(term, 24);
      setBrowseResults(data?.results || []);
      setLastSearchedTerm(term);
    } catch (err) {
      console.error('Browse search failed:', err);
      setBrowseError(err.message || 'Failed to search YouTube videos.');
    } finally {
      setIsSearchingBrowse(false);
    }
  };

  const handleSelectVideoForSingle = (video) => {
    if (!video || !video.url) return;
    setUrlInput(video.url);
    setActiveTab('single');
    handleSingleSearch(video.url);
  };

  const handleAddToBatch = (video, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (!video || !video.url) return;

    const newItem = {
      id: video.id || `batch_item_${Date.now()}`,
      url: video.url,
      title: video.title || 'Untitled Video',
      duration: video.duration || 0,
      durationFormatted: video.durationFormatted || '00:00',
      uploader: video.uploader || 'Creator',
      thumbnail: video.thumbnail || null,
      platform: video.platform || 'YouTube',
      sourcePlaylist: null,
      selected: true,
      selectedFormatId: 'video_1080p'
    };

    setBatchItems((prev) => {
      const exists = prev.some((i) => i.url === video.url || i.id === video.id);
      if (exists) return prev;
      return [...prev, newItem];
    });

    setAddedToBatchMap((prev) => ({
      ...prev,
      [video.id]: true
    }));
  };

  // ----------------------------------------------------
  // SINGLE MODE LOGIC
  // ----------------------------------------------------
  const handleSinglePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrlInput(text.trim());
          setErrorMsg(null);
          if (text.startsWith('http://') || text.startsWith('https://')) {
            handleSingleSearch(text.trim());
          }
        }
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const handleSingleSearch = async (targetUrl = urlInput) => {
    const trimmed = (targetUrl || urlInput).trim();
    if (!trimmed) {
      setErrorMsg('Please enter a media link from YouTube, TikTok, Facebook, Reddit, or another site.');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Please enter a valid URL starting with http:// or https://');
      return;
    }

    // Auto-detect YouTube playlist link in single mode: redirect to batch table!
    const isPlaylist = trimmed.includes('playlist?list=') || trimmed.includes('&list=') || trimmed.includes('/sets/');
    if (isPlaylist) {
      setActiveTab('batch');
      setBatchUrlInput(trimmed);
      handleExtractBatchWithUrl(trimmed);
      return;
    }

    setIsProbing(true);
    setErrorMsg(null);

    try {
      const res = await window.electronAPI.probeMedia(trimmed);
      if (!res) {
        throw new Error('Unable to retrieve media information from this URL.');
      }
      if (res.error) {
        throw new Error(res.error);
      }

      const info = res.data || res;
      if (!info || (!info.title && !info.videoPresets)) {
        throw new Error(res.error || 'Unable to retrieve media information from this URL.');
      }

      setProbeResult(info);

      const videoList = Array.isArray(info.videoPresets) ? info.videoPresets : [];
      const recommendedVideo = videoList.find((p) => p.recommended) || videoList[0];
      if (recommendedVideo) {
        setSelectedPresetId(recommendedVideo.id);
      }

      const safeTitle = (info.title || 'media_video').replace(/[/\\?%*:|"<>]/g, '_').trim();
      setCustomFileName(`${safeTitle}.mp4`);
    } catch (err) {
      console.error('Probe failed:', err);
      setErrorMsg(err.message || 'Failed to inspect media URL.');
      setProbeResult(null);
    } finally {
      setIsProbing(false);
    }
  };

  const currentPresets = downloadMode === 'video'
    ? probeResult?.videoPresets || []
    : probeResult?.audioPresets || [];

  const selectedPreset = currentPresets.find((p) => p.id === selectedPresetId);

  useEffect(() => {
    if (!probeResult) return;
    const safeTitle = (probeResult.title || 'download').replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (downloadMode === 'audio') {
      setCustomFileName(`${safeTitle}.mp3`);
    } else {
      setCustomFileName(`${safeTitle}.mp4`);
    }
  }, [downloadMode, probeResult]);

  const handleStartDownload = async () => {
    if (!probeResult || !urlInput.trim()) return;

    setIsStartingDownload(true);
    setErrorMsg(null);

    try {
      const chosenPreset = selectedPreset || currentPresets[0];
      const ext = downloadMode === 'audio' ? (chosenPreset?.audioFormat || 'mp3') : (chosenPreset?.ext || 'mp4');
      let finalName = (customFileName || probeResult.title || 'media_file').trim();
      if (!finalName.toLowerCase().endsWith(`.${ext}`)) {
        finalName = `${finalName}.${ext}`;
      }

      const payload = {
        url: probeResult.url || urlInput.trim(),
        title: probeResult.title,
        fileName: finalName,
        savePath: savePath || defaultSavePath,
        thumbnail: probeResult.thumbnail,
        duration: probeResult.duration,
        formatSelector: chosenPreset?.formatSelector || (downloadMode === 'audio' ? 'bestaudio/best' : 'bestvideo+bestaudio/best'),
        downloadMode: downloadMode,
        audioOnly: downloadMode === 'audio',
        audioFormat: chosenPreset?.audioFormat || 'mp3',
        ext: ext,
        formatLabel: chosenPreset?.label,
        uploader: probeResult.uploader,
        platform: probeResult.platform,
        customFolderSelected: Boolean(savePath)
      };

      const downloadFn = window.electronAPI?.addMediaDownload || window.electronAPI?.startMediaDownload;
      if (!downloadFn) {
        throw new Error('Media download API not available in electronAPI');
      }

      const res = await downloadFn(payload);
      if (!res) {
        throw new Error('Failed to initialize download task.');
      }
      if (res.error) {
        throw new Error(res.error);
      }

      const task = res.task || res;

      setSuccessModal({
        open: true,
        taskInfo: {
          title: probeResult.title,
          thumbnail: probeResult.thumbnail,
          formatLabel: chosenPreset?.label,
          savePath: payload.savePath,
          fileName: finalName,
          taskId: task?.id
        }
      });
    } catch (err) {
      console.error('Download start error:', err);
      setErrorMsg(`Failed to start download: ${err.message}`);
    } finally {
      setIsStartingDownload(false);
    }
  };

  const handleOpenSource = (linkUrl) => {
    const link = linkUrl || probeResult?.url || urlInput;
    if (link && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(link);
    }
  };

  // ----------------------------------------------------
  // BATCH MODE LOGIC
  // ----------------------------------------------------
  const handleBatchPaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setBatchUrlInput(prev => prev ? `${prev}\n${text.trim()}` : text.trim());
          setBatchError(null);
        }
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const handleExtractBatchWithUrl = async (urlsText) => {
    const trimmed = (urlsText || batchUrlInput).trim();
    if (!trimmed) {
      setBatchError('Please enter one or more media links or a playlist URL.');
      return;
    }

    setIsBatchProbing(true);
    setBatchError(null);
    setBatchProgressText('Extracting playlist and media streams... Please wait.');

    try {
      const lines = trimmed
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      const probeBatchFn = window.electronAPI?.probeBatchMedia || window.electronAPI?.probePlaylist;
      if (!probeBatchFn) {
        throw new Error('Batch media extraction API is not available.');
      }

      const res = await probeBatchFn(lines);
      if (!res || !Array.isArray(res.entries) || res.entries.length === 0) {
        throw new Error('No downloadable media items found in the provided link(s).');
      }

      const newItems = res.entries.map((entry, idx) => ({
        id: entry.id || `batch_item_${Date.now()}_${idx}`,
        url: entry.url,
        title: entry.title || `Media Track ${idx + 1}`,
        duration: entry.duration || 0,
        durationFormatted: entry.durationFormatted || '00:00',
        uploader: entry.uploader || 'Creator',
        thumbnail: entry.thumbnail || null,
        platform: entry.platform || 'Web',
        sourcePlaylist: entry.sourcePlaylist || null,
        selected: true, // Default to checked
        selectedFormatId: 'video_1080p' // Default format preset
      }));

      // Append or replace
      setBatchItems(prev => {
        // Keep existing non-duplicates
        const existingIds = new Set(prev.map(i => i.url || i.id));
        const filteredNew = newItems.filter(i => !existingIds.has(i.url || i.id));
        return [...prev, ...filteredNew];
      });

      if (res.title) {
        setPlaylistTitle(res.title);
        setBatchFolderName(prev => prev || res.title.replace(/[/\\?%*:|"<>]/g, '').trim());
      } else {
        const detectedPlaylist = res.entries.find(e => e.sourcePlaylist)?.sourcePlaylist;
        if (detectedPlaylist) {
          setPlaylistTitle(detectedPlaylist);
          setBatchFolderName(prev => prev || detectedPlaylist.replace(/[/\\?%*:|"<>]/g, '').trim());
        } else if (lines.length === 1 && lines[0].includes('list=')) {
          setPlaylistTitle('YouTube Playlist');
          setBatchFolderName(prev => prev || 'YouTube Playlist');
        }
      }

      setBatchUrlInput('');
    } catch (err) {
      console.error('Batch extraction error:', err);
      setBatchError(err.message || 'Failed to extract media items.');
    } finally {
      setIsBatchProbing(false);
      setBatchProgressText('');
    }
  };

  // Row selection helpers
  const selectedCount = useMemo(() => {
    return batchItems.filter(i => i.selected).length;
  }, [batchItems]);

  const handleToggleAll = () => {
    const allSelected = batchItems.length > 0 && selectedCount === batchItems.length;
    setBatchItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const handleToggleRow = (id) => {
    setBatchItems(prev => prev.map(item => (
      item.id === id ? { ...item, selected: !item.selected } : item
    )));
  };

  // Row format selection helper
  const handleFormatChangeForRow = (id, newFormatId) => {
    setBatchItems(prev => prev.map(item => (
      item.id === id ? { ...item, selectedFormatId: newFormatId } : item
    )));
  };

  // Bulk format application
  const handleBulkApplyFormat = (formatId) => {
    setBatchItems(prev => prev.map(item => {
      // apply to selected items (or all if none selected)
      if (selectedCount === 0 || item.selected) {
        return { ...item, selectedFormatId: formatId };
      }
      return item;
    }));
  };

  // Row removal
  const handleRemoveRow = (id) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  // Start Batch Download
  const handleStartBatchDownload = async () => {
    const selectedItems = batchItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setBatchError('Please select at least one item from the table to download.');
      return;
    }

    setIsStartingBatchDownload(true);
    setBatchError(null);

    const targetSavePath = effectiveBatchSavePath || defaultSavePath;

    try {
      const tasks = selectedItems.map(item => {
        const chosenFormat = BATCH_FORMAT_OPTIONS.find(f => f.id === item.selectedFormatId) || BATCH_FORMAT_OPTIONS[0];
        const ext = chosenFormat.audioOnly ? (chosenFormat.audioFormat || 'mp3') : (chosenFormat.ext || 'mp4');
        const safeTitle = (item.title || 'media_file').replace(/[/\\?%*:|"<>]/g, '_').trim();
        const finalFileName = `${safeTitle}.${ext}`;

        return {
          url: item.url,
          title: item.title,
          fileName: finalFileName,
          savePath: targetSavePath,
          thumbnail: item.thumbnail,
          duration: item.duration,
          formatSelector: chosenFormat.formatSelector,
          downloadMode: chosenFormat.audioOnly ? 'audio' : 'video',
          audioOnly: chosenFormat.audioOnly,
          audioFormat: chosenFormat.audioFormat || 'mp3',
          ext: ext,
          formatLabel: chosenFormat.label,
          uploader: item.uploader,
          platform: item.platform,
          customFolderSelected: true
        };
      });

      const addBatchFn = window.electronAPI?.addBatchMediaDownloads;
      let addedCount = 0;

      if (addBatchFn) {
        const res = await addBatchFn(tasks);
        addedCount = res?.added || (Array.isArray(res) ? res.length : tasks.length);
      } else {
        // Fallback: loop addMediaDownload
        const addSingleFn = window.electronAPI?.addMediaDownload || window.electronAPI?.startMediaDownload;
        for (const t of tasks) {
          try {
            await addSingleFn(t);
            addedCount++;
          } catch (e) {
            console.error('Error queuing item in batch:', e);
          }
        }
      }

      setBatchSuccessModal({
        open: true,
        count: addedCount,
        savePath: targetSavePath
      });
    } catch (err) {
      console.error('Batch download start error:', err);
      setBatchError(`Failed to queue batch downloads: ${err.message}`);
    } finally {
      setIsStartingBatchDownload(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] select-none transition-colors">
      {/* Unified Minimal Header Bar */}
      <div className="px-4 sm:px-6 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-surface)] shrink-0 gap-4">
        {/* Left: Title & Tabs next to each other */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="flex items-center gap-2.5 shrink-0 py-2.5">
            <OndemandVideoRounded className="!text-lg text-[var(--theme-primary)]" />
            <h1 className="text-sm font-bold text-[var(--theme-text-primary)] tracking-wide hidden sm:inline">
              Media Downloader
            </h1>
          </div>

          <div className="h-4 w-[1px] bg-[var(--theme-border)] hidden sm:block" />

          {/* Material UI Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_e, val) => setActiveTab(val)}
            textColor="inherit"
            TabIndicatorProps={{
              style: {
                backgroundColor: 'var(--theme-primary)',
                height: '3px',
                borderRadius: '3px 3px 0 0'
              }
            }}
            sx={{
              minHeight: 46,
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--theme-primary)'
              },
              '& .MuiTab-root': {
                minHeight: 46,
                py: 0.5,
                px: { xs: 1.5, sm: 2.5 },
                fontSize: '0.8125rem',
                fontWeight: 600,
                textTransform: 'none',
                color: 'var(--theme-text-muted)',
                transition: 'color 0.15s ease',
                '&:hover': {
                  color: 'var(--theme-text-primary)'
                },
                '&.Mui-selected': {
                  color: 'var(--theme-primary)',
                  fontWeight: 700
                }
              }
            }}
          >
            <Tab
              value="browse"
              label="Browse"
              icon={<ExploreRounded className="!text-base" />}
              iconPosition="start"
            />
            <Tab
              value="single"
              label="Single Video"
              icon={<OndemandVideoRounded className="!text-base" />}
              iconPosition="start"
            />
            <Tab
              value="batch"
              label={
                <div className="flex items-center gap-1.5">
                  <span>Batch & Playlist</span>
                  {batchItems.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] font-bold border border-[var(--theme-border-accent)]">
                      {batchItems.length}
                    </span>
                  )}
                </div>
              }
              icon={<PlaylistPlayRounded className="!text-lg" />}
              iconPosition="start"
            />
          </Tabs>
        </div>

        {/* Right: Active transfers indicator & Close */}
        <div className="flex items-center gap-3 shrink-0">
          {activeCount > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-primary)]" />
              </span>
              <span>{activeCount} active transfer{activeCount === 1 ? '' : 's'}</span>
            </div>
          )}

          <Tooltip title="Close" arrow>
            <IconButton
              size="small"
              onClick={onNavigateToDownloads}
              className="!p-1.5 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-hover)] transition-colors"
            >
              <CloseRounded className="!text-lg" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 w-full ${activeTab === 'batch' && batchItems.length > 0 ? 'overflow-hidden flex flex-col min-h-0 p-3 sm:p-4 lg:p-5' : 'overflow-y-auto p-3 sm:p-5 lg:p-6'}`}>
        <div className={`w-full max-w-6xl mx-auto ${activeTab === 'batch' && batchItems.length > 0 ? 'flex-1 min-h-0 flex flex-col gap-3' : 'space-y-4 sm:space-y-6'}`}>

        {/* ============================================================== */}
        {/* BROWSE & SEARCH MODE VIEW                                      */}
        {/* ============================================================== */}
        {activeTab === 'browse' && (
          <div className="space-y-5">
            {/* Minimal Unified Search Bar with Material UI TextField */}
            <TextField
              fullWidth
              inputRef={browseInputRef}
              value={browseQuery}
              onChange={(e) => {
                setBrowseQuery(e.target.value);
                setBrowseError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBrowseSearch();
              }}
              placeholder="Search YouTube videos (e.g. avengers, lo-fi beats, gaming, trailers)..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 1, ml: 0.5 }}>
                    <SearchRounded className="!text-xl text-[var(--theme-text-muted)]" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={{ ml: 1, gap: 0.75 }}>
                    {browseQuery && (
                      <Tooltip title="Clear" arrow>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setBrowseQuery('');
                            setBrowseError(null);
                          }}
                          className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] !p-1.5"
                        >
                          <ClearRounded className="!text-base" />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleBrowseSearch()}
                      disabled={isSearchingBrowse || !browseQuery.trim()}
                      startIcon={
                        isSearchingBrowse ? (
                          <CircularProgress size={13} sx={{ color: '#ffffff !important' }} />
                        ) : (
                          <SearchRounded className="!text-sm !text-white" sx={{ color: '#ffffff !important' }} />
                        )
                      }
                      className="btn-theme-primary !text-white !font-bold !text-xs !py-2 !px-4 !rounded-lg !normal-case shadow-sm whitespace-nowrap shrink-0"
                      sx={{
                        color: '#ffffff !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'var(--theme-primary) !important',
                        '&, & *, & .MuiButton-startIcon, & .MuiSvgIcon-root': {
                          color: '#ffffff !important',
                          WebkitTextFillColor: '#ffffff !important'
                        },
                        '&:hover': {
                          backgroundColor: 'var(--theme-primary-hover) !important'
                        }
                      }}
                    >
                      <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                        {isSearchingBrowse ? 'Searching...' : 'Search'}
                      </span>
                    </Button>
                  </InputAdornment>
                ),
                className: '!bg-[var(--theme-bg-input)] !text-xs sm:!text-sm !text-[var(--theme-text-primary)] !rounded-xl'
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.75rem',
                  backgroundColor: 'var(--theme-bg-input)',
                  pl: '14px',
                  pr: '6px',
                  py: '4px',
                  minHeight: '48px',
                  '& fieldset': {
                    borderColor: 'var(--theme-border)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--theme-border-accent)'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--theme-primary)',
                    boxShadow: '0 0 0 2px var(--theme-secondary-subtle)'
                  },
                  '& .MuiOutlinedInput-input': {
                    py: '8px',
                    px: '4px',
                    fontSize: '0.85rem',
                    color: 'var(--theme-text-primary)'
                  }
                }
              }}
            />

            {/* Quick Keyword Pills */}
            <div className="flex items-center gap-1.5 flex-wrap px-1">
              <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] mr-1">
                Popular:
              </span>
              {['Avengers', 'Lo-Fi Chill', '4K Nature HDR', 'Movie Trailers', 'Gaming Highlights', 'Podcast', 'Cyberpunk Music'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleBrowseSearch(tag)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[var(--theme-bg-surface)] hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-primary)] border border-[var(--theme-border)] hover:border-[var(--theme-border-accent)] transition-all cursor-pointer font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Search Error Alert */}
            {browseError && (
              <Alert
                severity="error"
                icon={<WarningAmberRounded className="!text-lg" />}
                action={
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => setBrowseError(null)}
                    className="!p-1"
                  >
                    <CloseRounded className="!text-base" />
                  </IconButton>
                }
                className="!rounded-xl !border !border-rose-400/50 !bg-rose-500/10 !text-rose-600 dark:!text-rose-200 shadow-sm"
              >
                <AlertTitle className="!font-bold !text-xs !mb-0.5">Search Notice</AlertTitle>
                <div className="!text-xs leading-relaxed">{browseError}</div>
              </Alert>
            )}

            {/* Searching Progress Indicator */}
            {isSearchingBrowse && (
              <div className="p-8 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-surface)] text-center space-y-3 animate-pulse shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center mx-auto text-[var(--theme-primary)]">
                  <SearchRounded className="!text-2xl animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
                    Searching YouTube Videos...
                  </h3>
                  <p className="text-xs text-[var(--theme-text-muted)]">
                    Querying live video streams, thumbnails, and creator details for "{browseQuery}"...
                  </p>
                </div>
              </div>
            )}

            {/* Results Counter & Actions Bar */}
            {!isSearchingBrowse && browseResults.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--theme-text-primary)]">
                    Found {browseResults.length} videos
                  </span>
                  {lastSearchedTerm && (
                    <span className="text-xs text-[var(--theme-text-muted)]">
                      for <span className="text-[var(--theme-primary)] font-semibold">"{lastSearchedTerm}"</span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--theme-text-muted)] hidden sm:inline">
                  Click card to download single • Click <span className="font-bold text-[var(--theme-primary)]">+</span> on thumbnail to queue in batch
                </span>
              </div>
            )}

            {/* Results Grid */}
            {!isSearchingBrowse && browseResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {browseResults.map((video) => {
                  const isAdded = Boolean(addedToBatchMap[video.id]) || batchItems.some((i) => i.url === video.url);

                  return (
                    <div
                      key={video.id}
                      onClick={() => handleSelectVideoForSingle(video)}
                      className="group relative flex flex-col rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-bg-card)] hover:border-[var(--theme-border-accent)] hover:shadow-xl transition-all duration-200 cursor-pointer"
                    >
                      {/* Video Thumbnail */}
                      <div className="aspect-video relative overflow-hidden bg-black/60 shrink-0">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--theme-text-muted)]">
                            <OndemandVideoRounded className="!text-3xl" />
                          </div>
                        )}

                        {/* Duration Badge */}
                        {video.duration > 0 && (
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono font-bold text-white tracking-tighter backdrop-blur-sm shadow-sm pointer-events-none">
                            {video.durationFormatted}
                          </span>
                        )}

                        {/* Top-Right: Quick "+" Add to Batch Button */}
                        <div className="absolute top-1.5 right-1.5 z-10">
                          <Tooltip
                            title={isAdded ? 'Added to Batch queue!' : 'Add to Batch queue'}
                            arrow
                          >
                            <IconButton
                              size="small"
                              onClick={(e) => handleAddToBatch(video, e)}
                              className={`!p-1.5 !rounded-lg !backdrop-blur-md !shadow-md transition-all ${
                                isAdded
                                  ? '!bg-emerald-600 !text-white hover:!bg-emerald-700'
                                  : '!bg-black/75 hover:!bg-[var(--theme-primary)] !text-white hover:scale-110'
                              }`}
                            >
                              {isAdded ? (
                                <CheckRounded className="!text-sm" />
                              ) : (
                                <AddRounded className="!text-sm" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Video Details */}
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                        <div className="space-y-1">
                          <h4
                            className="text-xs font-bold text-[var(--theme-text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--theme-primary)] transition-colors"
                            title={video.title}
                          >
                            {video.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--theme-text-muted)]">
                            <PersonRounded className="!text-xs shrink-0 opacity-70" />
                            <span className="truncate">{video.uploader || 'YouTube Creator'}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[var(--theme-border)] text-[10px] text-[var(--theme-text-muted)]">
                          <span>{video.viewsFormatted || 'YouTube Video'}</span>
                          <span className="text-[var(--theme-primary)] font-semibold group-hover:underline">
                            Inspect & Download →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State before any search */}
            {!isSearchingBrowse && browseResults.length === 0 && (
              <div className="p-8 sm:p-12 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-surface)] text-center space-y-4 max-w-2xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center mx-auto text-[var(--theme-primary)] shadow-sm">
                  <ExploreRounded className="!text-3xl" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[var(--theme-text-primary)]">
                    Explore & Search YouTube Videos
                  </h3>
                  <p className="text-xs text-[var(--theme-text-muted)] max-w-md mx-auto leading-relaxed">
                    Search for any movie trailer, musician, topic, or keyword. Click any video to inspect available resolutions or click the <strong>+</strong> button on any thumbnail to build a Batch download queue.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SINGLE MODE VIEW                                               */}
        {/* ============================================================== */}
        {activeTab === 'single' && (
          <>
            {/* Minimal Unified Search Bar with Material UI TextField */}
            <TextField
              fullWidth
              inputRef={singleInputRef}
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSingleSearch();
              }}
              placeholder="Paste media link (YouTube, TikTok, Facebook, Reddit, Instagram, etc.)..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 1, ml: 0.5 }}>
                    <SearchRounded className="!text-xl text-[var(--theme-text-muted)]" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={{ ml: 1, gap: 0.75 }}>
                    {urlInput ? (
                      <Tooltip title="Clear URL" arrow>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setUrlInput('');
                            setErrorMsg(null);
                            setProbeResult(null);
                          }}
                          className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] !p-1.5"
                        >
                          <ClearRounded className="!text-base" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Button
                        size="small"
                        onClick={handleSinglePaste}
                        startIcon={<ContentPasteRounded className="!text-sm text-[var(--theme-primary)]" />}
                        className="!text-xs !py-1.5 !px-2.5 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !normal-case shrink-0"
                      >
                        Paste
                      </Button>
                    )}

                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleSingleSearch()}
                      disabled={isProbing || !urlInput.trim()}
                      startIcon={
                        isProbing ? (
                          <CircularProgress size={13} sx={{ color: '#ffffff !important' }} />
                        ) : (
                          <SearchRounded className="!text-sm !text-white" sx={{ color: '#ffffff !important' }} />
                        )
                      }
                      className="btn-theme-primary !text-white !font-bold !text-xs !py-2 !px-4 !rounded-lg !normal-case shadow-sm whitespace-nowrap shrink-0"
                      sx={{
                        color: '#ffffff !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'var(--theme-primary) !important',
                        '&, & *, & .MuiButton-startIcon, & .MuiSvgIcon-root': {
                          color: '#ffffff !important',
                          WebkitTextFillColor: '#ffffff !important'
                        },
                        '&:hover': {
                          backgroundColor: 'var(--theme-primary-hover) !important'
                        }
                      }}
                    >
                      <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                        {isProbing ? 'Analyzing...' : 'Search'}
                      </span>
                    </Button>
                  </InputAdornment>
                ),
                className: '!bg-[var(--theme-bg-input)] !text-xs sm:!text-sm !text-[var(--theme-text-primary)] !rounded-xl'
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.75rem',
                  backgroundColor: 'var(--theme-bg-input)',
                  pl: '14px',
                  pr: '6px',
                  py: '4px',
                  minHeight: '48px',
                  '& fieldset': {
                    borderColor: 'var(--theme-border)'
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--theme-border-accent)'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'var(--theme-primary)',
                    boxShadow: '0 0 0 2px var(--theme-secondary-subtle)'
                  },
                  '& .MuiOutlinedInput-input': {
                    py: '8px',
                    px: '4px',
                    fontSize: '0.85rem',
                    color: 'var(--theme-text-primary)'
                  }
                }
              }}
            />

            {/* Probing Progress Indicator */}
            {isProbing && (
              <div className="p-6 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-surface)] text-center space-y-3 animate-pulse shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center mx-auto text-[var(--theme-primary)]">
                  <AutoAwesomeRounded className="!text-2xl animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">Analyzing Media Link...</h3>
                  <p className="text-xs text-[var(--theme-text-muted)]">
                    Extracting video title, high-resolution thumbnail, and available stream qualities...
                  </p>
                </div>
              </div>
            )}

            {/* Error Alert Box */}
            {errorMsg && (
              <Alert
                severity="error"
                icon={<WarningAmberRounded className="!text-lg" />}
                action={
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => setErrorMsg(null)}
                    className="!p-1"
                  >
                    <CloseRounded className="!text-base" />
                  </IconButton>
                }
                className="!rounded-xl !border !border-rose-400/50 !bg-rose-500/10 !text-rose-600 dark:!text-rose-200 shadow-sm"
              >
                <AlertTitle className="!font-bold !text-xs !mb-0.5">Extraction Error</AlertTitle>
                <div className="!text-xs leading-relaxed">{errorMsg}</div>
              </Alert>
            )}

            {/* Media Details & Download Card */}
            {probeResult && !isProbing && (
              <div className="media-downloader-card rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-card)] overflow-hidden shadow-md space-y-0 transition-colors">
                {/* Top Subheader with Video Title */}
                <div className="media-downloader-card-header p-4 sm:p-5 border-b border-[var(--theme-border)] bg-[var(--theme-bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border border-[var(--theme-border-accent)] uppercase tracking-wider">
                        {probeResult.platform || 'Video'}
                      </span>
                      {probeResult.durationFormatted && (
                        <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] flex items-center gap-1">
                          <AccessTimeRounded className="!text-xs text-[var(--theme-text-muted)]" />
                          {probeResult.durationFormatted}
                        </span>
                      )}
                      {probeResult.viewCount && (
                        <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] flex items-center gap-1">
                          <VisibilityRounded className="!text-xs text-[var(--theme-text-muted)]" />
                          {probeResult.viewCount.toLocaleString()} views
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-[var(--theme-text-primary)] line-clamp-2 select-text" title={probeResult.title}>
                      {probeResult.title}
                    </h2>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenSource()}
                      startIcon={<OpenInNewRounded className="!text-sm text-[var(--theme-text-muted)]" />}
                      className="btn-theme-outlined !text-xs !py-1 !px-2.5 !rounded-lg !normal-case"
                    >
                      Watch in Browser
                    </Button>
                  </div>
                </div>

                {/* Main Details Body */}
                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                  {/* Left Column: Thumbnail & Metadata */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-[var(--theme-border)] bg-black aspect-video group shadow-sm">
                      {probeResult.thumbnail ? (
                        <img
                          src={probeResult.thumbnail}
                          alt={probeResult.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[var(--theme-text-muted)]">
                          <OndemandVideoRounded className="!text-5xl" />
                          <span className="text-xs mt-1">No Thumbnail Available</span>
                        </div>
                      )}

                      {probeResult.durationFormatted && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[11px] font-mono font-bold text-white border border-white/10">
                          {probeResult.durationFormatted}
                        </div>
                      )}

                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
                        {probeResult.platform}
                      </div>
                    </div>

                    {/* Creator & Platform Info */}
                    <div className="media-downloader-section p-3 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center shrink-0">
                          <PersonRounded className="!text-base text-[var(--theme-primary)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold">Creator / Channel</div>
                          <div className="font-semibold text-[var(--theme-text-primary)] truncate" title={probeResult.uploader}>
                            {probeResult.uploader || 'Unknown Channel'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Download Configuration */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Mode Selector: Video vs Audio */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">
                        Download Mode
                      </div>
                      <div className="media-downloader-section grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border)]">
                        <Button
                          variant={downloadMode === 'video' ? 'contained' : 'text'}
                          onClick={() => {
                            setDownloadMode('video');
                            const def = probeResult?.videoPresets?.find((p) => p.recommended) || probeResult?.videoPresets?.[0];
                            if (def) setSelectedPresetId(def.id);
                          }}
                          startIcon={<MovieRounded className="!text-base" sx={downloadMode === 'video' ? { color: '#ffffff !important' } : {}} />}
                          className={`!py-2 !rounded-lg !text-xs !font-bold !normal-case transition-all ${
                            downloadMode === 'video'
                              ? 'btn-theme-primary !text-white shadow-md'
                              : '!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)]'
                          }`}
                          sx={
                            downloadMode === 'video'
                              ? {
                                  color: '#ffffff !important',
                                  WebkitTextFillColor: '#ffffff !important',
                                  '& *': {
                                    color: '#ffffff !important',
                                    WebkitTextFillColor: '#ffffff !important'
                                  }
                                }
                              : {}
                          }
                        >
                          <span style={downloadMode === 'video' ? { color: '#ffffff', WebkitTextFillColor: '#ffffff' } : {}}>
                            Video (MP4)
                          </span>
                        </Button>

                        <Button
                          variant={downloadMode === 'audio' ? 'contained' : 'text'}
                          onClick={() => {
                            setDownloadMode('audio');
                            const def = probeResult?.audioPresets?.[0];
                            if (def) setSelectedPresetId(def.id);
                          }}
                          startIcon={<MusicNoteRounded className="!text-base" sx={downloadMode === 'audio' ? { color: '#ffffff !important' } : {}} />}
                          className={`!py-2 !rounded-lg !text-xs !font-bold !normal-case transition-all ${
                            downloadMode === 'audio'
                              ? 'btn-theme-primary !text-white shadow-md'
                              : '!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)]'
                          }`}
                          sx={
                            downloadMode === 'audio'
                              ? {
                                  color: '#ffffff !important',
                                  WebkitTextFillColor: '#ffffff !important',
                                  '& *': {
                                    color: '#ffffff !important',
                                    WebkitTextFillColor: '#ffffff !important'
                                  }
                                }
                              : {}
                          }
                        >
                          <span style={downloadMode === 'audio' ? { color: '#ffffff', WebkitTextFillColor: '#ffffff' } : {}}>
                            Audio Only (MP3)
                          </span>
                        </Button>
                      </div>
                    </div>

                    {/* Quality / Resolution Dropdown Selector */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">
                        <span>Select Quality / Format</span>
                        <span className="text-[10px] text-[var(--theme-text-muted)] normal-case">
                          {downloadMode === 'video' ? 'Audio stream auto-merged' : 'Extracted with ffmpeg'}
                        </span>
                      </div>

                      <FormControl fullWidth size="small">
                        <Select
                          value={selectedPresetId || ''}
                          onChange={(e) => setSelectedPresetId(e.target.value)}
                          displayEmpty
                          IconComponent={KeyboardArrowDownRounded}
                          className="!bg-[var(--theme-bg-input)] !text-xs sm:!text-sm !text-[var(--theme-text-primary)] !rounded-xl"
                          sx={{
                            borderRadius: '0.75rem',
                            backgroundColor: 'var(--theme-bg-input)',
                            '& fieldset': {
                              borderColor: 'var(--theme-border)'
                            },
                            '&:hover fieldset': {
                              borderColor: 'var(--theme-border-accent)'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'var(--theme-primary) !important',
                              boxShadow: '0 0 0 2px var(--theme-secondary-subtle)'
                            },
                            '& .MuiSelect-select': {
                              py: '9px',
                              px: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: 'var(--theme-text-primary)'
                            },
                            '& .MuiSvgIcon-root': {
                              color: 'var(--theme-text-muted)'
                            }
                          }}
                          MenuProps={{
                            PaperProps: {
                              className:
                                '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-xl !shadow-2xl !max-h-72',
                              sx: {
                                backgroundColor: 'var(--theme-bg-card)',
                                borderColor: 'var(--theme-border-accent)',
                                '& .MuiMenuItem-root': {
                                  fontSize: '0.8rem',
                                  py: 1,
                                  px: 1.5,
                                  color: 'var(--theme-text-primary)',
                                  '&:hover': {
                                    backgroundColor: 'var(--theme-bg-hover)'
                                  },
                                  '&.Mui-selected': {
                                    backgroundColor: 'var(--theme-secondary-subtle) !important',
                                    color: 'var(--theme-primary) !important',
                                    fontWeight: 600,
                                    '&:hover': {
                                      backgroundColor: 'var(--theme-secondary-subtle) !important'
                                    }
                                  }
                                }
                              }
                            }
                          }}
                        >
                          {currentPresets &&
                            currentPresets.map((preset) => (
                              <MenuItem key={preset.id} value={preset.id}>
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {preset.badge && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border border-[var(--theme-border-accent)] shrink-0">
                                        {preset.badge}
                                      </span>
                                    )}
                                    <span className="truncate">{preset.label}</span>
                                    {preset.recommended && (
                                      <span className="text-[10px] text-amber-500 font-semibold shrink-0">
                                        ★ [Recommended]
                                      </span>
                                    )}
                                  </div>
                                  {preset.estimatedSize && (
                                    <span className="text-[11px] font-mono text-[var(--theme-text-muted)] shrink-0">
                                      ~{formatBytes(preset.estimatedSize)}
                                    </span>
                                  )}
                                </div>
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>

                      {selectedPreset && (
                        <div className="media-downloader-section mt-2 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border)] text-[11px]">
                          <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)] min-w-0">
                            <span className="font-semibold text-[var(--theme-text-primary)] truncate">
                              {selectedPreset.label}
                            </span>
                            {selectedPreset.recommended && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                                BEST CHOICE
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[var(--theme-text-muted)] shrink-0 ml-2">
                            {selectedPreset.estimatedSize
                              ? `~${formatBytes(selectedPreset.estimatedSize)}`
                              : (selectedPreset.resolution || 'Auto Stream')}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Destination Folder Row */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                        Destination Folder
                      </div>
                      <div className="flex items-center gap-2">
                        <TextField
                          fullWidth
                          size="small"
                          value={savePath}
                          onChange={(e) => setSavePath(e.target.value)}
                          title={savePath}
                          className="!bg-[var(--theme-bg-input)] !rounded-lg border border-[var(--theme-border)]"
                          inputProps={{
                            className: '!text-xs !text-[var(--theme-text-primary)] font-mono !py-2 !px-3'
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '0.5rem',
                              backgroundColor: 'var(--theme-bg-input)',
                              '& fieldset': {
                                borderColor: 'var(--theme-border)'
                              },
                              '&:hover fieldset': {
                                borderColor: 'var(--theme-border-accent)'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'var(--theme-primary)'
                              }
                            }
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleBrowseDirectory}
                          className="btn-theme-outlined !text-xs !py-2 !px-3.5 whitespace-nowrap !rounded-lg shrink-0 font-medium !normal-case"
                        >
                          <FolderOpenRounded className="!text-sm mr-1 text-[var(--theme-primary)]" />
                          <span>Browse</span>
                        </Button>
                      </div>
                    </div>

                    {/* File Name Row */}
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1">
                        File Name
                      </div>
                      <TextField
                        fullWidth
                        size="small"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        placeholder="File name..."
                        inputProps={{
                          className: '!text-xs !text-[var(--theme-text-primary)] !py-2 !px-3'
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '0.5rem',
                            backgroundColor: 'var(--theme-bg-input)',
                            '& fieldset': {
                              borderColor: 'var(--theme-border)'
                            },
                            '&:hover fieldset': {
                              borderColor: 'var(--theme-border-accent)'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'var(--theme-primary)',
                              boxShadow: '0 0 0 2px var(--theme-secondary-subtle)'
                            }
                          }
                        }}
                      />
                    </div>

                    {/* Primary CTA */}
                    <div className="pt-1">
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        onClick={handleStartDownload}
                        disabled={isStartingDownload}
                        startIcon={
                          isStartingDownload ? (
                            <CircularProgress size={16} sx={{ color: '#ffffff !important' }} />
                          ) : (
                            <DownloadRounded className="!text-lg !text-white" sx={{ color: '#ffffff !important' }} />
                          )
                        }
                        className="btn-theme-primary !text-white !font-bold !text-sm !py-3 !rounded-xl shadow-lg hover:shadow-xl transition-all !normal-case"
                        sx={{
                          color: '#ffffff !important',
                          WebkitTextFillColor: '#ffffff !important',
                          backgroundColor: 'var(--theme-primary) !important',
                          '&, & *, & .MuiButton-startIcon, & .MuiSvgIcon-root': {
                            color: '#ffffff !important',
                            WebkitTextFillColor: '#ffffff !important'
                          },
                          '&:hover': {
                            backgroundColor: 'var(--theme-primary-hover) !important'
                          }
                        }}
                      >
                        <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                          {isStartingDownload
                            ? 'Queuing Download...'
                            : `Download ${downloadMode === 'audio' ? 'Audio (MP3)' : 'Video'}`}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* BATCH & PLAYLIST MODE VIEW                                     */}
        {/* ============================================================== */}
        {activeTab === 'batch' && (
          <div className={batchItems.length > 0 ? 'flex-1 min-h-0 flex flex-col gap-3' : 'space-y-5'}>
            {/* Minimal Unified Search Bar with Material UI TextField (Matching Single Mode Design) */}
            <div className="shrink-0">
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={4}
                inputRef={batchInputRef}
                value={batchUrlInput}
                onChange={(e) => {
                  setBatchUrlInput(e.target.value);
                  setBatchError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExtractBatchWithUrl();
                  }
                }}
                placeholder="Paste YouTube playlist URL or multiple media links (one per line)..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 1, ml: 0.5 }}>
                      <PlaylistPlayRounded className="!text-xl text-[var(--theme-text-muted)]" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ ml: 1, gap: 0.75 }}>
                      {batchUrlInput ? (
                        <Tooltip title="Clear URLs" arrow>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setBatchUrlInput('');
                              setBatchError(null);
                            }}
                            className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] !p-1.5"
                          >
                            <ClearRounded className="!text-base" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Button
                          size="small"
                          onClick={handleBatchPaste}
                          startIcon={<ContentPasteRounded className="!text-sm text-[var(--theme-primary)]" />}
                          className="!text-xs !py-1.5 !px-2.5 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !normal-case shrink-0"
                        >
                          Paste
                        </Button>
                      )}

                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleExtractBatchWithUrl()}
                        disabled={isBatchProbing || !batchUrlInput.trim()}
                        startIcon={
                          isBatchProbing ? (
                            <CircularProgress size={13} sx={{ color: '#ffffff !important' }} />
                          ) : (
                            <SearchRounded className="!text-sm !text-white" sx={{ color: '#ffffff !important' }} />
                          )
                        }
                        className="btn-theme-primary !text-white !font-bold !text-xs !py-2 !px-4 !rounded-lg !normal-case shadow-sm whitespace-nowrap shrink-0"
                        sx={{
                          color: '#ffffff !important',
                          WebkitTextFillColor: '#ffffff !important',
                          backgroundColor: 'var(--theme-primary) !important',
                          '&, & *, & .MuiButton-startIcon, & .MuiSvgIcon-root': {
                            color: '#ffffff !important',
                            WebkitTextFillColor: '#ffffff !important'
                          },
                          '&:hover': {
                            backgroundColor: 'var(--theme-primary-hover) !important'
                          }
                        }}
                      >
                        <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                          {isBatchProbing ? 'Analyzing...' : 'Search'}
                        </span>
                      </Button>
                    </InputAdornment>
                  ),
                  className: '!bg-[var(--theme-bg-input)] !text-xs sm:!text-sm !text-[var(--theme-text-primary)] !rounded-xl'
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '0.75rem',
                    backgroundColor: 'var(--theme-bg-input)',
                    pl: '14px',
                    pr: '6px',
                    py: '4px',
                    minHeight: '48px',
                    '& fieldset': {
                      borderColor: 'var(--theme-border)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--theme-border-accent)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--theme-primary)',
                      boxShadow: '0 0 0 2px var(--theme-secondary-subtle)'
                    },
                    '& .MuiOutlinedInput-input': {
                      py: '8px',
                      px: '4px',
                      fontSize: '0.85rem',
                      color: 'var(--theme-text-primary)'
                    }
                  }
                }}
              />
            </div>

            {/* Probing Progress Indicator */}
            {isBatchProbing && (
              <div className="shrink-0 p-6 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-surface)] text-center space-y-3 animate-pulse shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center mx-auto text-[var(--theme-primary)]">
                  <AutoAwesomeRounded className="!text-2xl animate-spin" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--theme-text-primary)]">
                    Analyzing Playlist & Media Links...
                  </h3>
                  <p className="text-xs text-[var(--theme-text-muted)]">
                    {batchProgressText || 'Extracting all playlist items, resolving video formats, and building your queue...'}
                  </p>
                </div>
              </div>
            )}

            {/* Batch Error Alert */}
            {batchError && (
              <Alert
                severity="error"
                icon={<WarningAmberRounded className="!text-lg" />}
                action={
                  <IconButton
                    size="small"
                    color="inherit"
                    onClick={() => setBatchError(null)}
                    className="!p-1"
                  >
                    <CloseRounded className="!text-base" />
                  </IconButton>
                }
                className="shrink-0 !rounded-xl !border !border-rose-400/50 !bg-rose-500/10 !text-rose-600 dark:!text-rose-200 shadow-sm"
              >
                <AlertTitle className="!font-bold !text-xs !mb-0.5">Batch Extraction Notice</AlertTitle>
                <div className="!text-xs leading-relaxed">{batchError}</div>
              </Alert>
            )}

            {/* BATCH ITEMS TABLE */}
            {batchItems.length > 0 && (
              <div className="media-downloader-card flex-1 min-h-0 flex flex-col rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg-card)] overflow-hidden shadow-xl transition-colors">
                {/* Table Header Action Bar */}
                <div className="media-downloader-card-header p-3 sm:py-2.5 sm:px-4 border-b border-[var(--theme-border)] bg-[var(--theme-bg-surface)] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <VideoLibraryRounded className="!text-lg text-[var(--theme-primary)] shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-[var(--theme-text-primary)] flex items-center gap-2">
                        <span className="truncate">{playlistTitle || 'Batch Media Queue'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border border-[var(--theme-border-accent)]">
                          {selectedCount} of {batchItems.length} selected
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--theme-text-muted)]">
                        Select which files to download and customize format individually per row.
                      </div>
                    </div>
                  </div>

                  {/* Bulk format presets helper */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] mr-1">
                      Set Selected:
                    </span>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleBulkApplyFormat('video_1080p')}
                      className="btn-theme-outlined !text-[11px] !py-0.5 !px-2.5 !rounded-lg !normal-case"
                    >
                      1080p MP4
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleBulkApplyFormat('video_720p')}
                      className="btn-theme-outlined !text-[11px] !py-0.5 !px-2.5 !rounded-lg !normal-case"
                    >
                      720p MP4
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleBulkApplyFormat('audio_mp3_best')}
                      className="btn-theme-outlined !text-[11px] !py-0.5 !px-2.5 !rounded-lg !normal-case"
                    >
                      MP3 Audio
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setBatchItems([]);
                        setPlaylistTitle(null);
                        setBatchFolderName('');
                      }}
                      className="!text-[11px] !py-0.5 !px-2 !text-rose-500 hover:!bg-rose-500/10 !normal-case ml-1"
                    >
                      Clear List
                    </Button>
                  </div>
                </div>

                {/* Table Container */}
                <TableContainer className="flex-1 min-h-0 overflow-y-auto">
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow sx={{ '& th': { backgroundColor: 'var(--theme-bg-surface)', borderColor: 'var(--theme-border)' } }}>
                        <TableCell padding="checkbox" sx={{ width: 44, pl: 2 }}>
                          <Tooltip title={selectedCount === batchItems.length ? 'Deselect All' : 'Select All'} arrow>
                            <Checkbox
                              size="small"
                              checked={batchItems.length > 0 && selectedCount === batchItems.length}
                              indeterminate={selectedCount > 0 && selectedCount < batchItems.length}
                              onChange={handleToggleAll}
                              icon={<CheckBoxOutlineBlankRounded className="!text-lg" />}
                              checkedIcon={<CheckBoxRounded className="!text-lg" />}
                              indeterminateIcon={<IndeterminateCheckBoxRounded className="!text-lg" />}
                              sx={{
                                color: 'var(--theme-text-muted)',
                                '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                                  color: 'var(--theme-primary)'
                                }
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ width: 90, py: 1.5 }}>Preview</TableCell>
                        <TableCell sx={{ minWidth: 240, py: 1.5 }}>Title & Creator</TableCell>
                        <TableCell sx={{ width: 85, py: 1.5 }}>Duration</TableCell>
                        <TableCell sx={{ width: 190, py: 1.5 }}>Format / Quality</TableCell>
                        <TableCell align="right" sx={{ width: 90, py: 1.5, pr: 2 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {batchItems.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          hover
                          selected={item.selected}
                          className={`transition-colors ${
                            item.selected ? 'bg-[var(--theme-secondary-subtle)]/30' : 'opacity-85 hover:opacity-100'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <TableCell padding="checkbox" sx={{ pl: 2 }}>
                            <Checkbox
                              size="small"
                              checked={item.selected}
                              onChange={() => handleToggleRow(item.id)}
                              icon={<CheckBoxOutlineBlankRounded className="!text-lg" />}
                              checkedIcon={<CheckBoxRounded className="!text-lg" />}
                              sx={{
                                color: 'var(--theme-text-muted)',
                                '&.Mui-checked': {
                                  color: 'var(--theme-primary)'
                                }
                              }}
                            />
                          </TableCell>

                          {/* Thumbnail */}
                          <TableCell sx={{ py: 1 }}>
                            <div className="relative w-16 h-10 rounded overflow-hidden border border-[var(--theme-border)] bg-black shrink-0 shadow-sm">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt="Thumb"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--theme-text-muted)]">
                                  <OndemandVideoRounded className="!text-base" />
                                </div>
                              )}
                              <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono font-bold text-white leading-tight">
                                {item.durationFormatted || '--:--'}
                              </div>
                            </div>
                          </TableCell>

                          {/* Title & Platform/Uploader */}
                          <TableCell sx={{ py: 1 }}>
                            <div className="min-w-0 space-y-0.5">
                              <div
                                className="text-xs font-bold text-[var(--theme-text-primary)] line-clamp-1 select-text"
                                title={item.title}
                              >
                                <span className="font-mono text-[var(--theme-text-muted)] text-[10px] mr-1.5">
                                  #{idx + 1}
                                </span>
                                {item.title}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[var(--theme-text-muted)]">
                                <span className="px-1.5 py-0.2 rounded bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] font-bold uppercase tracking-wider text-[9px] border border-[var(--theme-border-accent)]">
                                  {item.platform}
                                </span>
                                <span className="truncate max-w-[180px]">{item.uploader}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Duration */}
                          <TableCell sx={{ py: 1 }}>
                            <span className="text-[11px] font-mono text-[var(--theme-text-muted)] font-semibold">
                              {item.durationFormatted}
                            </span>
                          </TableCell>

                          {/* Format Dropdown Selector (INDIVIDUAL PER ROW) */}
                          <TableCell sx={{ py: 1 }}>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={item.selectedFormatId}
                                onChange={(e) => handleFormatChangeForRow(item.id, e.target.value)}
                                size="small"
                                IconComponent={KeyboardArrowDownRounded}
                                className="!bg-[var(--theme-bg-input)] !text-xs !text-[var(--theme-text-primary)] !rounded-lg"
                                sx={{
                                  height: 32,
                                  fontSize: '0.75rem',
                                  '& fieldset': {
                                    borderColor: 'var(--theme-border)'
                                  },
                                  '&:hover fieldset': {
                                    borderColor: 'var(--theme-border-accent)'
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: 'var(--theme-primary)'
                                  },
                                  '& .MuiSelect-select': {
                                    py: '4px',
                                    px: '8px',
                                    fontSize: '0.75rem',
                                    color: 'var(--theme-text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }
                                }}
                                MenuProps={{
                                  PaperProps: {
                                    className:
                                      '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-xl !shadow-2xl !max-h-60',
                                    sx: {
                                      backgroundColor: 'var(--theme-bg-card)',
                                      '& .MuiMenuItem-root': {
                                        fontSize: '0.75rem',
                                        py: 0.75,
                                        px: 1.5,
                                        color: 'var(--theme-text-primary)'
                                      }
                                    }
                                  }
                                }}
                              >
                                {BATCH_FORMAT_OPTIONS.map((fmt) => (
                                  <MenuItem key={fmt.id} value={fmt.id}>
                                    <div className="flex items-center gap-1.5 w-full">
                                      <span className="text-[9px] font-bold px-1 rounded bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border border-[var(--theme-border-accent)]">
                                        {fmt.badge}
                                      </span>
                                      <span className="truncate">{fmt.label}</span>
                                    </div>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>

                          {/* Row Actions */}
                          <TableCell align="right" sx={{ py: 1, pr: 2 }}>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip title="Watch in Browser" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenSource(item.url)}
                                  className="!p-1 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)]"
                                >
                                  <OpenInNewRounded className="!text-sm" />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Remove item" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveRow(item.id)}
                                  className="!p-1 !text-[var(--theme-text-muted)] hover:!text-rose-500"
                                >
                                  <DeleteOutlineRounded className="!text-sm" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Global Save Location & Batch Download Actions Footer */}
                <div className="media-downloader-card-header p-3 sm:p-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg-surface)] flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
                  {/* Destination & Subfolder Inputs */}
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Global Destination Folder */}
                    <div className="flex-1 min-w-[200px] space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] flex items-center gap-1">
                        <FolderRounded className="!text-xs text-[var(--theme-primary)]" />
                        <span>Destination Folder</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TextField
                          fullWidth
                          size="small"
                          value={savePath}
                          onChange={(e) => setSavePath(e.target.value)}
                          placeholder={defaultSavePath || 'Default downloads folder'}
                          title={savePath || defaultSavePath}
                          className="!bg-[var(--theme-bg-input)] !rounded-lg border border-[var(--theme-border)]"
                          inputProps={{
                            className: '!text-xs !text-[var(--theme-text-primary)] font-mono !py-1.5 !px-2.5'
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '0.5rem',
                              backgroundColor: 'var(--theme-bg-input)',
                              height: 36,
                              '& fieldset': {
                                borderColor: 'var(--theme-border)'
                              },
                              '&:hover fieldset': {
                                borderColor: 'var(--theme-border-accent)'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'var(--theme-primary)'
                              }
                            }
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleBrowseDirectory}
                          className="btn-theme-outlined !text-xs !py-1.5 !px-3 whitespace-nowrap !rounded-lg shrink-0 font-medium !normal-case"
                        >
                          <FolderOpenRounded className="!text-sm mr-1 text-[var(--theme-primary)]" />
                          <span>Browse</span>
                        </Button>
                      </div>
                    </div>

                    {/* Subfolder Name Textbox */}
                    <div className="w-full sm:w-60 md:w-68 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <CreateNewFolderRounded className="!text-xs text-[var(--theme-primary)]" />
                          <span>Folder Name</span>
                        </div>
                        <span className="text-[9px] font-normal lowercase opacity-70">(optional)</span>
                      </div>
                      <TextField
                        fullWidth
                        size="small"
                        value={batchFolderName}
                        onChange={(e) => setBatchFolderName(e.target.value)}
                        placeholder="Folder name (e.g. Playlist)"
                        title="Files will be saved inside this folder"
                        InputProps={{
                          endAdornment: batchFolderName ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setBatchFolderName('')}
                                className="!p-0.5 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)]"
                                title="Clear folder name"
                              >
                                <ClearRounded className="!text-xs" />
                              </IconButton>
                            </InputAdornment>
                          ) : null,
                          className: '!bg-[var(--theme-bg-input)] !rounded-lg border border-[var(--theme-border)]'
                        }}
                        inputProps={{
                          className: '!text-xs !text-[var(--theme-text-primary)] !py-1.5 !px-2.5'
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '0.5rem',
                            backgroundColor: 'var(--theme-bg-input)',
                            height: 36,
                            '& fieldset': {
                              borderColor: 'var(--theme-border)'
                            },
                            '&:hover fieldset': {
                              borderColor: 'var(--theme-border-accent)'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'var(--theme-primary)'
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Batch Download Primary CTA */}
                  <div className="flex items-center gap-3 shrink-0 self-end xl:self-center mt-1 xl:mt-0">
                    <div className="text-right hidden sm:block max-w-[200px]">
                      <div className="text-xs font-bold text-[var(--theme-text-primary)]">
                        {selectedCount} item{selectedCount === 1 ? '' : 's'} queued
                      </div>
                      <div className="text-[10px] text-[var(--theme-text-muted)] truncate" title={effectiveBatchSavePath}>
                        {batchFolderName.trim() ? `In /${batchFolderName.trim()}` : 'In base folder'}
                      </div>
                    </div>

                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleStartBatchDownload}
                      disabled={isStartingBatchDownload || selectedCount === 0}
                      startIcon={
                        isStartingBatchDownload ? (
                          <CircularProgress size={16} sx={{ color: '#ffffff !important' }} />
                        ) : (
                          <DownloadRounded className="!text-lg !text-white" sx={{ color: '#ffffff !important' }} />
                        )
                      }
                      className="btn-theme-primary !text-white !font-bold !text-xs sm:!text-sm !py-2.5 !px-6 !rounded-xl shadow-lg hover:shadow-xl transition-all !normal-case"
                      sx={{
                        color: '#ffffff !important',
                        WebkitTextFillColor: '#ffffff !important',
                        backgroundColor: 'var(--theme-primary) !important',
                        '&, & *, & .MuiButton-startIcon, & .MuiSvgIcon-root': {
                          color: '#ffffff !important',
                          WebkitTextFillColor: '#ffffff !important'
                        },
                        '&:hover': {
                          backgroundColor: 'var(--theme-primary-hover) !important'
                        }
                      }}
                    >
                      <span style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}>
                        {isStartingBatchDownload
                          ? 'Queuing Batch...'
                          : `Download Selected (${selectedCount} Videos)`}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>

      {/* POPUP MODAL: Single Download Started */}
      <Dialog
        open={successModal.open}
        onClose={() => setSuccessModal({ open: false, taskInfo: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          className:
            '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-2xl !text-[var(--theme-text-primary)] !max-w-[460px] !shadow-2xl overflow-hidden'
        }}
      >
        <DialogTitle className="!px-5 !py-3.5 flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-bg-surface)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircleRounded className="!text-lg" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--theme-text-primary)] leading-tight">
                Download Started
              </div>
              <div className="text-[11px] text-[var(--theme-text-muted)]">
                Task added to transfer queue
              </div>
            </div>
          </div>

          <Tooltip title="Close" arrow>
            <IconButton
              size="small"
              onClick={() => setSuccessModal({ open: false, taskInfo: null })}
              className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !p-1.5 rounded-lg transition-colors"
            >
              <CloseRounded className="!text-lg" />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent className="!px-5 !py-4 space-y-3 bg-[var(--theme-bg-card)]">
          <div className="media-downloader-section p-2.5 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border)] flex items-center gap-3 shadow-inner">
            {successModal.taskInfo?.thumbnail ? (
              <div className="w-24 h-16 rounded-lg overflow-hidden border border-[var(--theme-border)] bg-black shrink-0 relative shadow-sm">
                <img
                  src={successModal.taskInfo.thumbnail}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-16 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg-input)] flex items-center justify-center text-[var(--theme-text-muted)] shrink-0">
                <OndemandVideoRounded className="!text-2xl" />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div
                className="text-xs font-bold text-[var(--theme-text-primary)] line-clamp-2 leading-snug"
                title={successModal.taskInfo?.title}
              >
                {successModal.taskInfo?.title || 'Media Download'}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {successModal.taskInfo?.formatLabel && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border border-[var(--theme-border-accent)] shrink-0">
                    {successModal.taskInfo.formatLabel}
                  </span>
                )}
                <span
                  className="text-[10px] text-[var(--theme-text-muted)] flex items-center gap-1 truncate max-w-[200px]"
                  title={successModal.taskInfo?.savePath}
                >
                  <FolderRounded className="!text-xs shrink-0" />
                  <span className="truncate">{successModal.taskInfo?.savePath}</span>
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
            Your media download has been queued. You can monitor live progress, speed, and chunk details in the Downloads tab.
          </p>
        </DialogContent>

        <DialogActions className="!px-5 !py-3 border-t border-[var(--theme-border)] bg-[var(--theme-bg-surface)] flex items-center justify-end gap-2 shrink-0">
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setSuccessModal({ open: false, taskInfo: null });
              setUrlInput('');
              setProbeResult(null);
            }}
            className="btn-theme-outlined !text-xs !py-1.5 !px-3.5 !rounded-lg !capitalize"
          >
            Download Another
          </Button>

          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setSuccessModal({ open: false, taskInfo: null });
              onNavigateToDownloads?.();
            }}
            endIcon={<ArrowForwardRounded className="!text-sm" />}
            className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 !font-bold !rounded-lg shadow-md !capitalize"
          >
            Go to Downloads
          </Button>
        </DialogActions>
      </Dialog>

      {/* POPUP MODAL: Batch Download Started */}
      <Dialog
        open={batchSuccessModal.open}
        onClose={() => setBatchSuccessModal({ open: false, count: 0, savePath: '' })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          className:
            '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-2xl !text-[var(--theme-text-primary)] !max-w-[460px] !shadow-2xl overflow-hidden'
        }}
      >
        <DialogTitle className="!px-5 !py-3.5 flex items-center justify-between border-b border-[var(--theme-border)] bg-[var(--theme-bg-surface)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircleRounded className="!text-lg" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--theme-text-primary)] leading-tight">
                Batch Downloads Queued
              </div>
              <div className="text-[11px] text-[var(--theme-text-muted)]">
                {batchSuccessModal.count} tasks added to transfer manager
              </div>
            </div>
          </div>

          <Tooltip title="Close" arrow>
            <IconButton
              size="small"
              onClick={() => setBatchSuccessModal({ open: false, count: 0, savePath: '' })}
              className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !p-1.5 rounded-lg transition-colors"
            >
              <CloseRounded className="!text-lg" />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent className="!px-5 !py-4 space-y-3 bg-[var(--theme-bg-card)]">
          <div className="media-downloader-section p-3 rounded-xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--theme-text-primary)]">
                Total Files Queued:
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)]">
                {batchSuccessModal.count} items
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)] truncate" title={batchSuccessModal.savePath}>
              <FolderRounded className="!text-sm text-[var(--theme-primary)] shrink-0" />
              <span className="truncate">{batchSuccessModal.savePath}</span>
            </div>
          </div>

          <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">
            All selected videos and audios have been added to the download queue. They will download concurrently according to your concurrency limits.
          </p>
        </DialogContent>

        <DialogActions className="!px-5 !py-3 border-t border-[var(--theme-border)] bg-[var(--theme-bg-surface)] flex items-center justify-end gap-2 shrink-0">
          <Button
            size="small"
            variant="outlined"
            onClick={() => setBatchSuccessModal({ open: false, count: 0, savePath: '' })}
            className="btn-theme-outlined !text-xs !py-1.5 !px-3.5 !rounded-lg !capitalize"
          >
            Add More
          </Button>

          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setBatchSuccessModal({ open: false, count: 0, savePath: '' });
              onNavigateToDownloads?.();
            }}
            endIcon={<ArrowForwardRounded className="!text-sm" />}
            className="btn-theme-primary !text-white !text-xs !py-1.5 !px-4 !font-bold !rounded-lg shadow-md !capitalize"
          >
            Go to Downloads
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
