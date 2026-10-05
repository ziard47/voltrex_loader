import React, { useState, useEffect, useRef } from 'react';
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
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import ClearRounded from '@mui/icons-material/ClearRounded';

import { formatBytes } from '../utils/formatters';

export default function MediaDownloader({
  defaultSavePath,
  onNavigateToDownloads,
  activeCount = 0
}) {
  const [urlInput, setUrlInput] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Download configuration state
  const [downloadMode, setDownloadMode] = useState('video'); // 'video' | 'audio'
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [savePath, setSavePath] = useState(defaultSavePath || '');
  const [customFileName, setCustomFileName] = useState('');
  const [isStartingDownload, setIsStartingDownload] = useState(false);

  // Success Dialog State
  const [successModal, setSuccessModal] = useState({
    open: false,
    taskInfo: null
  });

  const inputRef = useRef(null);

  useEffect(() => {
    if (defaultSavePath && !savePath) {
      setSavePath(defaultSavePath);
    }
  }, [defaultSavePath]);

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrlInput(text.trim());
          setErrorMsg(null);
          // Auto probe on paste if valid URL
          if (text.startsWith('http://') || text.startsWith('https://')) {
            handleSearch(text.trim());
          }
        }
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  // Execute probe search
  const handleSearch = async (targetUrl = urlInput) => {
    const trimmed = (targetUrl || urlInput).trim();
    if (!trimmed) {
      setErrorMsg('Please enter a media link from YouTube, TikTok, Facebook, Reddit, or another site.');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setErrorMsg('Please enter a valid URL starting with http:// or https://');
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

      // Handle both raw object and wrapped { data } / { success, data } responses
      const info = res.data || res;
      if (!info || (!info.title && !info.videoPresets)) {
        throw new Error(res.error || 'Unable to retrieve media information from this URL.');
      }

      setProbeResult(info);

      // Default format preset selection
      const videoList = Array.isArray(info.videoPresets) ? info.videoPresets : [];
      const recommendedVideo = videoList.find((p) => p.recommended) || videoList[0];
      if (recommendedVideo) {
        setSelectedPresetId(recommendedVideo.id);
      }

      // Default filename suggestion
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

  // Directory picker
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

  // Current presets based on mode
  const currentPresets = downloadMode === 'video'
    ? probeResult?.videoPresets || []
    : probeResult?.audioPresets || [];

  const selectedPreset = currentPresets.find((p) => p.id === selectedPresetId);

  // Sync filename extension when mode changes
  useEffect(() => {
    if (!probeResult) return;
    const safeTitle = (probeResult.title || 'download').replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (downloadMode === 'audio') {
      setCustomFileName(`${safeTitle}.mp3`);
    } else {
      setCustomFileName(`${safeTitle}.mp4`);
    }
  }, [downloadMode, probeResult]);

  // Start Download trigger
  const handleStartDownload = async () => {
    if (!probeResult || !urlInput.trim()) return;

    setIsStartingDownload(true);
    setErrorMsg(null);

    try {
      const chosenPreset = selectedPreset || currentPresets[0];
      const ext = downloadMode === 'audio' ? 'mp3' : 'mp4';
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
        formatSpec: chosenPreset?.formatSpec || (downloadMode === 'audio' ? 'bestaudio/best' : 'bestvideo+bestaudio/best'),
        downloadMode: downloadMode,
        audioOnly: downloadMode === 'audio',
        videoResolution: chosenPreset?.resolution,
        formatLabel: chosenPreset?.label,
        uploader: probeResult.uploader,
        platform: probeResult.platform
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

      // Show success modal
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

  // Open video in external browser
  const handleOpenSource = () => {
    const link = probeResult?.url || urlInput;
    if (link && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(link);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] select-none transition-colors">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-surface)] shrink-0">
        <div className="flex items-center gap-2.5">
          <OndemandVideoRounded className="!text-lg text-[var(--theme-primary)]" />
          <h1 className="text-sm font-bold text-[var(--theme-text-primary)] tracking-wide">
            Media Downloader
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--theme-text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-primary)]" />
              </span>
              <span className="hidden sm:inline">{activeCount} active transfer{activeCount === 1 ? '' : 's'}</span>
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

      {/* Main Scrollable Content */}
      <div className="flex-1 w-full overflow-y-auto p-3 sm:p-5 lg:p-6">
        <div className="max-w-5xl w-full mx-auto space-y-4 sm:space-y-6">

        {/* Minimal Unified Search Bar with Material UI TextField */}
        <TextField
          fullWidth
          inputRef={inputRef}
          value={urlInput}
          onChange={(e) => {
            setUrlInput(e.target.value);
            setErrorMsg(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
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
                    onClick={handlePaste}
                    startIcon={<ContentPasteRounded className="!text-sm text-[var(--theme-primary)]" />}
                    className="!text-xs !py-1.5 !px-2.5 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)] !normal-case shrink-0"
                  >
                    Paste
                  </Button>
                )}

                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleSearch()}
                  disabled={isProbing || !urlInput.trim()}
                  startIcon={
                    isProbing ? (
                      <CircularProgress size={13} color="inherit" />
                    ) : (
                      <SearchRounded className="!text-sm text-white" />
                    )
                  }
                  className="btn-theme-primary !text-white !font-bold !text-xs !py-2 !px-4 !rounded-lg !normal-case shadow-sm whitespace-nowrap shrink-0"
                >
                  {isProbing ? 'Analyzing...' : 'Search'}
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

        {/* Error Alert Box with MUI Alert */}
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
                  onClick={handleOpenSource}
                  startIcon={<OpenInNewRounded className="!text-sm text-[var(--theme-text-muted)]" />}
                  className="btn-theme-outlined !text-xs !py-1 !px-2.5 !rounded-lg !normal-case"
                >
                  Watch in Browser
                </Button>
              </div>
            </div>

            {/* Main Details Body: Left Preview, Right Settings */}
            <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

              {/* Left Column: Thumbnail & Metadata (5 Cols) */}
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

                  {/* Duration Badge in corner */}
                  {probeResult.durationFormatted && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[11px] font-mono font-bold text-white border border-white/10">
                      {probeResult.durationFormatted}
                    </div>
                  )}

                  {/* Source platform logo tag */}
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
                  <VerifiedUserRounded className="!text-base text-emerald-500 dark:text-emerald-400 shrink-0" title="Stream verified" />
                </div>
              </div>

              {/* Right Column: Download Format & Quality Config (7 Cols) */}
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
                      startIcon={<MovieRounded className="!text-base" />}
                      className={`!py-2 !rounded-lg !text-xs !font-bold !normal-case transition-all ${
                        downloadMode === 'video'
                          ? 'btn-theme-primary !text-white shadow-md'
                          : '!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)]'
                      }`}
                    >
                      Video (MP4)
                    </Button>

                    <Button
                      variant={downloadMode === 'audio' ? 'contained' : 'text'}
                      onClick={() => {
                        setDownloadMode('audio');
                        const def = probeResult?.audioPresets?.[0];
                        if (def) setSelectedPresetId(def.id);
                      }}
                      startIcon={<MusicNoteRounded className="!text-base" />}
                      className={`!py-2 !rounded-lg !text-xs !font-bold !normal-case transition-all ${
                        downloadMode === 'audio'
                          ? 'btn-theme-primary !text-white shadow-md'
                          : '!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-bg-hover)]'
                      }`}
                    >
                      Audio Only (MP3)
                    </Button>
                  </div>
                </div>

                {/* Quality / Resolution Dropdown Selector with Material UI Select */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] mb-1.5">
                    <span>Select Quality / Format</span>
                    <span className="text-[10px] text-[var(--theme-text-muted)] normal-case">
                      {downloadMode === 'video' ? 'Audio stream auto-merged' : 'Audio extracted with ffmpeg'}
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

                  {/* Compact Selected Format Summary Badge */}
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

                {/* Save Location Row */}
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

                {/* File Name Row with Material UI TextField */}
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

                {/* Primary Download CTA Button */}
                <div className="pt-1">
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleStartDownload}
                    disabled={isStartingDownload}
                    startIcon={
                      isStartingDownload ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <DownloadRounded className="!text-lg text-white" />
                      )
                    }
                    className="btn-theme-primary !text-white !font-bold !text-sm !py-3 !rounded-xl shadow-lg hover:shadow-xl transition-all !normal-case"
                  >
                    {isStartingDownload
                      ? 'Queuing Download...'
                      : `Download ${downloadMode === 'audio' ? 'Audio (MP3)' : 'Video'}`}
                  </Button>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* POPUP MODAL: Download has started */}
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
          {/* Integrated Horizontal Media Summary Card */}
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
      </div>
    </div>
  );
}
