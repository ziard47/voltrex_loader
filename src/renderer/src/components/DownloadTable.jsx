import React, { useState, useMemo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import {
  Play,
  Pause,
  XSquare,
  Trash2,
  ExternalLink,
  Folder,
  FileArchive,
  Film,
  Music,
  FileText,
  Binary,
  FileCode,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Minus,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap
} from 'lucide-react';
import ChunkMatrix from './ChunkMatrix';
import { formatBytes, formatSpeed, formatEta, getFileCategory } from '../utils/formatters';

export default function DownloadTable({
  downloads,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onOpenFile,
  onShowInFolder,
  onSetPriority
}) {
  const [deleteModal, setDeleteModal] = useState({ open: false, task: null, deleteDisk: false });
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ column: 'createdAt', direction: 'desc' });

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        if (column === 'fileName') {
          if (prev.direction === 'asc') return { column, direction: 'desc' };
          return { column: 'createdAt', direction: 'desc' };
        } else if (column === 'size') {
          if (prev.direction === 'desc') return { column, direction: 'asc' };
          return { column: 'createdAt', direction: 'desc' };
        } else if (column === 'status') {
          if (prev.direction === 'asc') return { column, direction: 'desc' };
          return { column: 'createdAt', direction: 'desc' };
        } else {
          if (prev.direction === 'asc') return { column, direction: 'desc' };
          return { column: 'createdAt', direction: 'desc' };
        }
      }

      if (column === 'size') {
        return { column, direction: 'desc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const renderSortIndicator = (col) => {
    if (sortConfig.column === col) {
      return sortConfig.direction === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-[#D84040] flex-shrink-0 animate-in fade-in" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-[#D84040] flex-shrink-0 animate-in fade-in" />
      );
    }
    return (
      <ArrowUpDown className="w-3 h-3 text-[#b8a5a5]/30 group-hover/col:text-[#b8a5a5]/80 transition-colors flex-shrink-0" />
    );
  };

  const sortedDownloads = useMemo(() => {
    if (!downloads || downloads.length === 0) return [];

    const getTime = (t) => {
      if (t.createdAt) {
        const time = new Date(t.createdAt).getTime();
        if (!isNaN(time) && time > 0) return time;
      }
      if (typeof t.id === 'number') return t.id;
      const parsedId = Number(t.id);
      if (!isNaN(parsedId)) return parsedId;
      return 0;
    };

    const STATUS_ORDER = {
      DOWNLOADING: 1,
      QUEUED: 2,
      PAUSED: 3,
      ERROR: 4,
      CANCELLED: 5,
      COMPLETED: 6
    };

    const list = [...downloads];

    list.sort((a, b) => {
      let diff = 0;

      if (sortConfig.column === 'fileName') {
        const nameA = (a.fileName || '').toLowerCase();
        const nameB = (b.fileName || '').toLowerCase();
        diff = nameA.localeCompare(nameB);
        if (sortConfig.direction === 'desc') diff = -diff;
      } else if (sortConfig.column === 'size') {
        const sizeA = typeof a.totalBytes === 'number' && a.totalBytes > 0 ? a.totalBytes : (a.downloadedBytes || 0);
        const sizeB = typeof b.totalBytes === 'number' && b.totalBytes > 0 ? b.totalBytes : (b.downloadedBytes || 0);
        diff = sizeA - sizeB;
        if (sortConfig.direction === 'desc') diff = -diff;
      } else if (sortConfig.column === 'status') {
        const weightA = STATUS_ORDER[a.status] ?? 99;
        const weightB = STATUS_ORDER[b.status] ?? 99;
        diff = weightA - weightB;
        if (sortConfig.direction === 'desc') diff = -diff;
      } else if (sortConfig.column === 'createdAt') {
        diff = getTime(a) - getTime(b);
        if (sortConfig.direction === 'desc') diff = -diff;
      }

      // Tie-breaker: newest downloads first
      if (diff === 0) {
        diff = getTime(b) - getTime(a);
      }

      return diff;
    });

    return list;
  }, [downloads, sortConfig]);

  const toggleRowExpanded = (taskId, e) => {
    if (e) e.stopPropagation();
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleContextMenu = (e, task) => {
    e.preventDefault();
    setSelectedId(task.id);
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      task
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const copyToClipboard = async (text, successMsg) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setToast({ open: true, message: successMsg });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'DOWNLOADING':
        return (
          <Tooltip title="Downloading (Active transfer)" arrow placement="top">
            <Chip
              size="small"
              label="Downloading"
              className="status-chip-active !bg-[var(--theme-primary)]/15 !text-[var(--theme-primary)] !border !border-[var(--theme-primary)]/40 !font-semibold !text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
            />
          </Tooltip>
        );
      case 'QUEUED':
        return (
          <Chip
            size="small"
            label="Queued"
            className="status-chip-queued !bg-[#2e1d1d] dark:!bg-[#2e1d1d] !text-slate-700 dark:!text-[#EEEEEE] !border !border-slate-300 dark:!border-[#8E1616]/40 !font-semibold !text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
          />
        );
      case 'PAUSED':
        return (
          <Chip
            size="small"
            label="Paused"
            className="status-chip-paused !bg-amber-500/15 !text-amber-600 dark:!text-amber-400 !border !border-amber-500/30 !font-semibold !text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
          />
        );
      case 'COMPLETED':
        return (
          <Chip
            size="small"
            label="Completed"
            className="status-chip-completed !bg-emerald-500/15 !text-emerald-600 dark:!text-emerald-400 !border !border-emerald-500/30 !font-semibold !text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
          />
        );
      case 'ERROR':
        return (
          <Chip
            size="small"
            label="Error"
            className="status-chip-error !bg-rose-500/15 !text-rose-600 dark:!text-[#D84040] !border !border-rose-500/40 dark:!border-[#D84040]/50 !font-semibold !text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
          />
        );
      case 'CANCELLED':
        return (
          <Chip
            size="small"
            label="Cancelled"
            className="status-chip-cancelled !bg-slate-200 dark:!bg-[#241717] !text-slate-600 dark:!text-[#b8a5a5] !border !border-slate-300 dark:!border-[#8E1616]/30 !font-semibold !text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
          />
        );
      default:
        return (
          <Chip
            size="small"
            label={status}
            className="!text-[10px] !h-5 !px-1.5 [&_.MuiChip-label]:!px-1.5 [&_.MuiChip-label]:!overflow-visible"
          />
        );
    }
  };


  const renderFileIcon = (fileName, mimeType) => {
    const cat = getFileCategory(fileName, mimeType);
    switch (cat) {
      case 'compressed':
        return <FileArchive className="w-4 h-4 text-amber-400" />;
      case 'video':
        return <Film className="w-4 h-4 text-purple-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-pink-400" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'programs':
        return <Binary className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-400" />;
    }
  };

  if (downloads.length === 0) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-4 text-slate-500">
          <Folder className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">No Downloads in this View</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Click "+ Add URL" at the top to check an online download link and start transferring files.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full overflow-hidden">
      <TableContainer className="w-full h-full select-none overflow-x-auto overflow-y-auto">
        <Table stickyHeader size="small" className="w-full min-w-[725px]">
          <TableHead>
            <TableRow>
              <TableCell
                onClick={() => handleSort('fileName')}
                className="!bg-[#171010] !text-[#b8a5a5] hover:!text-[#EEEEEE] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-auto min-w-[200px] cursor-pointer group/col select-none transition-colors"
                title="Click to sort by File Name (A-Z / Z-A)"
              >
                <div className="flex items-center justify-between gap-1.5 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span>File Name</span>
                    {renderSortIndicator('fileName')}
                  </div>
                  {sortConfig.column !== 'createdAt' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortConfig({ column: 'createdAt', direction: 'desc' });
                      }}
                      className="text-[9px] normal-case tracking-normal px-1.5 py-0.5 rounded bg-[#8E1616]/40 hover:bg-[#8E1616]/70 text-[#EEEEEE] border border-[#8E1616]/60 transition-colors flex items-center gap-1 shadow-sm"
                      title="Reset sorting to Newest First"
                    >
                      <span>Newest</span>
                      <XSquare className="w-2.5 h-2.5 opacity-80" />
                    </button>
                  )}
                </div>
              </TableCell>
              <TableCell
                onClick={() => handleSort('size')}
                className="!bg-[#171010] !text-[#b8a5a5] hover:!text-[#EEEEEE] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[100px] min-w-[95px] whitespace-nowrap cursor-pointer group/col select-none transition-colors"
                title="Click to sort by File Size"
              >
                <div className="flex items-center gap-1.5">
                  <span>Size</span>
                  {renderSortIndicator('size')}
                </div>
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[145px] min-w-[130px] whitespace-nowrap">
                Progress
              </TableCell>
              <TableCell
                onClick={() => handleSort('status')}
                className="!bg-[#171010] !text-[#b8a5a5] hover:!text-[#EEEEEE] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[125px] min-w-[120px] whitespace-nowrap !px-2 cursor-pointer group/col select-none transition-colors"
                title="Click to sort by Status"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </div>
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[90px] min-w-[85px] whitespace-nowrap">
                Speed
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[75px] min-w-[70px] whitespace-nowrap">
                ETA
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedDownloads.map((task) => {
              const isDownloading = task.status === 'DOWNLOADING';
              const isPaused = task.status === 'PAUSED';
              const isCompleted = task.status === 'COMPLETED';
              const isError = task.status === 'ERROR';
              const isCancelled = task.status === 'CANCELLED';
              const isQueued = task.status === 'QUEUED';
              const isExpanded = expandedRows.has(task.id);
              const hasChunks = task.chunks && task.chunks.length > 0;
              const connCount = task.connections || (hasChunks ? task.chunks.length : 1);

              return (
                <React.Fragment key={task.id}>
                  <TableRow
                    onContextMenu={(e) => handleContextMenu(e, task)}
                    onClick={() => setSelectedId(task.id)}
                    onDoubleClick={() => (isCompleted ? onOpenFile(task.id) : onShowInFolder(task.id))}
                    className={`transition-colors group cursor-pointer ${
                      selectedId === task.id || contextMenu?.task?.id === task.id
                        ? '!bg-[var(--theme-secondary-subtle)]'
                        : ''
                    } ${isExpanded ? '!border-b-0' : ''}`}
                  >
                    {/* File Name & Path - expands to fill all available width */}
                    <TableCell className="!border-b !border-[#8E1616]/25 !py-2.5 overflow-hidden max-w-0">
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        {/* Expand / Collapse Chevron */}
                        <Tooltip title={isExpanded ? 'Collapse Segment Grid' : 'Expand Visual Segment Chunk Grid'} arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => toggleRowExpanded(task.id, e)}
                            className={`!p-1 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !transition-transform shrink-0 ${
                              isExpanded ? 'rotate-90 !text-[var(--theme-primary)]' : ''
                            }`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </IconButton>
                        </Tooltip>

                        <div className="w-8 h-8 rounded-lg bg-[#241717] border border-[#8E1616]/40 flex items-center justify-center shrink-0">
                          {renderFileIcon(task.fileName, task.mimeType)}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-xs font-semibold text-[#EEEEEE] truncate cursor-pointer hover:text-[#D84040] transition-colors"
                              title={task.fileName}
                              onClick={() => (isCompleted ? onOpenFile(task.id) : null)}
                            >
                              {task.fileName}
                            </span>
                            {connCount > 1 && (
                              <Tooltip title={`Multi-Connection Range Acceleration (${connCount} threads)`} arrow>
                                <span
                                  onClick={(e) => toggleRowExpanded(task.id, e)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] border border-[var(--theme-border-accent)] shrink-0 cursor-pointer hover:border-[var(--theme-primary)]"
                                >
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>{connCount}x</span>
                                </span>
                              </Tooltip>
                            )}
                            {task.packageName && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#8E1616]/30 text-[#D84040] border border-[#D84040]/30 shrink-0"
                                title={`Package: ${task.packageName}`}
                              >
                                <Folder className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[120px]">{task.packageName}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#b8a5a5] truncate mt-0.5 font-mono" title={task.url}>
                            {task.url}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Size */}
                    <TableCell className="!border-b !border-[#8E1616]/25 !py-3 whitespace-nowrap w-[100px] min-w-[95px]">
                      <div className="font-mono-stat text-xs text-[#EEEEEE]">
                        {formatBytes(task.downloadedBytes)}
                      </div>
                      <div className="text-[10px] text-[#b8a5a5] font-mono-stat mt-0.5">
                        {task.totalBytes > 0 ? `of ${formatBytes(task.totalBytes)}` : 'Streamed'}
                      </div>
                    </TableCell>

                    {/* Progress Bar & Percent */}
                    <TableCell className="!border-b !border-[#8E1616]/25 !py-3 whitespace-nowrap w-[145px] min-w-[130px]">
                      <div className="space-y-1.5 min-w-[130px]">
                        <div className="flex justify-between items-center text-[11px] font-mono-stat">
                          <span className={isDownloading ? 'text-[#D84040] font-semibold' : 'text-[#b8a5a5]'}>
                            {task.progress}%
                          </span>
                          {task.totalBytes > 0 && (
                            <span className="text-[10px] text-[#b8a5a5]">
                              {formatBytes(task.downloadedBytes)}
                            </span>
                          )}
                        </div>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress}
                          className="!rounded-full !h-2 !bg-[#261818]"
                          sx={{
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              backgroundColor: isCompleted
                                ? '#34d399'
                                : isError
                                ? '#8E1616'
                                : isPaused
                                ? '#fbbf24'
                                : '#D84040'
                            }
                          }}
                        />
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="!border-b !border-[#8E1616]/25 !py-2.5 whitespace-nowrap !px-2 w-[125px] min-w-[120px]">
                      {getStatusChip(task.status)}
                    </TableCell>

                    {/* Speed */}
                    <TableCell className="!border-b !border-[#8E1616]/25 !py-3 font-mono-stat text-xs text-[#EEEEEE] whitespace-nowrap w-[90px] min-w-[85px]">
                      {isDownloading ? (
                        <span className="text-[#D84040] font-semibold">{formatSpeed(task.speed)}</span>
                      ) : (
                        <span className="text-[#8E1616]">--</span>
                      )}
                    </TableCell>

                    {/* ETA */}
                    <TableCell className="!border-b !border-[#8E1616]/25 !py-3 font-mono-stat text-xs text-[#b8a5a5] whitespace-nowrap w-[75px] min-w-[70px]">
                      {isDownloading ? formatEta(task.eta) : '--'}
                    </TableCell>
                  </TableRow>

                  {/* Expandable Visual Chunk Matrix Row */}
                  {isExpanded && (
                    <TableRow className="!bg-[var(--theme-bg-surface)]/70">
                      <TableCell colSpan={6} className="!p-0 !border-b !border-[#8E1616]/30">
                        <ChunkMatrix task={task} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Right-Click File Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          className: '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-xl !shadow-2xl !py-1 !min-w-[240px] !text-[var(--theme-text-primary)]'
        }}
        MenuListProps={{
          className: '!py-0 !bg-transparent'
        }}
      >
        {contextMenu?.task && (
          <>
            {/* Context Menu Header */}
            <div className="px-3 py-2.5 border-b border-[var(--theme-border-accent)] bg-[var(--theme-bg-surface)] rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[var(--theme-secondary-subtle)] border border-[var(--theme-border-accent)] flex items-center justify-center flex-shrink-0 text-[var(--theme-primary)]">
                  {renderFileIcon(contextMenu.task.fileName, contextMenu.task.mimeType)}
                </div>
                <span className="text-xs font-semibold text-[var(--theme-text-primary)] truncate max-w-[200px]" title={contextMenu.task.fileName}>
                  {contextMenu.task.fileName}
                </span>
              </div>
              <div className="text-[10px] text-[var(--theme-text-muted)] mt-1.5 flex justify-between items-center font-mono-stat">
                <span>
                  {contextMenu.task.totalBytes > 0
                    ? `${formatBytes(contextMenu.task.downloadedBytes)} / ${formatBytes(contextMenu.task.totalBytes)}`
                    : formatBytes(contextMenu.task.downloadedBytes)}
                </span>
                <span className="uppercase text-[9px] font-bold text-[var(--theme-primary)]">
                  {contextMenu.task.status}
                </span>
              </div>
            </div>

            {/* Transfer Control Items */}
            <div className="py-1">
              {(contextMenu.task.status === 'DOWNLOADING' || contextMenu.task.status === 'QUEUED') && (
                <MenuItem
                  onClick={() => {
                    onPause(contextMenu.task.id);
                    handleCloseContextMenu();
                  }}
                  className="!text-xs !text-amber-400 hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
                >
                  <Pause className="w-4 h-4 mr-2.5 text-amber-400" />
                  <span>Pause Download</span>
                </MenuItem>
              )}

              {(contextMenu.task.status === 'PAUSED' || contextMenu.task.status === 'ERROR' || contextMenu.task.status === 'CANCELLED') && (
                <MenuItem
                  onClick={() => {
                    onResume(contextMenu.task.id);
                    handleCloseContextMenu();
                  }}
                  className="!text-xs !text-emerald-400 hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
                >
                  <Play className="w-4 h-4 mr-2.5 text-emerald-400" />
                  <span>{contextMenu.task.status === 'ERROR' ? 'Retry Download' : 'Resume Download'}</span>
                </MenuItem>
              )}

              {(contextMenu.task.status === 'DOWNLOADING' || contextMenu.task.status === 'QUEUED') && (
                <MenuItem
                  onClick={() => {
                    onCancel(contextMenu.task.id);
                    handleCloseContextMenu();
                  }}
                  className="!text-xs !text-[#b8a5a5] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
                >
                  <XSquare className="w-4 h-4 mr-2.5 text-rose-400" />
                  <span>Cancel Download</span>
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  toggleRowExpanded(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[var(--theme-text-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
              >
                <Zap className="w-4 h-4 mr-2.5 text-[var(--theme-primary)]" />
                <span>
                  {expandedRows.has(contextMenu.task.id) ? 'Hide Segment Chunk Matrix' : 'View Segment Chunk Matrix'}
                </span>
              </MenuItem>
            </div>

            <div className="border-t border-[var(--theme-border-accent)]" />

            {/* File & Folder Actions */}
            <div className="py-1">
              <MenuItem
                disabled={contextMenu.task.status !== 'COMPLETED'}
                onClick={() => {
                  onOpenFile(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#EEEEEE] disabled:!text-[#6b5555] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
              >
                <ExternalLink className="w-4 h-4 mr-2.5 text-sky-400" />
                <span>Open File</span>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  onShowInFolder(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#EEEEEE] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
              >
                <Folder className="w-4 h-4 mr-2.5 text-amber-400" />
                <span>Open Containing Folder</span>
              </MenuItem>
            </div>

            <div className="border-t border-[var(--theme-border-accent)]" />

            {/* Clipboard options */}
            <div className="py-1">
              <MenuItem
                onClick={() => {
                  copyToClipboard(contextMenu.task.url, 'Download link copied to clipboard');
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#EEEEEE] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
              >
                <Copy className="w-4 h-4 mr-2.5 text-[var(--theme-primary)]" />
                <span>Copy Download Link</span>
              </MenuItem>

              {contextMenu.task.savePath && (
                <MenuItem
                  onClick={() => {
                    copyToClipboard(contextMenu.task.savePath, 'File path copied to clipboard');
                    handleCloseContextMenu();
                  }}
                  className="!text-xs !text-[#EEEEEE] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
                >
                  <FileText className="w-4 h-4 mr-2.5 text-[var(--theme-primary)]" />
                  <span>Copy Save Path</span>
                </MenuItem>
              )}
            </div>

            <div className="border-t border-[var(--theme-border-accent)]" />

            {/* Priority Selector */}
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#b8a5a5] uppercase tracking-wider">
              Priority
            </div>
            <div className="flex px-3 pb-2 gap-1.5">
              {[
                { key: 'HIGH', label: 'High', icon: ArrowUp },
                { key: 'NORMAL', label: 'Normal', icon: Minus },
                { key: 'LOW', label: 'Low', icon: ArrowDown }
              ].map(({ key, label, icon: Icon }) => {
                const isCur = (contextMenu.task.priority || 'NORMAL') === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onSetPriority(contextMenu.task.id, key);
                      handleCloseContextMenu();
                    }}
                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium border transition-colors flex items-center justify-center gap-1 ${
                      isCur
                        ? '!border-[var(--theme-primary)] !bg-[var(--theme-primary)] !text-white font-bold shadow-sm'
                        : 'border-[var(--theme-border-accent)] text-slate-400 dark:text-[#EEEEEE] hover:!border-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] hover:!text-[var(--theme-primary)]'
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[var(--theme-border-accent)]" />

            {/* Removal & Deletion */}
            <div className="py-1">
              <MenuItem
                onClick={() => {
                  onDelete(contextMenu.task.id, false);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[var(--theme-secondary-subtle)] !py-2 !px-3"
              >
                <Trash2 className="w-4 h-4 mr-2.5 text-[#b8a5a5]" />
                <span>Remove from List</span>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  const taskToDelete = contextMenu.task;
                  handleCloseContextMenu();
                  setDeleteModal({ open: true, task: taskToDelete, deleteDisk: true });
                }}
                className="!text-xs !text-rose-400 hover:!bg-rose-500/15 !py-2 !px-3"
              >
                <Trash2 className="w-4 h-4 mr-2.5 text-rose-400" />
                <span className="text-rose-400 font-medium">Delete File from Disk...</span>
              </MenuItem>
            </div>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, task: null, deleteDisk: false })}
        PaperProps={{ className: '!bg-[#1D1616] !border !border-[#8E1616]/50 !rounded-xl !text-[#EEEEEE] !min-w-[360px]' }}
      >
        <DialogTitle className="!text-sm font-bold !text-[#EEEEEE] !border-b !border-[#8E1616]/30">
          Delete Download Task
        </DialogTitle>
        <DialogContent className="space-y-3 !pt-4">
          <p className="text-xs text-[#b8a5a5]">
            Are you sure you want to remove <span className="font-semibold text-[#EEEEEE]">"{deleteModal.task?.fileName}"</span> from your downloads?
          </p>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteModal.deleteDisk}
                onChange={(e) => setDeleteModal({ ...deleteModal, deleteDisk: e.target.checked })}
                size="small"
                sx={{
                  color: 'var(--theme-border-accent)',
                  '&.Mui-checked': {
                    color: 'var(--theme-primary)'
                  }
                }}
              />
            }
            label={
              <span className="text-xs text-slate-700 dark:text-[#EEEEEE]/90">
                Also permanently delete the downloaded file from disk
              </span>
            }
          />
        </DialogContent>
        <DialogActions className="!px-6 !py-3 !border-t !border-[#8E1616]/30">
          <Button
            size="small"
            variant="outlined"
            onClick={() => setDeleteModal({ open: false, task: null, deleteDisk: false })}
            className="border border-[var(--theme-border-accent)] text-slate-600 dark:text-[#b8a5a5] hover:!border-[var(--theme-primary)] hover:!text-[var(--theme-primary)] hover:!bg-[var(--theme-secondary-subtle)] !text-xs !py-1 !px-3 rounded-lg transition-all"
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            className="!bg-[#8E1616] hover:!bg-[#D84040] !text-white !font-medium"
            onClick={() => {
              if (deleteModal.task) {
                onDelete(deleteModal.task.id, deleteModal.deleteDisk);
              }
              setDeleteModal({ open: false, task: null, deleteDisk: false });
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
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
          <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span style={{ color: 'var(--theme-text-primary)' }}>{toast.message}</span>
        </div>
      </Snackbar>
    </div>
  );
}
