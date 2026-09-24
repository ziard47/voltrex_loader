import React from 'react';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import {
  Zap,
  Activity,
  CheckCircle2,
  Server
} from 'lucide-react';
import { formatBytes, formatSpeed } from '../utils/formatters';

export default function ChunkMatrix({ task }) {
  if (!task) return null;

  const chunks = task.chunks || [];
  const hasChunks = chunks.length > 0;
  const isDownloading = task.status === 'DOWNLOADING';
  const isCompleted = task.status === 'COMPLETED';

  // Metrics
  const totalChunks = hasChunks ? chunks.length : (task.connections || 1);
  const completedChunks = hasChunks
    ? chunks.filter((c) => c.status === 'COMPLETED' || c.progress === 100).length
    : isCompleted ? 1 : 0;
  const activeChunks = hasChunks
    ? chunks.filter((c) => c.status === 'DOWNLOADING').length
    : isDownloading ? 1 : 0;

  if (!hasChunks) {
    return (
      <div className="px-4 py-3 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-accent)] flex items-center justify-between text-xs text-[var(--theme-text-muted)]">
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
    <div className="px-4 py-3 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-accent)] space-y-3 select-none">
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
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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

        <div className="h-3.5 w-full rounded-md bg-[#130d0d] border border-[var(--theme-border-accent)] overflow-hidden flex gap-[2px] p-[2px]">
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
                  className="relative flex-1 h-full rounded-[2px] bg-[#221717] overflow-hidden group cursor-pointer transition-all hover:opacity-90"
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
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : isActive
                  ? 'bg-[var(--theme-secondary-subtle)] border-[var(--theme-primary)]/50 shadow-sm'
                  : isError
                  ? 'bg-rose-950/20 border-rose-500/40'
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
                <span className={isActive ? 'text-[var(--theme-primary)] font-bold' : isDone ? 'text-emerald-400 font-bold' : ''}>
                  {chunkProg}%
                </span>
                <span className="truncate max-w-[55px] text-[8px]" title={`${formatBytes(chunk.downloadedBytes)} / ${formatBytes(chunk.totalBytes)}`}>
                  {formatBytes(chunk.downloadedBytes)}
                </span>
              </div>

              {/* Mini chunk progress bar */}
              <div className="w-full h-1 rounded-full bg-[#1e1313] overflow-hidden mb-1">
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
                  <span className="text-emerald-400">Done</span>
                ) : isActive ? (
                  <span className="text-[var(--theme-primary)]">
                    {chunk.speed > 0 ? formatSpeed(chunk.speed) : 'Streaming'}
                  </span>
                ) : isPaused ? (
                  <span className="text-amber-400">Paused</span>
                ) : isRetrying ? (
                  <span className="text-orange-400">Retrying</span>
                ) : isError ? (
                  <span className="text-rose-400">Error</span>
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
