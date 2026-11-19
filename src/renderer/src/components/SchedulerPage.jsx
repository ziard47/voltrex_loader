import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';

import {
  CalendarClock,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Play,
  Pause,
  Check,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  X,
  Clock,
  ListOrdered,
  Ban,
  FileText,
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Zap,
  Gauge,
  Film,
  Music,
  FileArchive,
  Binary
} from 'lucide-react';

import { formatBytes, formatSpeed, formatEta, getFileCategory } from '../utils/formatters';

const DAYS_OF_WEEK = [
  { day: 0, label: 'Sunday' },
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' }
];

export default function SchedulerPage({
  onBack,
  downloads = [],
  onPauseDownload,
  onResumeDownload,
  onOpenFile,
  onShowInFolder
}) {
  const [queues, setQueues] = useState([]);
  const [downloadLimits, setDownloadLimits] = useState({
    enabled: false,
    maxMBytes: 5000,
    perHours: 24,
    speedLimitEnabled: false,
    speedLimitKBps: 500,
    speedLimitFromTime: '08:00',
    speedLimitToTime: '20:00',
    bytesDownloadedInPeriod: 0
  });

  const [selectedQueueId, setSelectedQueueId] = useState('main'); // 'main' | 'sync' | 'limits' | custom
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'files'
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Add Queue Dialog
  const [isAddQueueOpen, setIsAddQueueOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [newQueueType, setNewQueueType] = useState('download');

  // Add Files to Queue Dialog
  const [isAddFilesOpen, setIsAddFilesOpen] = useState(false);
  const [selectedFileIdsToAdd, setSelectedFileIdsToAdd] = useState([]);

  // Selected row in queue files table for reordering
  const [selectedQueueFileId, setSelectedQueueFileId] = useState(null);

  // Form State for currently active queue
  const [currentSchedule, setCurrentSchedule] = useState({
    mode: 'one-time',
    startOnAppStartup: false,
    startEnabled: false,
    startTime: '23:00',
    startFrequency: 'daily',
    startDate: new Date().toISOString().slice(0, 10),
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    stopEnabled: false,
    stopTime: '07:30',
    retryCountEnabled: true,
    retryCount: 10,
    openFileOnDoneEnabled: false,
    openFilePath: '',
    exitOnDone: false,
    turnOffOnDone: false,
    turnOffAction: 'shutdown',
    forceProcesses: false,
    syncIntervalMinutes: 60
  });

  const [currentMaxConcurrent, setCurrentMaxConcurrent] = useState(4);
  const [isDirty, setIsDirty] = useState(false);

  // Load scheduler state
  const loadSchedulerState = useCallback(async () => {
    try {
      if (window.electronAPI?.getSchedulerState) {
        const state = await window.electronAPI.getSchedulerState();
        if (state) {
          if (Array.isArray(state.queues)) {
            setQueues(state.queues);
          }
          if (state.downloadLimits) {
            setDownloadLimits(state.downloadLimits);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load scheduler state:', err);
    }
  }, []);

  useEffect(() => {
    loadSchedulerState();

    const unsub = window.electronAPI?.onSchedulerStateUpdated?.((state) => {
      if (state) {
        if (Array.isArray(state.queues)) setQueues(state.queues);
        if (state.downloadLimits) setDownloadLimits(state.downloadLimits);
      }
    });

    return () => {
      unsub?.();
    };
  }, [loadSchedulerState]);

  // Selected Queue object
  const activeQueue = useMemo(() => {
    return queues.find((q) => q.id === selectedQueueId) || null;
  }, [queues, selectedQueueId]);

  // When selectedQueue changes, sync local form state
  useEffect(() => {
    if (activeQueue) {
      setCurrentSchedule({
        mode: activeQueue.schedule?.mode || 'one-time',
        startOnAppStartup: Boolean(activeQueue.schedule?.startOnAppStartup),
        startEnabled: Boolean(activeQueue.schedule?.startEnabled),
        startTime: (activeQueue.schedule?.startTime || '23:00').slice(0, 5),
        startFrequency: activeQueue.schedule?.startFrequency || 'daily',
        startDate: activeQueue.schedule?.startDate || new Date().toISOString().slice(0, 10),
        daysOfWeek: Array.isArray(activeQueue.schedule?.daysOfWeek) ? activeQueue.schedule.daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
        stopEnabled: Boolean(activeQueue.schedule?.stopEnabled),
        stopTime: (activeQueue.schedule?.stopTime || '07:30').slice(0, 5),
        retryCountEnabled: activeQueue.schedule?.retryCountEnabled ?? true,
        retryCount: activeQueue.schedule?.retryCount ?? 10,
        openFileOnDoneEnabled: Boolean(activeQueue.schedule?.openFileOnDoneEnabled),
        openFilePath: activeQueue.schedule?.openFilePath || '',
        exitOnDone: Boolean(activeQueue.schedule?.exitOnDone),
        turnOffOnDone: Boolean(activeQueue.schedule?.turnOffOnDone),
        turnOffAction: activeQueue.schedule?.turnOffAction || 'shutdown',
        forceProcesses: Boolean(activeQueue.schedule?.forceProcesses),
        syncIntervalMinutes: activeQueue.schedule?.syncIntervalMinutes || 60
      });
      setCurrentMaxConcurrent(activeQueue.maxConcurrent || 4);
      setIsDirty(false);
    }
  }, [activeQueue]);

  // Downloads assigned to active queue
  const queueDownloads = useMemo(() => {
    if (!activeQueue || !Array.isArray(activeQueue.taskIds)) return [];
    const idMap = new Map(downloads.map((d) => [d.id, d]));
    return activeQueue.taskIds
      .map((id) => idMap.get(id))
      .filter(Boolean);
  }, [activeQueue, downloads]);

  // Downloads not yet in current queue (for "Add to Queue" dialog)
  const availableDownloadsToAdd = useMemo(() => {
    if (!activeQueue) return [];
    const assignedSet = new Set(activeQueue.taskIds || []);
    return downloads.filter((d) => !assignedSet.has(d.id));
  }, [activeQueue, downloads]);

  // Update schedule field helper
  const handleScheduleChange = (field, value) => {
    setCurrentSchedule((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleDayToggle = (dayIndex) => {
    setCurrentSchedule((prev) => {
      const days = new Set(prev.daysOfWeek);
      if (days.has(dayIndex)) {
        days.delete(dayIndex);
      } else {
        days.add(dayIndex);
      }
      return {
        ...prev,
        daysOfWeek: Array.from(days).sort((a, b) => a - b)
      };
    });
    setIsDirty(true);
  };

  // Browse file for "Open file when done"
  const handleBrowseFile = async () => {
    try {
      if (window.electronAPI?.browseFile) {
        const filePath = await window.electronAPI.browseFile(currentSchedule.openFilePath);
        if (filePath) {
          handleScheduleChange('openFilePath', filePath);
        }
      }
    } catch (err) {
      console.error('File browse failed:', err);
    }
  };

  // Save current queue settings & schedule
  const handleApplyQueue = async () => {
    if (!activeQueue) return;
    try {
      if (window.electronAPI?.saveSchedulerQueue) {
        await window.electronAPI.saveSchedulerQueue({
          queueId: activeQueue.id,
          updates: {
            schedule: currentSchedule,
            maxConcurrent: Number(currentMaxConcurrent) || 4
          }
        });
        setIsDirty(false);
        setToast({ open: true, message: `Schedule applied for "${activeQueue.name}"`, severity: 'success' });
      }
    } catch (err) {
      console.error('Failed to save queue schedule:', err);
      setToast({ open: true, message: 'Failed to apply schedule', severity: 'error' });
    }
  };

  // Start Queue manually
  const handleStartQueue = async () => {
    if (!activeQueue) return;
    try {
      // First save any unsaved changes
      if (isDirty) {
        await handleApplyQueue();
      }
      if (window.electronAPI?.startSchedulerQueue) {
        await window.electronAPI.startSchedulerQueue(activeQueue.id);
        setToast({ open: true, message: `Queue "${activeQueue.name}" started`, severity: 'success' });
      }
    } catch (err) {
      console.error('Failed to start queue:', err);
    }
  };

  // Stop Queue manually
  const handleStopQueue = async () => {
    if (!activeQueue) return;
    try {
      if (window.electronAPI?.stopSchedulerQueue) {
        await window.electronAPI.stopSchedulerQueue(activeQueue.id);
        setToast({ open: true, message: `Queue "${activeQueue.name}" stopped`, severity: 'info' });
      }
    } catch (err) {
      console.error('Failed to stop queue:', err);
    }
  };

  // Create New Queue
  const handleCreateQueue = async () => {
    const trimmed = newQueueName.trim();
    if (!trimmed) return;
    try {
      if (window.electronAPI?.createSchedulerQueue) {
        const created = await window.electronAPI.createSchedulerQueue({
          name: trimmed,
          type: newQueueType
        });
        if (created) {
          setSelectedQueueId(created.id);
          setIsAddQueueOpen(false);
          setNewQueueName('');
          setToast({ open: true, message: `Queue "${created.name}" created`, severity: 'success' });
        }
      }
    } catch (err) {
      console.error('Failed to create queue:', err);
    }
  };

  // Delete Custom Queue
  const handleDeleteQueue = async () => {
    if (!activeQueue || activeQueue.isDefault) return;
    if (!window.confirm(`Are you sure you want to delete the queue "${activeQueue.name}"?`)) return;

    try {
      if (window.electronAPI?.deleteSchedulerQueue) {
        const ok = await window.electronAPI.deleteSchedulerQueue(activeQueue.id);
        if (ok) {
          setSelectedQueueId('main');
          setToast({ open: true, message: `Queue deleted`, severity: 'success' });
        }
      }
    } catch (err) {
      console.error('Failed to delete queue:', err);
    }
  };

  // Queue Files Reordering
  const handleMoveFile = async (direction) => {
    if (!activeQueue || !selectedQueueFileId) return;
    const taskIds = [...(activeQueue.taskIds || [])];
    const currentIndex = taskIds.indexOf(selectedQueueFileId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= taskIds.length) return;

    // Swap items
    const temp = taskIds[currentIndex];
    taskIds[currentIndex] = taskIds[targetIndex];
    taskIds[targetIndex] = temp;

    try {
      if (window.electronAPI?.reorderSchedulerTasks) {
        await window.electronAPI.reorderSchedulerTasks({
          queueId: activeQueue.id,
          taskIds
        });
      }
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
    }
  };

  // Remove File from Queue
  const handleRemoveFileFromQueue = async () => {
    if (!activeQueue || !selectedQueueFileId) return;
    try {
      if (window.electronAPI?.removeTaskFromSchedulerQueue) {
        await window.electronAPI.removeTaskFromSchedulerQueue({
          queueId: activeQueue.id,
          taskId: selectedQueueFileId
        });
        setSelectedQueueFileId(null);
        setToast({ open: true, message: 'Item removed from queue', severity: 'info' });
      }
    } catch (err) {
      console.error('Failed to remove item from queue:', err);
    }
  };

  // Add Files to Queue
  const handleConfirmAddFiles = async () => {
    if (!activeQueue || selectedFileIdsToAdd.length === 0) return;
    try {
      if (window.electronAPI?.addTasksToSchedulerQueue) {
        await window.electronAPI.addTasksToSchedulerQueue({
          queueId: activeQueue.id,
          taskIds: selectedFileIdsToAdd
        });
        setIsAddFilesOpen(false);
        setSelectedFileIdsToAdd([]);
        setToast({ open: true, message: `Added ${selectedFileIdsToAdd.length} download(s) to "${activeQueue.name}"`, severity: 'success' });
      }
    } catch (err) {
      console.error('Failed to add tasks to queue:', err);
    }
  };

  // Save Download Limits
  const handleSaveLimits = async () => {
    try {
      if (window.electronAPI?.saveSchedulerLimits) {
        await window.electronAPI.saveSchedulerLimits(downloadLimits);
        setToast({ open: true, message: 'Download limits saved successfully', severity: 'success' });
      }
    } catch (err) {
      console.error('Failed to save limits:', err);
    }
  };

  // Reset Download Limits counter
  const handleResetLimitsCounter = async () => {
    try {
      if (window.electronAPI?.resetSchedulerLimits) {
        await window.electronAPI.resetSchedulerLimits();
        setToast({ open: true, message: 'Data limit usage counter reset', severity: 'info' });
      }
    } catch (err) {
      console.error('Failed to reset limits:', err);
    }
  };

  const renderFileIcon = (fileName, mimeType) => {
    const category = getFileCategory(fileName, mimeType);
    switch (category) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-rose-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-amber-400" />;
      case 'compressed':
        return <FileArchive className="w-3.5 h-3.5 text-yellow-400" />;
      case 'programs':
        return <Binary className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] select-none transition-colors">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg-surface)] shrink-0 gap-4">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[var(--theme-primary)]" />
            <h1 className="text-sm font-bold tracking-wide text-[var(--theme-text-primary)]">
              Download Scheduler
            </h1>
          </div>

          <div className="h-4 w-[1px] bg-[var(--theme-border)] hidden sm:block" />

          {activeQueue && selectedQueueId !== 'limits' && (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-[var(--theme-text-muted)]">Queue:</span>
              <span className="font-semibold text-[var(--theme-text-primary)]">{activeQueue.name}</span>
              {activeQueue.running ? (
                <Chip
                  size="small"
                  label="Running"
                  icon={<Play className="!w-3 !h-3 text-emerald-400" />}
                  className="!h-5 !text-[10px] !font-bold !bg-emerald-950/60 !text-emerald-400 !border !border-emerald-600/40"
                />
              ) : (
                <Chip
                  size="small"
                  label="Idle"
                  className="!h-5 !text-[10px] !bg-black/20 !text-[var(--theme-text-muted)] !border !border-[var(--theme-border)]"
                />
              )}
            </div>
          )}
        </div>

        {/* Right: Close / Back */}
        <div className="flex items-center gap-2">
          <Tooltip title="Back to Downloads" arrow>
            <IconButton
              size="small"
              onClick={onBack}
              className="!text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] hover:!bg-[var(--theme-secondary-subtle)] !p-1.5"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="flex-1 w-full flex overflow-hidden min-h-0">
        {/* Left Column: Queues Tree */}
        <aside className="w-56 lg:w-64 border-r border-[var(--theme-border)] flex flex-col justify-between bg-[var(--theme-bg-sidebar)] shrink-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Queues Header */}
            <div className="p-3 border-b border-[var(--theme-border)] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Queues</span>
              </div>
            </div>

            {/* Queues List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {queues.map((q) => {
                const isSelected = selectedQueueId === q.id;
                const isSync = q.type === 'sync';
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQueueId(q.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left border ${
                      isSelected
                        ? '!border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] dark:text-[#EEEEEE] font-bold shadow-sm'
                        : 'border-transparent text-slate-700 dark:text-[#b8a5a5] hover:text-slate-900 dark:hover:text-[#EEEEEE] hover:bg-slate-200/60 dark:hover:bg-[#271a1a]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className={`w-4 h-4 shrink-0 ${isSync ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="truncate">{q.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {q.running && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Running" />
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-[var(--theme-text-muted)] font-mono-stat">
                        {q.taskIds?.length || 0}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Download Limits Item */}
              <button
                onClick={() => setSelectedQueueId('limits')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left border ${
                  selectedQueueId === 'limits'
                    ? '!border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] dark:text-[#EEEEEE] font-bold shadow-sm'
                    : 'border-transparent text-slate-700 dark:text-[#b8a5a5] hover:text-slate-900 dark:hover:text-[#EEEEEE] hover:bg-slate-200/60 dark:hover:bg-[#271a1a]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Ban className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="truncate">Download limits</span>
                </div>
                {downloadLimits.enabled && (
                  <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-rose-950/60 text-rose-400 font-bold border border-rose-700/40">
                    Active
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Left Column Bottom Buttons: New queue & Delete */}
          <div className="p-2.5 border-t border-[var(--theme-border)] flex items-center gap-2 shrink-0 bg-[var(--theme-bg-surface)]">
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddQueueOpen(true)}
              className="!border-[var(--theme-border)] !text-xs !py-1 !text-[var(--theme-text-primary)] hover:!bg-[var(--theme-secondary-subtle)]"
            >
              New queue
            </Button>

            <Tooltip title={activeQueue?.isDefault ? "Default queues cannot be deleted" : "Delete selected queue"} arrow>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!activeQueue || Boolean(activeQueue.isDefault) || selectedQueueId === 'limits'}
                  onClick={handleDeleteQueue}
                  className="!border-[var(--theme-border)] !text-xs !py-1 !min-w-[36px] !px-2 !text-rose-400 hover:!bg-rose-950/30 disabled:!opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </span>
            </Tooltip>
          </div>
        </aside>

        {/* Right Column: Queue Details or Download Limits */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-[var(--theme-bg-surface)] min-w-0">
          {selectedQueueId === 'limits' ? (
            /* --- DOWNLOAD LIMITS PANEL --- */
            <div className="flex-1 p-5 md:p-6 space-y-5 max-w-4xl">
              <div>
                <h2 className="text-base font-bold text-[var(--theme-text-primary)] flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-500" />
                  <span>Bandwidth & Download Quota Limits</span>
                </h2>
                <p className="text-xs text-[var(--theme-text-muted)] mt-1">
                  Enforce download quotas and scheduled bandwidth throttling across Voltrex Loader.
                </p>
              </div>

              {/* Data Quota Card */}
              <div className="p-4 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] space-y-4">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(downloadLimits.enabled)}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, enabled: e.target.checked }))}
                      size="small"
                      sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                    />
                  }
                  label={
                    <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                      Apply download quota limit
                    </span>
                  }
                />

                <div className={`space-y-3 pl-7 transition-opacity ${downloadLimits.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--theme-text-primary)]">
                    <span>Do not download more than</span>
                    <TextField
                      size="small"
                      type="number"
                      value={downloadLimits.maxMBytes || 5000}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, maxMBytes: Number(e.target.value) || 0 }))}
                      className="!w-24"
                      sx={{
                        '& .MuiInputBase-root': {
                          height: 32,
                          fontSize: '0.8rem',
                          color: 'var(--theme-text-primary)',
                          backgroundColor: 'var(--theme-bg-input)'
                        }
                      }}
                    />
                    <span>MBytes in each</span>
                    <TextField
                      size="small"
                      type="number"
                      value={downloadLimits.perHours || 24}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, perHours: Number(e.target.value) || 1 }))}
                      className="!w-20"
                      sx={{
                        '& .MuiInputBase-root': {
                          height: 32,
                          fontSize: '0.8rem',
                          color: 'var(--theme-text-primary)',
                          backgroundColor: 'var(--theme-bg-input)'
                        }
                      }}
                    />
                    <span>hours</span>
                  </div>

                  {/* Usage tracker */}
                  <div className="p-3 rounded-lg bg-[var(--theme-bg-card)] border border-[var(--theme-border)] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[var(--theme-text-muted)]">Current Period Usage</div>
                      <div className="text-xs font-bold text-[var(--theme-text-primary)] font-mono-stat mt-0.5">
                        {formatBytes(downloadLimits.bytesDownloadedInPeriod || 0)} / {downloadLimits.maxMBytes} MB
                      </div>
                    </div>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetLimitsCounter}
                      startIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      className="!border-[var(--theme-border)] !text-xs !py-1 !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)]"
                    >
                      Reset Usage
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scheduled Speed Limiter Card */}
              <div className="p-4 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] space-y-4">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(downloadLimits.speedLimitEnabled)}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, speedLimitEnabled: e.target.checked }))}
                      size="small"
                      sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                    />
                  }
                  label={
                    <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                      Limit download speed during scheduled hours
                    </span>
                  }
                />

                <div className={`space-y-3 pl-7 transition-opacity ${downloadLimits.speedLimitEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--theme-text-primary)]">
                    <span>Throttle maximum speed to</span>
                    <TextField
                      size="small"
                      type="number"
                      value={downloadLimits.speedLimitKBps || 500}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, speedLimitKBps: Number(e.target.value) || 0 }))}
                      className="!w-24"
                      sx={{
                        '& .MuiInputBase-root': {
                          height: 32,
                          fontSize: '0.8rem',
                          color: 'var(--theme-text-primary)',
                          backgroundColor: 'var(--theme-bg-input)'
                        }
                      }}
                    />
                    <span>KB/s</span>
                    <span className="mx-1">between</span>
                    <TextField
                      size="small"
                      type="time"
                      value={downloadLimits.speedLimitFromTime || '08:00'}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, speedLimitFromTime: e.target.value }))}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: 32,
                          fontSize: '0.8rem',
                          color: 'var(--theme-text-primary)',
                          backgroundColor: 'var(--theme-bg-input)'
                        }
                      }}
                    />
                    <span>and</span>
                    <TextField
                      size="small"
                      type="time"
                      value={downloadLimits.speedLimitToTime || '20:00'}
                      onChange={(e) => setDownloadLimits((prev) => ({ ...prev, speedLimitToTime: e.target.value }))}
                      sx={{
                        '& .MuiInputBase-root': {
                          height: 32,
                          fontSize: '0.8rem',
                          color: 'var(--theme-text-primary)',
                          backgroundColor: 'var(--theme-bg-input)'
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Limits Action Bar */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  variant="contained"
                  onClick={handleSaveLimits}
                  startIcon={<Check className="w-4 h-4" />}
                  className="!bg-[var(--theme-primary)] !text-white !font-bold !text-xs !py-1.5 !px-4 hover:!brightness-110"
                >
                  Apply Limits
                </Button>
              </div>
            </div>
          ) : (
            /* --- QUEUE DETAILS (SCHEDULE & FILES) --- */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header with Title and Tabs */}
              <div className="px-5 pt-3 border-b border-[var(--theme-border)] bg-[var(--theme-bg-base)] flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--theme-text-primary)]">
                      {activeQueue?.name || 'Download Queue'}
                    </h2>
                    <div className="text-[11px] text-[var(--theme-text-muted)]">
                      {activeQueue?.type === 'sync' ? 'Periodic synchronization queue' : 'Scheduled download batch'}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
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
                    minHeight: 44,
                    '& .MuiTab-root': {
                      minHeight: 44,
                      py: 0.5,
                      px: 2.5,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      color: 'var(--theme-text-muted)',
                      '&.Mui-selected': {
                        color: 'var(--theme-primary)',
                        fontWeight: 700
                      }
                    }
                  }}
                >
                  <Tab
                    value="schedule"
                    label="Schedule"
                    icon={<Clock className="!text-base" />}
                    iconPosition="start"
                  />
                  <Tab
                    value="files"
                    label={
                      <div className="flex items-center gap-1.5">
                        <span>Files in the queue</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--theme-secondary-subtle)] text-[var(--theme-primary)] font-bold border border-[var(--theme-border-accent)]">
                          {queueDownloads.length}
                        </span>
                      </div>
                    }
                    icon={<ListOrdered className="!text-base" />}
                    iconPosition="start"
                  />
                </Tabs>
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 min-h-0">
                {activeTab === 'schedule' ? (
                  /* ================= SCHEDULE TAB ================= */
                  <div className="max-w-3xl space-y-5">
                    {/* Mode Radio Selection */}
                    <div className="p-3.5 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)]">
                      <RadioGroup
                        row
                        value={currentSchedule.mode}
                        onChange={(e) => handleScheduleChange('mode', e.target.value)}
                        className="gap-6"
                      >
                        <FormControlLabel
                          value="one-time"
                          control={<Radio size="small" sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }} />}
                          label={<span className="text-xs font-semibold text-[var(--theme-text-primary)]">One-time downloading</span>}
                        />
                        <FormControlLabel
                          value="sync"
                          control={<Radio size="small" sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }} />}
                          label={<span className="text-xs font-semibold text-[var(--theme-text-primary)]">Periodic synchronization</span>}
                        />
                      </RadioGroup>
                    </div>

                    {/* Startup & Start Timing Card */}
                    <div className="p-4 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] space-y-3.5">
                      {/* Start download on app startup */}
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={Boolean(currentSchedule.startOnAppStartup)}
                            onChange={(e) => handleScheduleChange('startOnAppStartup', e.target.checked)}
                            size="small"
                            sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                          />
                        }
                        label={
                          <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                            Start download on Voltrex startup
                          </span>
                        }
                      />

                      <div className="border-t border-[var(--theme-border)] my-1" />

                      {/* Start download at [Time] */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(currentSchedule.startEnabled)}
                                onChange={(e) => handleScheduleChange('startEnabled', e.target.checked)}
                                size="small"
                                sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                              />
                            }
                            label={
                              <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                                Start download at
                              </span>
                            }
                          />

                          <TextField
                            size="small"
                            type="time"
                            value={currentSchedule.startTime || '23:00'}
                            disabled={!currentSchedule.startEnabled}
                            onChange={(e) => handleScheduleChange('startTime', e.target.value)}
                            sx={{
                              '& .MuiInputBase-root': {
                                height: 32,
                                fontSize: '0.8rem',
                                color: 'var(--theme-text-primary)',
                                backgroundColor: 'var(--theme-bg-input)'
                              }
                            }}
                          />
                        </div>

                        {/* Indented Frequency (Once at vs Daily) */}
                        <div className={`pl-7 space-y-3 transition-opacity ${currentSchedule.startEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <RadioGroup
                            value={currentSchedule.startFrequency}
                            onChange={(e) => handleScheduleChange('startFrequency', e.target.value)}
                            className="space-y-2.5"
                          >
                            {/* Once at [Date] */}
                            <div className="flex items-center gap-3">
                              <FormControlLabel
                                value="once"
                                control={<Radio size="small" sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }} />}
                                label={<span className="text-xs text-[var(--theme-text-primary)]">Once at</span>}
                              />
                              <TextField
                                size="small"
                                type="date"
                                disabled={currentSchedule.startFrequency !== 'once'}
                                value={currentSchedule.startDate || ''}
                                onChange={(e) => handleScheduleChange('startDate', e.target.value)}
                                sx={{
                                  '& .MuiInputBase-root': {
                                    height: 32,
                                    fontSize: '0.8rem',
                                    color: 'var(--theme-text-primary)',
                                    backgroundColor: 'var(--theme-bg-input)'
                                  }
                                }}
                              />
                            </div>

                            {/* Daily [Days of week] */}
                            <div className="space-y-2">
                              <FormControlLabel
                                value="daily"
                                control={<Radio size="small" sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }} />}
                                label={<span className="text-xs text-[var(--theme-text-primary)]">Daily</span>}
                              />

                              {/* Days of week checkbox grid */}
                              <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7 pt-1 ${currentSchedule.startFrequency === 'daily' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                {DAYS_OF_WEEK.map(({ day, label }) => {
                                  const isChecked = currentSchedule.daysOfWeek.includes(day);
                                  return (
                                    <FormControlLabel
                                      key={day}
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={isChecked}
                                          onChange={() => handleDayToggle(day)}
                                          sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                                        />
                                      }
                                      label={<span className="text-xs text-[var(--theme-text-muted)]">{label}</span>}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    </div>

                    {/* Stop Timing & Retries Card */}
                    <div className="p-4 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] space-y-3.5">
                      {/* Stop download at */}
                      <div className="flex items-center gap-3">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(currentSchedule.stopEnabled)}
                              onChange={(e) => handleScheduleChange('stopEnabled', e.target.checked)}
                              size="small"
                              sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                            />
                          }
                          label={
                            <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                              Stop download at
                            </span>
                          }
                        />

                        <TextField
                          size="small"
                          type="time"
                          value={currentSchedule.stopTime || '07:30'}
                          disabled={!currentSchedule.stopEnabled}
                          onChange={(e) => handleScheduleChange('stopTime', e.target.value)}
                          sx={{
                            '& .MuiInputBase-root': {
                              height: 32,
                              fontSize: '0.8rem',
                              color: 'var(--theme-text-primary)',
                              backgroundColor: 'var(--theme-bg-input)'
                            }
                          }}
                        />
                      </div>

                      {/* Number of retries */}
                      <div className="flex items-center gap-3">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(currentSchedule.retryCountEnabled)}
                              onChange={(e) => handleScheduleChange('retryCountEnabled', e.target.checked)}
                              size="small"
                              sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                            />
                          }
                          label={
                            <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                              Number of retries for each file if downloading failed:
                            </span>
                          }
                        />

                        <TextField
                          size="small"
                          type="number"
                          value={currentSchedule.retryCount}
                          disabled={!currentSchedule.retryCountEnabled}
                          onChange={(e) => handleScheduleChange('retryCount', Number(e.target.value) || 0)}
                          className="!w-20"
                          sx={{
                            '& .MuiInputBase-root': {
                              height: 32,
                              fontSize: '0.8rem',
                              color: 'var(--theme-text-primary)',
                              backgroundColor: 'var(--theme-bg-input)'
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Post-Completion Automation Card */}
                    <div className="p-4 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] space-y-3">
                      {/* Open file when done */}
                      <div className="space-y-2">
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(currentSchedule.openFileOnDoneEnabled)}
                              onChange={(e) => handleScheduleChange('openFileOnDoneEnabled', e.target.checked)}
                              size="small"
                              sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                            />
                          }
                          label={
                            <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                              Open the following file when done:
                            </span>
                          }
                        />

                        <div className={`flex items-center gap-2 pl-7 ${currentSchedule.openFileOnDoneEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="C:\path\to\script.bat or file..."
                            value={currentSchedule.openFilePath}
                            onChange={(e) => handleScheduleChange('openFilePath', e.target.value)}
                            sx={{
                              '& .MuiInputBase-root': {
                                height: 32,
                                fontSize: '0.8rem',
                                color: 'var(--theme-text-primary)',
                                backgroundColor: 'var(--theme-bg-input)'
                              }
                            }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleBrowseFile}
                            className="!border-[var(--theme-border)] !text-xs !py-1 !min-w-[40px] !text-[var(--theme-text-primary)]"
                          >
                            ...
                          </Button>
                        </div>
                      </div>

                      {/* Exit Voltrex */}
                      <div>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(currentSchedule.exitOnDone)}
                              onChange={(e) => handleScheduleChange('exitOnDone', e.target.checked)}
                              size="small"
                              sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                            />
                          }
                          label={
                            <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                              Exit Voltrex Loader when done
                            </span>
                          }
                        />
                      </div>

                      {/* Turn off computer */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(currentSchedule.turnOffOnDone)}
                                onChange={(e) => handleScheduleChange('turnOffOnDone', e.target.checked)}
                                size="small"
                                sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                              />
                            }
                            label={
                              <span className="text-xs font-semibold text-[var(--theme-text-primary)]">
                                Turn off computer when done:
                              </span>
                            }
                          />

                          <Select
                            size="small"
                            value={currentSchedule.turnOffAction}
                            disabled={!currentSchedule.turnOffOnDone}
                            onChange={(e) => handleScheduleChange('turnOffAction', e.target.value)}
                            sx={{
                              height: 32,
                              fontSize: '0.8rem',
                              color: 'var(--theme-text-primary)',
                              backgroundColor: 'var(--theme-bg-input)'
                            }}
                          >
                            <MenuItem value="shutdown">Shut down</MenuItem>
                            <MenuItem value="sleep">Sleep</MenuItem>
                            <MenuItem value="hibernate">Hibernate</MenuItem>
                          </Select>
                        </div>

                        {/* Force processes */}
                        <div className={`pl-7 ${currentSchedule.turnOffOnDone ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(currentSchedule.forceProcesses)}
                                onChange={(e) => handleScheduleChange('forceProcesses', e.target.checked)}
                                size="small"
                                sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' } }}
                              />
                            }
                            label={
                              <span className="text-xs text-[var(--theme-text-muted)]">
                                Force processes to terminate
                              </span>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= FILES IN THE QUEUE TAB ================= */
                  <div className="h-full flex flex-col space-y-4">
                    {/* Top Queue Concurrency Row */}
                    <div className="p-3.5 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-[var(--theme-text-primary)]">
                        <span>Download</span>
                        <TextField
                          size="small"
                          type="number"
                          value={currentMaxConcurrent}
                          onChange={(e) => {
                            setCurrentMaxConcurrent(Number(e.target.value) || 1);
                            setIsDirty(true);
                          }}
                          className="!w-20"
                          inputProps={{ min: 1, max: 16 }}
                          sx={{
                            '& .MuiInputBase-root': {
                              height: 32,
                              fontSize: '0.8rem',
                              color: 'var(--theme-text-primary)',
                              backgroundColor: 'var(--theme-bg-input)'
                            }
                          }}
                        />
                        <span>files at the same time</span>
                      </div>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FolderPlus className="w-4 h-4" />}
                        onClick={() => setIsAddFilesOpen(true)}
                        className="!border-[var(--theme-border)] !text-xs !py-1 !text-[var(--theme-text-primary)] hover:!bg-[var(--theme-secondary-subtle)]"
                      >
                        Add Downloads to Queue...
                      </Button>
                    </div>

                    {/* Files Table Container */}
                    <div className="flex-1 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border)] overflow-hidden flex flex-col min-h-0">
                      <TableContainer className="flex-1 overflow-y-auto">
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ '& th': { backgroundColor: 'var(--theme-bg-card)', color: 'var(--theme-text-muted)', fontSize: '0.75rem', fontWeight: 'bold' } }}>
                              <TableCell className="!border-b !border-[var(--theme-border)]">File Name</TableCell>
                              <TableCell className="!border-b !border-[var(--theme-border)] w-28">Size</TableCell>
                              <TableCell className="!border-b !border-[var(--theme-border)] w-32">Status</TableCell>
                              <TableCell className="!border-b !border-[var(--theme-border)] w-44">Progress / ETA</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {queueDownloads.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="!text-center !py-10 !text-xs !text-[var(--theme-text-muted)] !border-none">
                                  No files in this queue. Click "Add Downloads to Queue..." to assign downloads.
                                </TableCell>
                              </TableRow>
                            ) : (
                              queueDownloads.map((task, idx) => {
                                const isSelected = selectedQueueFileId === task.id;
                                const isRunning = task.status === 'DOWNLOADING' || task.status === 'APPENDING';
                                const isDone = task.status === 'COMPLETED';
                                const currentProgress = task.progress || 0;

                                return (
                                  <TableRow
                                    key={task.id}
                                    onClick={() => setSelectedQueueFileId(task.id)}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected
                                        ? '!bg-[var(--theme-secondary-subtle)]'
                                        : 'hover:!bg-white/[0.02]'
                                    }`}
                                  >
                                    {/* File Name */}
                                    <TableCell className="!border-b !border-[var(--theme-border)] !py-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-black/20">
                                          {renderFileIcon(task.fileName, task.mimeType)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold text-[var(--theme-text-primary)] truncate" title={task.fileName}>
                                            {task.fileName || `download_${task.id}`}
                                          </div>
                                          <div className="text-[10px] text-[var(--theme-text-muted)] truncate max-w-sm">
                                            {task.url}
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>

                                    {/* Size */}
                                    <TableCell className="!border-b !border-[var(--theme-border)] !py-2 text-xs font-mono-stat text-[var(--theme-text-muted)]">
                                      {formatBytes(task.totalBytes || task.downloadedBytes || 0)}
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell className="!border-b !border-[var(--theme-border)] !py-2">
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                          isDone
                                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/40'
                                            : isRunning
                                            ? 'bg-amber-950/60 text-amber-400 border-amber-700/40 animate-pulse'
                                            : task.status === 'PAUSED'
                                            ? 'bg-black/30 text-amber-300 border-amber-700/30'
                                            : 'bg-black/20 text-[var(--theme-text-muted)] border-[var(--theme-border)]'
                                        }`}
                                      >
                                        {task.status}
                                      </span>
                                    </TableCell>

                                    {/* Progress / Time Left */}
                                    <TableCell className="!border-b !border-[var(--theme-border)] !py-2">
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[10px] font-mono-stat text-[var(--theme-text-muted)]">
                                          <span>{currentProgress}%</span>
                                          {isRunning && task.speed > 0 && (
                                            <span>{formatSpeed(task.speed)}</span>
                                          )}
                                        </div>
                                        <LinearProgress
                                          variant="determinate"
                                          value={currentProgress}
                                          className="!rounded-full !h-1.5 !bg-black/30"
                                          sx={{
                                            '& .MuiLinearProgress-bar': {
                                              backgroundColor: isDone ? '#34d399' : isRunning ? 'var(--theme-primary)' : '#fbbf24'
                                            }
                                          }}
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Reorder & Remove Controls Bar */}
                      <div className="p-2 border-t border-[var(--theme-border)] flex items-center justify-between shrink-0 bg-[var(--theme-bg-card)]">
                        <div className="flex items-center gap-1.5">
                          <Tooltip title="Move Selected File Down" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!selectedQueueFileId}
                                onClick={() => handleMoveFile('down')}
                                className="!border !border-[var(--theme-border)] !p-1.5 !text-[var(--theme-text-primary)] disabled:!opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Move Selected File Up" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!selectedQueueFileId}
                                onClick={() => handleMoveFile('up')}
                                className="!border !border-[var(--theme-border)] !p-1.5 !text-[var(--theme-text-primary)] disabled:!opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Remove Selected File From Queue" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!selectedQueueFileId}
                                onClick={handleRemoveFileFromQueue}
                                className="!border !border-[var(--theme-border)] !p-1.5 !text-rose-400 hover:!bg-rose-950/30 disabled:!opacity-30"
                              >
                                <X className="w-3.5 h-3.5" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </div>

                        <div className="text-[11px] text-[var(--theme-text-muted)] font-mono-stat">
                          {queueDownloads.length} item{queueDownloads.length === 1 ? '' : 's'} in queue
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="p-4 border-t border-[var(--theme-border)] bg-[var(--theme-bg-base)] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    variant="contained"
                    onClick={handleStartQueue}
                    disabled={activeQueue?.running}
                    startIcon={<Play className="w-4 h-4 fill-current" />}
                    className="!bg-emerald-600 hover:!bg-emerald-500 !text-white !font-bold !text-xs !py-1.5 !px-4 disabled:!opacity-40"
                  >
                    Start now
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleStopQueue}
                    disabled={!activeQueue?.running}
                    startIcon={<Pause className="w-4 h-4 fill-current" />}
                    className="!border-amber-500/50 !text-amber-400 hover:!bg-amber-950/30 !font-bold !text-xs !py-1.5 !px-4 disabled:!opacity-40"
                  >
                    Stop
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="contained"
                    onClick={handleApplyQueue}
                    startIcon={<Check className="w-4 h-4" />}
                    className="!bg-[var(--theme-primary)] hover:!brightness-110 !text-white !font-bold !text-xs !py-1.5 !px-5"
                  >
                    Apply
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={onBack}
                    className="!border-[var(--theme-border)] !text-[var(--theme-text-muted)] hover:!text-[var(--theme-text-primary)] !text-xs !py-1.5 !px-4"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- DIALOG: CREATE NEW QUEUE --- */}
      <Dialog
        open={isAddQueueOpen}
        onClose={() => setIsAddQueueOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          className: '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-xl !text-[var(--theme-text-primary)]'
        }}
      >
        <DialogTitle className="!text-sm !font-bold !pb-1 flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-[var(--theme-primary)]" />
          <span>Create New Download Queue</span>
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-3">
          <TextField
            autoFocus
            label="Queue Name"
            placeholder="e.g. Night Queue, Movies, Torrents..."
            fullWidth
            size="small"
            value={newQueueName}
            onChange={(e) => setNewQueueName(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '0.8125rem',
                color: 'var(--theme-text-primary)',
                backgroundColor: 'var(--theme-bg-input)'
              }
            }}
          />

          <Select
            fullWidth
            size="small"
            value={newQueueType}
            onChange={(e) => setNewQueueType(e.target.value)}
            sx={{
              fontSize: '0.8125rem',
              color: 'var(--theme-text-primary)',
              backgroundColor: 'var(--theme-bg-input)'
            }}
          >
            <MenuItem value="download">Standard Download Queue</MenuItem>
            <MenuItem value="sync">Periodic Synchronization Queue</MenuItem>
          </Select>
        </DialogContent>
        <DialogActions className="!px-6 !pb-4">
          <Button
            size="small"
            onClick={() => setIsAddQueueOpen(false)}
            className="!text-[var(--theme-text-muted)] !text-xs"
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={!newQueueName.trim()}
            onClick={handleCreateQueue}
            className="!bg-[var(--theme-primary)] !text-white !font-bold !text-xs !px-4 disabled:!opacity-40"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG: ADD EXISTING DOWNLOADS TO QUEUE --- */}
      <Dialog
        open={isAddFilesOpen}
        onClose={() => setIsAddFilesOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          className: '!bg-[var(--theme-bg-card)] !border !border-[var(--theme-border-accent)] !rounded-xl !text-[var(--theme-text-primary)]'
        }}
      >
        <DialogTitle className="!text-sm !font-bold !pb-2 flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-[var(--theme-primary)]" />
          <span>Add Downloads to "{activeQueue?.name}"</span>
        </DialogTitle>
        <DialogContent className="space-y-2 !pt-1 max-h-80 overflow-y-auto">
          {availableDownloadsToAdd.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--theme-text-muted)]">
              All active downloads are already added to this queue.
            </div>
          ) : (
            availableDownloadsToAdd.map((d) => {
              const isChecked = selectedFileIdsToAdd.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedFileIdsToAdd((prev) =>
                      isChecked ? prev.filter((id) => id !== d.id) : [...prev, d.id]
                    );
                  }}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-[var(--theme-border-accent)] bg-[var(--theme-secondary-subtle)]'
                      : 'border-[var(--theme-border)] hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      sx={{ color: 'var(--theme-border-accent)', '&.Mui-checked': { color: 'var(--theme-primary)' }, p: 0 }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--theme-text-primary)] truncate max-w-sm">
                        {d.fileName}
                      </div>
                      <div className="text-[10px] text-[var(--theme-text-muted)] truncate max-w-sm">
                        {d.url}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono-stat text-[var(--theme-text-muted)] shrink-0">
                    {formatBytes(d.totalBytes || d.downloadedBytes || 0)}
                  </div>
                </div>
              );
            })
          )}
        </DialogContent>
        <DialogActions className="!px-6 !pb-4">
          <Button
            size="small"
            onClick={() => setIsAddFilesOpen(false)}
            className="!text-[var(--theme-text-muted)] !text-xs"
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={selectedFileIdsToAdd.length === 0}
            onClick={handleConfirmAddFiles}
            className="!bg-[var(--theme-primary)] !text-white !font-bold !text-xs !px-4 disabled:!opacity-40"
          >
            Add ({selectedFileIdsToAdd.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          className="!text-xs !font-semibold !rounded-xl"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
