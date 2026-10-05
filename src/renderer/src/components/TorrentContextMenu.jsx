import React, { useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import {
  Magnet,
  Play,
  Pause,
  XSquare,
  Zap,
  Layers,
  Folder,
  FolderTree,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Radio,
  Gauge,
  Sliders,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  Hash,
  Users,
  Activity,
  Download,
  Upload
} from 'lucide-react';
import { formatBytes, formatSpeed } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

export default function TorrentContextMenu({
  task,
  anchorPosition,
  open,
  onClose,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onOpenFile,
  onShowInFolder,
  onSetPriority,
  isExpanded,
  onToggleExpanded,
  onCopy
}) {
  const [copiedHash, setCopiedHash] = useState(false);
  const { effectiveMode } = useTheme();
  const isDark = effectiveMode === 'dark';

  if (!task) return null;

  const isDownloading = task.status === 'DOWNLOADING';
  const isQueued = task.status === 'QUEUED';
  const isPaused = task.status === 'PAUSED';
  const isError = task.status === 'ERROR';
  const isCancelled = task.status === 'CANCELLED';
  const isCompleted = task.status === 'COMPLETED';

  const filesCount = Array.isArray(task.files) ? task.files.length : 0;
  const trackersCount = Array.isArray(task.trackers) ? task.trackers.length : 0;
  const dlLimit = Number(task.downloadLimitKBps) || 0;
  const ulLimit = Number(task.uploadLimitKBps) || 0;

  const handleCopyHash = (e) => {
    e.stopPropagation();
    if (task.infoHash) {
      onCopy(task.infoHash, 'InfoHash copied to clipboard');
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyTrackers = () => {
    if (Array.isArray(task.trackers) && task.trackers.length > 0) {
      onCopy(task.trackers.join('\n'), `${task.trackers.length} trackers copied to clipboard`);
    } else {
      onCopy('', 'No trackers to copy');
    }
    onClose();
  };

  const getStatusColor = () => {
    if (!isDark) {
      switch (task.status) {
        case 'DOWNLOADING':
          return 'bg-purple-100 text-purple-700 border-purple-300';
        case 'COMPLETED':
          return 'bg-emerald-100 text-emerald-700 border-emerald-300';
        case 'PAUSED':
          return 'bg-amber-100 text-amber-700 border-amber-300';
        case 'QUEUED':
          return 'bg-sky-100 text-sky-700 border-sky-300';
        case 'ERROR':
          return 'bg-rose-100 text-rose-700 border-rose-300';
        default:
          return 'bg-slate-100 text-slate-700 border-slate-300';
      }
    }
    switch (task.status) {
      case 'DOWNLOADING':
        return 'bg-purple-900/60 text-purple-200 border-purple-500/40';
      case 'COMPLETED':
        return 'bg-emerald-900/60 text-emerald-200 border-emerald-500/40';
      case 'PAUSED':
        return 'bg-amber-900/60 text-amber-200 border-amber-500/40';
      case 'QUEUED':
        return 'bg-sky-900/60 text-sky-200 border-sky-500/40';
      case 'ERROR':
        return 'bg-rose-900/60 text-rose-200 border-rose-500/40';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
      PaperProps={{
        className: isDark
          ? '!bg-[#150d18] !border !border-purple-500/40 !rounded-2xl !shadow-2xl !shadow-purple-950/50 !py-0 !min-w-[285px] !max-w-[335px] !text-[#EEEEEE] overflow-hidden'
          : '!bg-white !border !border-purple-200 !rounded-2xl !shadow-2xl !shadow-purple-900/10 !py-0 !min-w-[285px] !max-w-[335px] !text-slate-800 overflow-hidden'
      }}
      MenuListProps={{
        className: '!py-0 !bg-transparent'
      }}
    >
      {/* Torrent Header Banner */}
      <div
        className={
          isDark
            ? 'px-3.5 py-3 bg-gradient-to-r from-[#24102d] via-[#1a0c20] to-[#120717] border-b border-purple-500/30'
            : 'px-3.5 py-3 bg-gradient-to-r from-purple-100/90 via-purple-50/70 to-indigo-50/90 border-b border-purple-200'
        }
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                isDark
                  ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                  : 'bg-purple-100 border-purple-300 text-purple-700'
              }`}
            >
              <Magnet className="w-3 h-3" />
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider font-mono truncate ${
                isDark ? 'text-purple-300' : 'text-purple-700'
              }`}
            >
              BitTorrent Transfer
            </span>
          </div>

          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${getStatusColor()}`}
          >
            {task.status}
          </span>
        </div>

        {/* Torrent Name */}
        <div
          className={`text-xs font-semibold truncate mb-1.5 ${
            isDark ? 'text-zinc-100' : 'text-slate-900'
          }`}
          title={task.fileName || 'Torrent'}
        >
          {task.fileName || 'Torrent'}
        </div>

        {/* Progress & Size Stats */}
        <div className="space-y-1">
          <div
            className={`flex items-center justify-between text-[10px] font-mono-stat ${
              isDark ? 'text-zinc-300' : 'text-slate-600'
            }`}
          >
            <span>
              {task.totalBytes > 0
                ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
                : formatBytes(task.downloadedBytes)}
            </span>
            <span className={`font-bold ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              {task.progress || 0}%
            </span>
          </div>

          {/* Mini Progress Bar */}
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800/80' : 'bg-slate-200'
            }`}
          >
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted
                  ? isDark
                    ? 'bg-emerald-400'
                    : 'bg-emerald-500'
                  : isDark
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-400'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
            />
          </div>
        </div>

        {/* Swarm & Speed Telemetry */}
        <div
          className={`flex items-center justify-between text-[10px] font-mono-stat mt-2 pt-1.5 border-t ${
            isDark ? 'border-purple-500/20 text-zinc-400' : 'border-purple-200/70 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-1">
            <Users className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>
              {task.peers || 0} peers • {task.seeds || 0} seeds
            </span>
          </div>

          {(task.speed > 0 || task.uploadSpeed > 0) && (
            <div className="flex items-center gap-2">
              {task.speed > 0 && (
                <span
                  className={`font-semibold flex items-center ${
                    isDark ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  <Download className="w-2.5 h-2.5 mr-0.5" />
                  {formatSpeed(task.speed)}
                </span>
              )}
              {task.uploadSpeed > 0 && (
                <span
                  className={`font-semibold flex items-center ${
                    isDark ? 'text-cyan-400' : 'text-indigo-600'
                  }`}
                >
                  <Upload className="w-2.5 h-2.5 mr-0.5" />
                  {formatSpeed(task.uploadSpeed)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* InfoHash Snippet */}
        {task.infoHash && (
          <div
            className={`flex items-center justify-between gap-1 text-[9px] font-mono px-2 py-0.5 rounded border mt-1.5 ${
              isDark
                ? 'bg-[#140b17] border-purple-500/20 text-zinc-400'
                : 'bg-purple-50 border-purple-200 text-slate-600'
            }`}
          >
            <span className="truncate">Hash: {task.infoHash}</span>
            <button
              type="button"
              onClick={handleCopyHash}
              className={`shrink-0 ml-1 cursor-pointer transition-colors ${
                isDark
                  ? 'text-purple-400 hover:text-white'
                  : 'text-purple-600 hover:text-purple-800'
              }`}
              title="Copy InfoHash"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>

      {/* Group 1: Primary Torrent Controls */}
      <div className="py-1">
        {(isDownloading || isQueued) && (
          <MenuItem
            onClick={() => {
              onPause(task.id);
              onClose();
            }}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-amber-300 hover:!bg-amber-950/30'
                : '!text-amber-700 hover:!bg-amber-50'
            }`}
          >
            <Pause className="w-4 h-4 mr-2.5 text-amber-500" />
            <span>Pause Torrent</span>
          </MenuItem>
        )}

        {(isPaused || isError || isCancelled) && (
          <MenuItem
            onClick={() => {
              onResume(task.id);
              onClose();
            }}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-emerald-300 hover:!bg-emerald-950/30'
                : '!text-emerald-700 hover:!bg-emerald-50'
            }`}
          >
            <Play className="w-4 h-4 mr-2.5 text-emerald-500" />
            <span>{isError ? 'Retry Torrent' : 'Resume Torrent'}</span>
          </MenuItem>
        )}

        {(isDownloading || isQueued) && (
          <MenuItem
            onClick={() => {
              onCancel(task.id);
              onClose();
            }}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-rose-300 hover:!bg-rose-950/30'
                : '!text-rose-700 hover:!bg-rose-50'
            }`}
          >
            <XSquare className="w-4 h-4 mr-2.5 text-rose-500" />
            <span>Cancel Torrent</span>
          </MenuItem>
        )}
      </div>

      <div className={`border-t ${isDark ? 'border-purple-500/20' : 'border-purple-100'}`} />

      {/* Group 2: Swarm & Deep Telemetry */}
      <div className="py-1">
        <MenuItem
          onClick={() => {
            onToggleExpanded('matrix');
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 flex items-center justify-between ${
            isDark
              ? '!text-purple-200 hover:!bg-purple-900/30'
              : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
          }`}
        >
          <div className="flex items-center min-w-0">
            <Layers className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>{isExpanded ? 'Collapse Swarm & Pieces' : 'View Swarm & Piece Matrix'}</span>
          </div>
          <Zap className={`w-3 h-3 ml-2 shrink-0 ${isDark ? 'text-purple-400/70' : 'text-purple-600/70'}`} />
        </MenuItem>

        <MenuItem
          onClick={() => {
            onToggleExpanded('files');
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 flex items-center justify-between ${
            isDark
              ? '!text-purple-200 hover:!bg-purple-900/30'
              : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
          }`}
        >
          <div className="flex items-center min-w-0">
            <FolderTree className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Select / Deselect Files</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ml-2 shrink-0 border ${
              isDark
                ? 'bg-purple-950 border-purple-500/30 text-purple-300'
                : 'bg-purple-100 border-purple-200 text-purple-800 font-semibold'
            }`}
          >
            {filesCount} {filesCount === 1 ? 'file' : 'files'}
          </span>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onToggleExpanded('trackers');
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 flex items-center justify-between ${
            isDark
              ? '!text-purple-200 hover:!bg-purple-900/30'
              : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
          }`}
        >
          <div className="flex items-center min-w-0">
            <Radio className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Manage Trackers</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono ml-2 shrink-0 border ${
              isDark
                ? 'bg-purple-950 border-purple-500/30 text-purple-300'
                : 'bg-purple-100 border-purple-200 text-purple-800 font-semibold'
            }`}
          >
            {trackersCount}
          </span>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onToggleExpanded('limits');
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 flex items-center justify-between ${
            isDark
              ? '!text-purple-200 hover:!bg-purple-900/30'
              : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
          }`}
        >
          <div className="flex items-center min-w-0">
            <Gauge className={`w-4 h-4 mr-2.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Torrent Speed Limits</span>
          </div>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-mono ml-2 shrink-0 border ${
              isDark
                ? 'bg-purple-950 border-purple-500/30 text-purple-300'
                : 'bg-purple-100 border-purple-200 text-purple-800 font-semibold'
            }`}
          >
            {dlLimit > 0 || ulLimit > 0 ? `${dlLimit || '∞'}↓ / ${ulLimit || '∞'}↑` : 'No limits'}
          </span>
        </MenuItem>
      </div>

      <div className={`border-t ${isDark ? 'border-purple-500/20' : 'border-purple-100'}`} />

      {/* Group 3: File & Storage Access */}
      <div className="py-1">
        <MenuItem
          disabled={!isCompleted}
          onClick={() => {
            onOpenFile(task.id);
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 ${
            isDark
              ? '!text-zinc-200 disabled:!text-zinc-600 hover:!text-sky-300 hover:!bg-sky-950/30'
              : '!text-slate-700 disabled:!text-slate-400 hover:!text-sky-700 hover:!bg-sky-50'
          }`}
        >
          <ExternalLink className={`w-4 h-4 mr-2.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
          <span>Open Downloaded Files</span>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onShowInFolder(task.id);
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 ${
            isDark
              ? '!text-zinc-200 hover:!text-amber-300 hover:!bg-amber-950/30'
              : '!text-slate-700 hover:!text-amber-700 hover:!bg-amber-50'
          }`}
        >
          <Folder className={`w-4 h-4 mr-2.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span>Open Containing Folder</span>
        </MenuItem>
      </div>

      <div className={`border-t ${isDark ? 'border-purple-500/20' : 'border-purple-100'}`} />

      {/* Group 4: Torrent Clipboard Actions */}
      <div className="py-1">
        {(task.magnetUri || task.url) && (
          <MenuItem
            onClick={() => {
              onCopy(task.magnetUri || task.url, 'Magnet URI copied to clipboard');
              onClose();
            }}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-purple-200 hover:!bg-purple-900/30'
                : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
            }`}
          >
            <Magnet className={`w-4 h-4 mr-2.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Copy Magnet Link</span>
          </MenuItem>
        )}

        {task.infoHash && (
          <MenuItem
            onClick={() => {
              onCopy(task.infoHash, 'InfoHash copied to clipboard');
              onClose();
            }}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-purple-200 hover:!bg-purple-900/30'
                : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
            }`}
          >
            <Hash className={`w-4 h-4 mr-2.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Copy InfoHash (HEX)</span>
          </MenuItem>
        )}

        {trackersCount > 0 && (
          <MenuItem
            onClick={handleCopyTrackers}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-purple-200 hover:!bg-purple-900/30'
                : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
            }`}
          >
            <Radio className={`w-4 h-4 mr-2.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Copy All Announce Trackers</span>
          </MenuItem>
        )}

        {task.savePath && (
          <MenuItem
            onClick={() => {
              onCopy(task.savePath, 'Save path copied to clipboard');
              onClose();
            }}
            className={`!text-xs !py-1.5 !px-3 ${
              isDark
                ? '!text-zinc-300 hover:!bg-purple-900/30'
                : '!text-slate-700 hover:!bg-purple-50 hover:!text-purple-900'
            }`}
          >
            <FileText className={`w-4 h-4 mr-2.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
            <span>Copy Save Path</span>
          </MenuItem>
        )}
      </div>

      <div className={`border-t ${isDark ? 'border-purple-500/20' : 'border-purple-100'}`} />

      {/* Group 5: Queue Priority */}
      <div
        className={`px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider font-mono ${
          isDark ? 'text-purple-300/80' : 'text-purple-900/80'
        }`}
      >
        Torrent Priority
      </div>
      <div className="flex px-3 pb-2 gap-1.5">
        {[
          { key: 'HIGH', label: 'High', icon: ArrowUp },
          { key: 'NORMAL', label: 'Normal', icon: Minus },
          { key: 'LOW', label: 'Low', icon: ArrowDown }
        ].map(({ key, label, icon: Icon }) => {
          const isCur = (task.priority || 'NORMAL') === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onSetPriority(task.id, key);
                onClose();
              }}
              className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                isCur
                  ? isDark
                    ? 'border-purple-400 bg-purple-600 text-white font-bold shadow-md shadow-purple-900/40'
                    : 'border-purple-600 bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                  : isDark
                  ? 'border-purple-500/30 bg-[#1e1022] text-zinc-400 hover:border-purple-400/60 hover:text-purple-200'
                  : 'border-purple-200 bg-purple-50/60 text-slate-600 hover:border-purple-300 hover:bg-purple-100 hover:text-purple-900'
              }`}
            >
              <Icon className="w-2.5 h-2.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div className={`border-t ${isDark ? 'border-purple-500/20' : 'border-purple-100'}`} />

      {/* Group 6: Removal & Deletion */}
      <div className="py-1">
        <MenuItem
          onClick={() => {
            onDelete(task.id, false);
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 ${
            isDark
              ? '!text-zinc-400 hover:!text-zinc-200 hover:!bg-zinc-800/60'
              : '!text-slate-600 hover:!text-slate-900 hover:!bg-slate-100'
          }`}
        >
          <Trash2 className="w-4 h-4 mr-2.5 text-zinc-400" />
          <span>Remove Torrent from List</span>
        </MenuItem>

        <MenuItem
          onClick={() => {
            onDelete(task.id, true);
            onClose();
          }}
          className={`!text-xs !py-1.5 !px-3 ${
            isDark
              ? '!text-rose-400 hover:!bg-rose-950/30'
              : '!text-rose-600 hover:!bg-rose-50'
          }`}
        >
          <Trash2 className="w-4 h-4 mr-2.5 text-rose-500" />
          <span className="font-semibold text-rose-500">Delete Torrent & Data from Disk...</span>
        </MenuItem>
      </div>
    </Menu>
  );
}

