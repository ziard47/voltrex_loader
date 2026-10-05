import React, { useState, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import {
  Zap,
  Activity,
  CheckCircle2,
  Server,
  Magnet,
  Radio,
  Users,
  ArrowDown,
  ArrowUp,
  FileText,
  ChevronDown,
  ChevronUp,
  Layers,
  Gauge,
  Plus,
  Sliders,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { formatBytes, formatSpeed } from '../utils/formatters';
import { POPULAR_TRACKERS, parseTrackersInput } from '../utils/torrentTrackers';
import { useTheme } from '../context/ThemeContext';

export default function ChunkMatrix({ task, initialSection = null }) {
  const { effectiveMode } = useTheme();
  const isDark = effectiveMode === 'dark';

  const [showFilesList, setShowFilesList] = useState(initialSection === 'files');
  const [showTrackers, setShowTrackers] = useState(initialSection === 'trackers');
  const [showLimits, setShowLimits] = useState(initialSection === 'limits');
  const [newTrackersInput, setNewTrackersInput] = useState('');
  const [isAddingTrackers, setIsAddingTrackers] = useState(false);
  const [trackerSuccessMsg, setTrackerSuccessMsg] = useState('');
  const [copiedTracker, setCopiedTracker] = useState('');
  const [customDownloadLimit, setCustomDownloadLimit] = useState(task?.downloadLimitKBps || '');
  const [customUploadLimit, setCustomUploadLimit] = useState(task?.uploadLimitKBps || '');
  const [limitsSavedMsg, setLimitsSavedMsg] = useState('');

  useEffect(() => {
    if (initialSection === 'files') {
      setShowFilesList(true);
      setShowTrackers(false);
      setShowLimits(false);
    } else if (initialSection === 'trackers') {
      setShowTrackers(true);
      setShowLimits(false);
      setShowFilesList(false);
    } else if (initialSection === 'limits') {
      setShowLimits(true);
      setShowTrackers(false);
      setShowFilesList(false);
    }
  }, [initialSection]);

  useEffect(() => {
    if (task) {
      if (task.downloadLimitKBps !== undefined) {
        setCustomDownloadLimit(task.downloadLimitKBps === 0 ? '' : task.downloadLimitKBps);
      }
      if (task.uploadLimitKBps !== undefined) {
        setCustomUploadLimit(task.uploadLimitKBps === 0 ? '' : task.uploadLimitKBps);
      }
    }
  }, [task?.downloadLimitKBps, task?.uploadLimitKBps]);

  if (!task) return null;

  const chunks = task.chunks || [];
  const hasChunks = chunks.length > 0;
  const isDownloading = task.status === 'DOWNLOADING';
  const isCompleted = task.status === 'COMPLETED';
  const isTorrent = Boolean(task.isTorrent);

  // Torrent files list & trackers list
  const torrentFiles = task.files || [];
  const torrentTrackers = task.trackers || [];

  // Speed limits info
  const dlLimit = Number(task.downloadLimitKBps) || 0;
  const ulLimit = Number(task.uploadLimitKBps) || 0;
  const hasSpeedLimits = dlLimit > 0 || ulLimit > 0;

  // Metrics
  const totalChunks = hasChunks ? chunks.length : (task.connections || 1);
  const completedChunks = hasChunks
    ? chunks.filter((c) => c.status === 'COMPLETED' || c.progress === 100).length
    : isCompleted ? 1 : 0;
  const activeChunks = hasChunks
    ? chunks.filter((c) => c.status === 'DOWNLOADING').length
    : isDownloading ? 1 : 0;

  const handleAddTrackers = async () => {
    const parsed = parseTrackersInput(newTrackersInput);
    if (parsed.length === 0) return;
    setIsAddingTrackers(true);
    try {
      if (window.electronAPI?.addTorrentTrackers) {
        await window.electronAPI.addTorrentTrackers(task.id, parsed);
        setNewTrackersInput('');
        setTrackerSuccessMsg(`Added ${parsed.length} tracker(s) to swarm!`);
        setTimeout(() => setTrackerSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to add trackers:', err);
    } finally {
      setIsAddingTrackers(false);
    }
  };

  const handleAppendPopularTrackers = () => {
    setNewTrackersInput((prev) => {
      const existing = parseTrackersInput(prev);
      const combined = Array.from(new Set([...existing, ...POPULAR_TRACKERS]));
      return combined.join('\n');
    });
  };

  const handleSaveSpeedLimits = async () => {
    const dl = Math.max(0, parseInt(customDownloadLimit, 10) || 0);
    const ul = Math.max(0, parseInt(customUploadLimit, 10) || 0);
    try {
      if (window.electronAPI?.setTorrentSpeedLimits) {
        await window.electronAPI.setTorrentSpeedLimits(task.id, {
          downloadLimitKBps: dl,
          uploadLimitKBps: ul
        });
        setLimitsSavedMsg('Speed limits updated live!');
        setTimeout(() => setLimitsSavedMsg(''), 2500);
      }
    } catch (err) {
      console.error('Failed to set speed limits:', err);
    }
  };

  const copyTrackerUrl = (url) => {
    if (!url) return;
    navigator.clipboard?.writeText(url);
    setCopiedTracker(url);
    setTimeout(() => setCopiedTracker(''), 2000);
  };

  const handleToggleFileSelection = async (fileIndex) => {
    if (!task || !task.isTorrent || !window.electronAPI?.setTorrentFileSelection) return;
    const currentSelected = Array.isArray(task.selectedFileIndices)
      ? task.selectedFileIndices
      : (task.files || []).map((_, i) => i);

    let updatedIndices;
    if (currentSelected.includes(fileIndex)) {
      if (currentSelected.length <= 1) {
        return; // Retain at least 1 file
      }
      updatedIndices = currentSelected.filter((i) => i !== fileIndex);
    } else {
      updatedIndices = [...currentSelected, fileIndex];
    }

    try {
      await window.electronAPI.setTorrentFileSelection(task.id, updatedIndices);
    } catch (err) {
      console.error('Failed to update torrent file selection:', err);
    }
  };

  const handleSelectAllFiles = async () => {
    if (!task || !task.isTorrent || !window.electronAPI?.setTorrentFileSelection) return;
    const all = (task.files || []).map((_, i) => i);
    try {
      await window.electronAPI.setTorrentFileSelection(task.id, all);
    } catch (err) {
      console.error('Failed to select all torrent files:', err);
    }
  };

  const handleDeselectAllFiles = async () => {
    if (!task || !task.isTorrent || !window.electronAPI?.setTorrentFileSelection) return;
    try {
      // Keep only first file selected so torrent retains at least 1 file
      await window.electronAPI.setTorrentFileSelection(task.id, [0]);
    } catch (err) {
      console.error('Failed to deselect torrent files:', err);
    }
  };

  if (isTorrent) {
    return (
      <div className="px-4 py-3 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-accent)] space-y-3 select-none w-full max-w-full overflow-hidden">
        {/* BitTorrent Swarm Header Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-full">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${
                isDark
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-400'
                  : 'bg-purple-100 border-purple-300 text-purple-700'
              }`}
            >
              <Magnet className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[var(--theme-text-primary)]">
                  BitTorrent P2P Swarm & Piece Matrix
                </span>
                <Chip
                  size="small"
                  label={`${task.peers || 0} Peers`}
                  icon={
                    <Users
                      className={`w-3 h-3 !ml-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
                    />
                  }
                  className={`!font-bold !text-[10px] !h-5 !px-1 border ${
                    isDark
                      ? '!bg-purple-950/50 !text-purple-300 !border-purple-500/40'
                      : '!bg-purple-100 !text-purple-800 !border-purple-300'
                  }`}
                />
                {task.infoHash && (
                  <span
                    className={`text-[10px] font-mono hidden md:inline truncate ${
                      isDark ? 'text-zinc-400' : 'text-slate-500'
                    }`}
                    title={`InfoHash: ${task.infoHash}`}
                  >
                    Hash: {task.infoHash.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] font-mono-stat flex-wrap">
            <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)]">
              <ArrowDown className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>
                Down:{' '}
                <strong className={isDark ? 'text-emerald-400' : 'text-emerald-600 font-bold'}>
                  {formatSpeed(task.speed || 0)}
                </strong>
                {dlLimit > 0 && (
                  <span
                    className={`text-[10px] ml-1 font-semibold ${
                      isDark ? 'text-amber-400' : 'text-amber-700'
                    }`}
                  >
                    [{dlLimit} KB/s]
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)]">
              <ArrowUp className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
              <span>
                Up:{' '}
                <strong className={isDark ? 'text-purple-400' : 'text-purple-700 font-bold'}>
                  {formatSpeed(task.uploadSpeed || 0)}
                </strong>
                {ulLimit > 0 && (
                  <span
                    className={`text-[10px] ml-1 font-semibold ${
                      isDark ? 'text-amber-400' : 'text-amber-700'
                    }`}
                  >
                    [{ulLimit} KB/s]
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)]">
              <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>
                Done:{' '}
                <strong className="text-[var(--theme-text-primary)]">
                  {completedChunks} / {totalChunks} segs
                </strong>
              </span>
            </div>

            {/* Trackers Button */}
            <button
              type="button"
              onClick={() => {
                setShowTrackers((prev) => !prev);
                setShowLimits(false);
              }}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                showTrackers
                  ? 'bg-purple-600 text-white border-purple-400 font-bold'
                  : isDark
                  ? 'text-purple-300 hover:text-white bg-purple-900/30 border-purple-500/30'
                  : 'text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-200 font-medium'
              }`}
            >
              <Radio className={`w-3 h-3 ${showTrackers ? 'text-white' : isDark ? 'text-purple-300' : 'text-purple-600'}`} />
              <span>{torrentTrackers.length} Trackers</span>
              {showTrackers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Speed Limits Button */}
            <button
              type="button"
              onClick={() => {
                setShowLimits((prev) => !prev);
                setShowTrackers(false);
              }}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                showLimits
                  ? 'bg-purple-600 text-white border-purple-400 font-bold'
                  : hasSpeedLimits
                  ? isDark
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                  : isDark
                  ? 'text-purple-300 hover:text-white bg-purple-900/30 border-purple-500/30'
                  : 'text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-200 font-medium'
              }`}
            >
              <Gauge className="w-3 h-3" />
              <span>{hasSpeedLimits ? `Limits (${dlLimit || '∞'}/${ulLimit || '∞'} KB/s)` : 'Limits'}</span>
              {showLimits ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Files List Button */}
            {torrentFiles.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilesList((prev) => !prev)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors border ${
                  showFilesList
                    ? 'bg-purple-600 text-white border-purple-400 font-bold'
                    : isDark
                    ? 'text-purple-300 hover:text-white bg-purple-900/30 border-purple-500/30'
                    : 'text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-200 font-medium'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span>{torrentFiles.length} file{torrentFiles.length === 1 ? '' : 's'}</span>
                {showFilesList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Piece Block Map */}
        <div className="space-y-1 w-full max-w-full">
          <div className="flex items-center justify-between text-[10px] text-[var(--theme-text-muted)] font-mono-stat">
            <span>Piece Segment 1</span>
            <span className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
              Swarm Piece Availability & Verification Map
            </span>
            <span>Piece Segment {totalChunks}</span>
          </div>

          <div
            className={`h-4 w-full rounded-md border overflow-hidden flex gap-[2px] p-[2px] ${
              isDark ? 'bg-[#130d0d] border-purple-500/30' : 'bg-slate-200 border-purple-200'
            }`}
          >
            {chunks.map((chunk) => {
              const isDone = chunk.status === 'COMPLETED' || chunk.progress >= 100;
              const isActive = chunk.status === 'DOWNLOADING';
              const isPaused = chunk.status === 'PAUSED';
              const chunkProg = isDone ? 100 : Math.max(0, Math.min(100, chunk.progress || 0));

              return (
                <Tooltip
                  key={chunk.index}
                  arrow
                  placement="top"
                  title={
                    <div className="text-center text-[11px] font-mono-stat p-1">
                      <div className="font-bold text-white mb-0.5">Piece Segment #{chunk.index + 1}</div>
                      <div className="text-purple-200">
                        {chunkProg}% Verified ({chunk.downloadedBytes} / {chunk.totalBytes} pieces)
                      </div>
                      <div className="text-gray-400 text-[10px] mt-0.5">
                        Status: {chunk.status}
                      </div>
                    </div>
                  }
                >
                  <div
                    className={`relative flex-1 h-full rounded-[2px] overflow-hidden group cursor-pointer transition-all hover:opacity-90 ${
                      isDark ? 'bg-[#221717]' : 'bg-slate-300/80'
                    }`}
                  >
                    <div
                      className={`h-full transition-all duration-300 rounded-[2px] ${
                        isDone
                          ? isDark
                            ? 'bg-purple-500'
                            : 'bg-purple-600'
                          : isPaused
                          ? 'bg-amber-500'
                          : isActive
                          ? isDark
                            ? 'bg-purple-400 animate-pulse'
                            : 'bg-purple-500 animate-pulse'
                          : isDark
                          ? 'bg-zinc-700'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${chunkProg}%` }}
                    />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Inline Per-Torrent Speed Limits Panel */}
        {showLimits && (
          <div
            className={`border rounded-xl p-3 space-y-2.5 animate-in fade-in duration-200 w-full max-w-full overflow-hidden ${
              isDark
                ? 'bg-[#120c0c] border-purple-500/40 shadow-xl'
                : 'bg-white border-purple-200 shadow-md shadow-purple-900/5'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Gauge className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={`text-xs font-bold ${isDark ? 'text-purple-200' : 'text-slate-800'}`}>
                  Torrent Speed Limits (Task: {task.fileName})
                </span>
                {limitsSavedMsg && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-400/40 animate-in fade-in">
                    {limitsSavedMsg}
                  </span>
                )}
              </div>

              <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                0 = Unlimited speed for this torrent
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-purple-300/80' : 'text-purple-900/80'
                  }`}
                >
                  Download Limit (KB/s)
                </label>
                <div className="flex items-center gap-1.5">
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="0 (Unlimited)"
                    value={customDownloadLimit}
                    onChange={(e) => setCustomDownloadLimit(e.target.value)}
                    className={`!rounded-lg border ${
                      isDark ? '!bg-[#1a1111] border-purple-500/30' : '!bg-slate-50 border-purple-200'
                    }`}
                    inputProps={{
                      min: 0,
                      step: 100,
                      className: `!text-xs font-mono !py-1.5 !px-2.5 ${
                        isDark ? '!text-zinc-200' : '!text-slate-800'
                      }`
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    isDark ? 'text-purple-300/80' : 'text-purple-900/80'
                  }`}
                >
                  Upload Limit (KB/s)
                </label>
                <div className="flex items-center gap-1.5">
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="0 (Unlimited)"
                    value={customUploadLimit}
                    onChange={(e) => setCustomUploadLimit(e.target.value)}
                    className={`!rounded-lg border ${
                      isDark ? '!bg-[#1a1111] border-purple-500/30' : '!bg-slate-50 border-purple-200'
                    }`}
                    inputProps={{
                      min: 0,
                      step: 50,
                      className: `!text-xs font-mono !py-1.5 !px-2.5 ${
                        isDark ? '!text-zinc-200' : '!text-slate-800'
                      }`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Presets and Apply Row */}
            <div
              className={`flex items-center justify-between flex-wrap gap-2 pt-1 border-t ${
                isDark ? 'border-purple-500/20' : 'border-purple-100'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-medium mr-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Presets:
                </span>
                {[
                  { label: 'No Limit', dl: '', ul: '' },
                  { label: '500 KB/s', dl: 500, ul: 100 },
                  { label: '1 MB/s', dl: 1024, ul: 256 },
                  { label: '2 MB/s', dl: 2048, ul: 512 },
                  { label: '5 MB/s', dl: 5120, ul: 1024 }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomDownloadLimit(p.dl);
                      setCustomUploadLimit(p.ul);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                      isDark
                        ? 'bg-[#1e1313] hover:bg-purple-900/40 text-purple-300 border-purple-500/30'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <Button
                variant="contained"
                size="small"
                onClick={handleSaveSpeedLimits}
                className="!bg-purple-600 hover:!bg-purple-500 !text-white !text-xs !py-1 !px-3 font-semibold rounded-lg shadow"
              >
                Apply Live Limits
              </Button>
            </div>
          </div>
        )}

        {/* Inline BitTorrent Trackers Panel */}
        {showTrackers && (
          <div
            className={`border rounded-xl p-3 space-y-3 animate-in fade-in duration-200 w-full max-w-full overflow-hidden ${
              isDark
                ? 'bg-[#120c0c] border-purple-500/40 shadow-xl'
                : 'bg-white border-purple-200 shadow-md shadow-purple-900/5'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={`text-xs font-bold ${isDark ? 'text-purple-200' : 'text-slate-800'}`}>
                  Swarm Trackers ({torrentTrackers.length})
                </span>
                {trackerSuccessMsg && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-400/40 animate-in fade-in">
                    {trackerSuccessMsg}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAppendPopularTrackers}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded cursor-pointer transition-colors border ${
                  isDark
                    ? 'text-purple-300 hover:text-white bg-purple-900/30 hover:bg-purple-900/50 border-purple-500/40'
                    : 'text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-200 font-medium'
                }`}
              >
                <Plus className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <span>+ Append Best Public Trackers</span>
              </button>
            </div>

            {/* Add Trackers Input Area */}
            <div
              className={`space-y-1.5 p-2.5 rounded-lg border w-full max-w-full overflow-hidden ${
                isDark ? 'bg-[#1a1111] border-purple-500/30' : 'bg-slate-50 border-purple-200'
              }`}
            >
              <div
                className={`flex items-center justify-between text-[10px] mb-0.5 ${
                  isDark ? 'text-purple-300/80' : 'text-purple-900/70'
                }`}
              >
                <span>Add Additional Trackers (one per line, comma or semicolon separated):</span>
                <span>UDP, HTTP, HTTPS, WS, WSS</span>
              </div>
              <div className="flex items-start gap-2 w-full max-w-full">
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  value={newTrackersInput}
                  onChange={(e) => setNewTrackersInput(e.target.value)}
                  placeholder="udp://tracker.opentrackr.org:1337/announce&#10;wss://tracker.openwebtorrent.com"
                  className={`!rounded-lg font-mono border ${
                    isDark ? '!bg-[#120c0c] border-purple-500/30' : '!bg-white border-purple-200'
                  }`}
                  inputProps={{
                    className: `!text-[11px] font-mono !py-1 !px-2 ${
                      isDark ? '!text-zinc-200' : '!text-slate-800'
                    }`
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  disabled={isAddingTrackers || !newTrackersInput.trim()}
                  onClick={handleAddTrackers}
                  className="!bg-purple-600 hover:!bg-purple-500 disabled:!bg-zinc-300 dark:disabled:!bg-zinc-800 disabled:!text-zinc-500 !text-white !text-xs !py-2 !px-3 font-semibold rounded-lg shrink-0 h-14"
                >
                  {isAddingTrackers ? (
                    <CircularProgress size={14} className="!text-white" />
                  ) : (
                    <span>Add Trackers</span>
                  )}
                </Button>
              </div>
            </div>

            {/* Current Trackers List */}
            <div className="space-y-1 max-h-48 overflow-y-auto overflow-x-hidden pr-1 w-full max-w-full">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider block ${
                  isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}
              >
                Active & Announced Trackers:
              </span>
              {torrentTrackers.length === 0 ? (
                <div
                  className={`text-[11px] italic p-2 rounded ${
                    isDark ? 'bg-[#170e0e] text-zinc-500' : 'bg-purple-50/60 text-slate-500'
                  }`}
                >
                  No announce trackers specified yet. Swarm is discovering peers via DHT and PEX.
                </div>
              ) : (
                torrentTrackers.map((trUrl, idx) => {
                  const protocol = trUrl.split('://')[0]?.toUpperCase() || 'P2P';
                  const isCopied = copiedTracker === trUrl;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-2 p-1.5 rounded border text-[11px] font-mono transition-colors w-full max-w-full min-w-0 overflow-hidden ${
                        isDark
                          ? 'bg-[#170e0e] hover:bg-[#201313] border-purple-500/20'
                          : 'bg-white hover:bg-purple-50/60 border-purple-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
                            isDark
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                        >
                          {protocol}
                        </span>
                        <span
                          className={`truncate min-w-0 flex-1 select-all ${
                            isDark ? 'text-zinc-300' : 'text-slate-700'
                          }`}
                          title={trUrl}
                        >
                          {trUrl}
                        </span>
                      </div>

                      <Tooltip title={isCopied ? 'Copied!' : 'Copy Tracker URL'} arrow size="small">
                        <button
                          type="button"
                          onClick={() => copyTrackerUrl(trUrl)}
                          className={`p-1 rounded transition-colors shrink-0 ${
                            isDark
                              ? 'text-zinc-400 hover:text-purple-300 hover:bg-purple-950/40'
                              : 'text-slate-400 hover:text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Expandable Torrent Files Breakdown Table */}
        {showFilesList && torrentFiles.length > 0 && (
          <div
            className={`mt-2 border rounded-lg p-2.5 space-y-1.5 max-h-60 overflow-y-auto overflow-x-hidden w-full max-w-full ${
              isDark
                ? 'bg-[#120c0c] border-purple-500/30'
                : 'bg-white border-purple-200 shadow-sm'
            }`}
          >
            <div
              className={`text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between flex-wrap gap-2 ${
                isDark ? 'text-purple-300' : 'text-purple-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>Files in Torrent ({torrentFiles.length})</span>
                <span className={`text-[10px] font-normal ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Total: {formatBytes(task.totalBytes || 0)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAllFiles}
                  className={`hover:underline cursor-pointer ${
                    isDark ? 'text-purple-400' : 'text-purple-600 font-semibold'
                  }`}
                >
                  Select All
                </button>
                <span className={isDark ? 'text-zinc-600' : 'text-slate-300'}>|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllFiles}
                  className={`hover:underline cursor-pointer ${
                    isDark ? 'text-purple-400' : 'text-purple-600 font-semibold'
                  }`}
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="space-y-1 w-full max-w-full">
              {torrentFiles.map((file, idx) => {
                const prog = typeof file.progress === 'number' ? file.progress : 0;
                const isFileDone = prog >= 100 || file.downloaded === file.length;
                const isSelected = !Array.isArray(task.selectedFileIndices) || task.selectedFileIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleFileSelection(idx)}
                    className={`flex items-center justify-between gap-3 text-[11px] font-mono-stat p-1.5 rounded border transition-colors cursor-pointer w-full max-w-full min-w-0 overflow-hidden ${
                      isDark
                        ? isSelected
                          ? 'bg-[#1a1111] hover:bg-[#251717] border-zinc-800/80'
                          : 'bg-[#120b0b]/60 border-transparent opacity-60 hover:opacity-90'
                        : isSelected
                        ? 'bg-slate-50 hover:bg-purple-50/70 border-slate-200'
                        : 'bg-slate-100/60 border-transparent opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => {}}
                        className={`!p-0 ${isDark ? '!text-purple-400' : '!text-purple-600'}`}
                      />
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? isDark
                              ? 'text-purple-400'
                              : 'text-purple-600'
                            : isDark
                            ? 'text-zinc-500'
                            : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`truncate min-w-0 flex-1 block ${
                          isSelected
                            ? isDark
                              ? 'text-zinc-200'
                              : 'text-slate-800 font-medium'
                            : isDark
                            ? 'text-zinc-500 line-through'
                            : 'text-slate-400 line-through'
                        }`}
                        title={file.name || file.path}
                      >
                        {file.name || file.path}
                      </span>
                      {!isSelected && (
                        <span
                          className={`text-[9px] px-1 rounded shrink-0 ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-slate-200 text-slate-600 font-medium'
                          }`}
                        >
                          Skipped
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <div
                        className={`w-20 h-1.5 rounded-full overflow-hidden ${
                          isDark ? 'bg-zinc-800' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className={`h-full transition-all ${
                            isFileDone
                              ? isDark
                                ? 'bg-emerald-400'
                                : 'bg-emerald-500'
                              : isSelected
                              ? isDark
                                ? 'bg-purple-400'
                                : 'bg-purple-600'
                              : isDark
                              ? 'bg-zinc-600'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] w-10 text-right ${
                          isFileDone
                            ? isDark
                              ? 'text-emerald-400 font-bold'
                              : 'text-emerald-600 font-bold'
                            : isSelected
                            ? isDark
                              ? 'text-zinc-400'
                              : 'text-slate-600'
                            : isDark
                            ? 'text-zinc-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {prog}%
                      </span>
                      <span
                        className={`text-[10px] min-w-[55px] text-right ${
                          isDark ? 'text-zinc-300' : 'text-slate-600'
                        }`}
                      >
                        {formatBytes(file.length || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }


  if (!hasChunks) {
    return (
      <div className="px-4 py-3 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-accent)] flex items-center justify-between text-xs text-[var(--theme-text-muted)] w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span>Single-Stream Download (Server does not support range segmentation or file size is under 1MB)</span>
        </div>
        <div className="font-mono text-[11px] text-[var(--theme-text-primary)]">
          1 Connection Active
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-accent)] space-y-3 select-none w-full max-w-full overflow-hidden">
      {/* Segment Header Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center text-[var(--theme-primary)]">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--theme-text-primary)]">
                Segmented Range Acceleration
              </span>
              <Chip
                size="small"
                label={`${totalChunks} Parallel Streams`}
                className="!bg-[var(--theme-secondary-subtle)] !text-[var(--theme-primary)] !border !border-[var(--theme-border-accent)] !font-bold !text-[10px] !h-4 !px-1"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono-stat">
          <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed: <strong className="text-[var(--theme-text-primary)]">{completedChunks} / {totalChunks}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)]">
            <Activity className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>Active Streams: <strong className="text-[var(--theme-text-primary)]">{activeChunks}</strong></span>
          </div>
        </div>
      </div>

      {/* IDM-Style Proportional Segment Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[var(--theme-text-muted)] font-mono-stat">
          <span>0 B</span>
          <span className="text-[var(--theme-text-primary)] font-semibold">Live Range Stream Visualizer</span>
          <span>{formatBytes(task.totalBytes)}</span>
        </div>

        <div
          className={`h-3.5 w-full rounded-md border overflow-hidden flex gap-[2px] p-[2px] ${
            isDark ? 'bg-[#130d0d] border-[var(--theme-border-accent)]' : 'bg-slate-200 border-[var(--theme-border-accent)]'
          }`}
        >
          {chunks.map((chunk) => {
            const isDone = chunk.status === 'COMPLETED' || chunk.progress >= 100;
            const isActive = chunk.status === 'DOWNLOADING';
            const isPaused = chunk.status === 'PAUSED';
            const isError = chunk.status === 'ERROR';
            const isRetrying = chunk.status === 'RETRYING';
            const chunkProg = isDone ? 100 : Math.max(0, Math.min(100, chunk.progress || 0));

            return (
              <Tooltip
                key={chunk.index}
                arrow
                placement="top"
                title={
                  <div className="text-center text-[11px] font-mono-stat p-1">
                    <div className="font-bold text-white mb-0.5">Thread #{chunk.index + 1}</div>
                    <div className="text-gray-300">
                      {formatBytes(chunk.downloadedBytes || 0)} / {formatBytes(chunk.totalBytes || 0)} ({chunkProg}%)
                    </div>
                    <div className="text-gray-400 text-[10px] mt-0.5">
                      Range: {formatBytes(chunk.startByte)} - {formatBytes(chunk.endByte)}
                    </div>
                    {isActive && chunk.speed > 0 && (
                      <div className="text-emerald-400 font-bold mt-0.5">
                        ⚡ {formatSpeed(chunk.speed)}
                      </div>
                    )}
                  </div>
                }
              >
                <div
                  className={`relative flex-1 h-full rounded-[2px] overflow-hidden group cursor-pointer transition-all hover:opacity-90 ${
                    isDark ? 'bg-[#221717]' : 'bg-slate-300/80'
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-300 rounded-[2px] ${
                      isDone
                        ? 'bg-emerald-500'
                        : isError
                        ? 'bg-rose-600'
                        : isPaused
                        ? 'bg-amber-500'
                        : isRetrying
                        ? 'bg-orange-500'
                        : 'bg-[var(--theme-primary)]'
                    }`}
                    style={{ width: `${chunkProg}%` }}
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Individual Connection Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pt-1">
        {chunks.map((chunk) => {
          const isDone = chunk.status === 'COMPLETED' || chunk.progress >= 100;
          const isActive = chunk.status === 'DOWNLOADING';
          const isPaused = chunk.status === 'PAUSED';
          const isError = chunk.status === 'ERROR';
          const isRetrying = chunk.status === 'RETRYING';
          const chunkProg = isDone ? 100 : Math.max(0, Math.min(100, chunk.progress || 0));

          return (
            <div
              key={chunk.index}
              className={`p-2 rounded-lg border text-left font-mono-stat transition-all ${
                isDone
                  ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
                  : isActive
                  ? 'bg-[var(--theme-secondary-subtle)] border-[var(--theme-primary)]/50 shadow-sm'
                  : isError
                  ? isDark ? 'bg-rose-950/20 border-rose-500/40' : 'bg-rose-50 border-rose-300'
                  : 'bg-[var(--theme-bg-card)] border-[var(--theme-border-accent)]'
              }`}
            >
              {/* Card Header: Thread & Status */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-[var(--theme-text-primary)]">
                  Conn #{chunk.index + 1}
                </span>

                <span className="flex h-2 w-2 relative shrink-0">
                  {isActive && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isDone
                        ? 'bg-emerald-400'
                        : isActive
                        ? 'bg-[var(--theme-primary)]'
                        : isPaused
                        ? 'bg-amber-400'
                        : isError
                        ? 'bg-rose-400'
                        : isRetrying
                        ? 'bg-orange-400'
                        : 'bg-zinc-600'
                    }`}
                  />
                </span>
              </div>

              {/* Progress percentage & Size */}
              <div className="flex items-baseline justify-between gap-1 text-[9px] text-[var(--theme-text-muted)] mb-1">
                <span className={isActive ? 'text-[var(--theme-primary)] font-bold' : isDone ? (isDark ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold') : ''}>
                  {chunkProg}%
                </span>
                <span className="truncate max-w-[55px] text-[8px]" title={`${formatBytes(chunk.downloadedBytes)} / ${formatBytes(chunk.totalBytes)}`}>
                  {formatBytes(chunk.downloadedBytes)}
                </span>
              </div>

              {/* Mini chunk progress bar */}
              <div className={`w-full h-1 rounded-full overflow-hidden mb-1 ${isDark ? 'bg-[#1e1313]' : 'bg-slate-200'}`}>
                <div
                  className={`h-full transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-400'
                      : isError
                      ? 'bg-rose-500'
                      : isPaused
                      ? 'bg-amber-400'
                      : 'bg-[var(--theme-primary)]'
                  }`}
                  style={{ width: `${chunkProg}%` }}
                />
              </div>

              {/* Live speed or state label */}
              <div className="text-[9px] font-bold truncate">
                {isDone ? (
                  <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>Done</span>
                ) : isActive ? (
                  <span className="text-[var(--theme-primary)]">
                    {chunk.speed > 0 ? formatSpeed(chunk.speed) : 'Streaming'}
                  </span>
                ) : isPaused ? (
                  <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>Paused</span>
                ) : isRetrying ? (
                  <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>Retrying</span>
                ) : isError ? (
                  <span className={isDark ? 'text-rose-400' : 'text-rose-600'}>Error</span>
                ) : (
                  <span className="text-[var(--theme-text-muted)]">Queued</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
