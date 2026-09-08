import React, { useState } from 'react';
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
  Minus,
  Copy,
  Check
} from 'lucide-react';
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
          <Chip
            size="small"
            label="Downloading"
            className="!bg-[#8E1616]/25 !text-[#D84040] !border !border-[#D84040]/40 !font-semibold !text-[11px]"
          />
        );
      case 'QUEUED':
        return (
          <Chip
            size="small"
            label="Queued"
            className="!bg-[#2e1d1d] !text-[#EEEEEE] !border !border-[#8E1616]/40 !font-semibold !text-[11px]"
          />
        );
      case 'PAUSED':
        return (
          <Chip
            size="small"
            label="Paused"
            className="!bg-amber-500/15 !text-amber-400 !border !border-amber-500/30 !font-semibold !text-[11px]"
          />
        );
      case 'COMPLETED':
        return (
          <Chip
            size="small"
            label="Completed"
            className="!bg-emerald-500/15 !text-emerald-400 !border !border-emerald-500/30 !font-semibold !text-[11px]"
          />
        );
      case 'ERROR':
        return (
          <Chip
            size="small"
            label="Error"
            className="!bg-[#8E1616]/40 !text-[#D84040] !border !border-[#D84040]/50 !font-semibold !text-[11px]"
          />
        );
      case 'CANCELLED':
        return (
          <Chip
            size="small"
            label="Cancelled"
            className="!bg-[#241717] !text-[#b8a5a5] !border !border-[#8E1616]/30 !font-semibold !text-[11px]"
          />
        );
      default:
        return <Chip size="small" label={status} className="!text-[11px]" />;
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
      <TableContainer className="w-full h-full select-none overflow-x-hidden overflow-y-auto">
        <Table stickyHeader size="small" className="w-full table-fixed">
          <TableHead>
            <TableRow>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-auto min-w-[240px]">
                File Name
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[120px] whitespace-nowrap">
                Size
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[180px] whitespace-nowrap">
                Progress
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[110px] whitespace-nowrap">
                Status
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[100px] whitespace-nowrap">
                Speed
              </TableCell>
              <TableCell className="!bg-[#171010] !text-[#b8a5a5] !border-b !border-[#8E1616]/40 !text-[11px] !font-semibold !uppercase !tracking-wider w-[80px] whitespace-nowrap">
                ETA
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {downloads.map((task) => {
              const isDownloading = task.status === 'DOWNLOADING';
              const isPaused = task.status === 'PAUSED';
              const isCompleted = task.status === 'COMPLETED';
              const isError = task.status === 'ERROR';
              const isCancelled = task.status === 'CANCELLED';
              const isQueued = task.status === 'QUEUED';

              return (
                <TableRow
                  key={task.id}
                  hover
                  onContextMenu={(e) => handleContextMenu(e, task)}
                  onClick={() => setSelectedId(task.id)}
                  onDoubleClick={() => (isCompleted ? onOpenFile(task.id) : onShowInFolder(task.id))}
                  className={`hover:!bg-[#261a1a] transition-colors group cursor-pointer ${
                    selectedId === task.id || contextMenu?.task?.id === task.id
                      ? '!bg-[#8E1616]/20'
                      : ''
                  }`}
                >
                  {/* File Name & Path - expands to fill all available width */}
                  <TableCell className="!border-b !border-[#8E1616]/25 !py-2.5 overflow-hidden max-w-0">
                    <div className="flex items-center gap-2.5 w-full min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#241717] border border-[#8E1616]/40 flex items-center justify-center shrink-0">
                        {renderFileIcon(task.fileName, task.mimeType)}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div
                          className="text-xs font-semibold text-[#EEEEEE] truncate cursor-pointer hover:text-[#D84040] transition-colors"
                          title={task.fileName}
                          onClick={() => isCompleted ? onOpenFile(task.id) : null}
                        >
                          {task.fileName}
                        </div>
                        <div className="text-[10px] text-[#b8a5a5] truncate mt-0.5 font-mono" title={task.url}>
                          {task.url}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Size */}
                  <TableCell className="!border-b !border-[#8E1616]/25 !py-3 whitespace-nowrap">
                    <div className="font-mono-stat text-xs text-[#EEEEEE]">
                      {formatBytes(task.downloadedBytes)}
                    </div>
                    <div className="text-[10px] text-[#b8a5a5] font-mono-stat mt-0.5">
                      {task.totalBytes > 0 ? `of ${formatBytes(task.totalBytes)}` : 'Streamed'}
                    </div>
                  </TableCell>

                  {/* Progress Bar & Percent */}
                  <TableCell className="!border-b !border-[#8E1616]/25 !py-3 whitespace-nowrap">
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
                  <TableCell className="!border-b !border-[#8E1616]/25 !py-3 whitespace-nowrap">
                    {getStatusChip(task.status)}
                  </TableCell>

                  {/* Speed */}
                  <TableCell className="!border-b !border-[#8E1616]/25 !py-3 font-mono-stat text-xs text-[#EEEEEE] whitespace-nowrap">
                    {isDownloading ? (
                      <span className="text-[#D84040] font-semibold">{formatSpeed(task.speed)}</span>
                    ) : (
                      <span className="text-[#8E1616]">--</span>
                    )}
                  </TableCell>

                  {/* ETA */}
                  <TableCell className="!border-b !border-[#8E1616]/25 !py-3 font-mono-stat text-xs text-[#b8a5a5] whitespace-nowrap">
                    {isDownloading ? formatEta(task.eta) : '--'}
                  </TableCell>
                </TableRow>
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
          className: '!bg-[#1D1616] !border !border-[#8E1616]/50 !rounded-xl !shadow-2xl !py-1 !min-w-[240px] !text-[#EEEEEE]'
        }}
        MenuListProps={{
          className: '!py-0'
        }}
      >
        {contextMenu?.task && (
          <>
            {/* Context Menu Header */}
            <div className="px-3 py-2.5 border-b border-[#8E1616]/30 bg-[#160f0f] rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#241717] border border-[#8E1616]/40 flex items-center justify-center flex-shrink-0">
                  {renderFileIcon(contextMenu.task.fileName, contextMenu.task.mimeType)}
                </div>
                <span className="text-xs font-semibold text-[#EEEEEE] truncate max-w-[200px]" title={contextMenu.task.fileName}>
                  {contextMenu.task.fileName}
                </span>
              </div>
              <div className="text-[10px] text-[#b8a5a5] mt-1.5 flex justify-between items-center font-mono-stat">
                <span>
                  {contextMenu.task.totalBytes > 0
                    ? `${formatBytes(contextMenu.task.downloadedBytes)} / ${formatBytes(contextMenu.task.totalBytes)}`
                    : formatBytes(contextMenu.task.downloadedBytes)}
                </span>
                <span className="uppercase text-[9px] font-bold text-[#D84040]">
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
                  className="!text-xs !text-amber-400 hover:!bg-[#8E1616]/20 !py-2 !px-3"
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
                  className="!text-xs !text-emerald-400 hover:!bg-[#8E1616]/20 !py-2 !px-3"
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
                  className="!text-xs !text-[#b8a5a5] hover:!text-[#D84040] hover:!bg-[#8E1616]/20 !py-2 !px-3"
                >
                  <XSquare className="w-4 h-4 mr-2.5 text-rose-400" />
                  <span>Cancel Download</span>
                </MenuItem>
              )}
            </div>

            <div className="border-t border-[#8E1616]/30" />

            {/* File & Folder Actions */}
            <div className="py-1">
              <MenuItem
                disabled={contextMenu.task.status !== 'COMPLETED'}
                onClick={() => {
                  onOpenFile(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#EEEEEE] disabled:!text-[#6b5555] hover:!bg-[#8E1616]/20 !py-2 !px-3"
              >
                <ExternalLink className="w-4 h-4 mr-2.5 text-sky-400" />
                <span>Open File</span>
              </MenuItem>

              <MenuItem
                onClick={() => {
                  onShowInFolder(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#EEEEEE] hover:!bg-[#8E1616]/20 !py-2 !px-3"
              >
                <Folder className="w-4 h-4 mr-2.5 text-amber-400" />
                <span>Open Containing Folder</span>
              </MenuItem>
            </div>

            <div className="border-t border-[#8E1616]/30" />

            {/* Clipboard options */}
            <div className="py-1">
              <MenuItem
                onClick={() => {
                  copyToClipboard(contextMenu.task.url, 'Download link copied to clipboard');
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#EEEEEE] hover:!bg-[#8E1616]/20 !py-2 !px-3"
              >
                <Copy className="w-4 h-4 mr-2.5 text-[#b8a5a5]" />
                <span>Copy Download Link</span>
              </MenuItem>

              {contextMenu.task.savePath && (
                <MenuItem
                  onClick={() => {
                    copyToClipboard(contextMenu.task.savePath, 'File path copied to clipboard');
                    handleCloseContextMenu();
                  }}
                  className="!text-xs !text-[#EEEEEE] hover:!bg-[#8E1616]/20 !py-2 !px-3"
                >
                  <FileText className="w-4 h-4 mr-2.5 text-[#b8a5a5]" />
                  <span>Copy Save Path</span>
                </MenuItem>
              )}
            </div>

            <div className="border-t border-[#8E1616]/30" />

            {/* Priority Selector */}
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#b8a5a5] uppercase tracking-wider">
              Priority
            </div>
            <div className="flex px-3 pb-2 gap-1.5">
              {[
                { key: 'HIGH', label: 'High', icon: ArrowUp, color: 'text-[#D84040] border-[#D84040]/40 hover:bg-[#8E1616]/25' },
                { key: 'NORMAL', label: 'Normal', icon: Minus, color: 'text-[#EEEEEE] border-[#8E1616]/40 hover:bg-[#8E1616]/20' },
                { key: 'LOW', label: 'Low', icon: ArrowDown, color: 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10' }
              ].map(({ key, label, icon: Icon, color }) => {
                const isCur = (contextMenu.task.priority || 'NORMAL') === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onSetPriority(contextMenu.task.id, key);
                      handleCloseContextMenu();
                    }}
                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-medium border transition-colors flex items-center justify-center gap-1 ${
                      isCur ? '!border-[#D84040] !bg-[#8E1616]/50 !text-[#EEEEEE] font-bold shadow-sm' : color
                    }`}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-[#8E1616]/30" />

            {/* Removal & Deletion */}
            <div className="py-1">
              <MenuItem
                onClick={() => {
                  onDelete(contextMenu.task.id, false);
                  handleCloseContextMenu();
                }}
                className="!text-xs !text-[#b8a5a5] hover:!text-[#EEEEEE] hover:!bg-[#8E1616]/20 !py-2 !px-3"
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
                className="!text-xs !text-[#D84040] hover:!bg-rose-500/15 !py-2 !px-3"
              >
                <Trash2 className="w-4 h-4 mr-2.5 text-[#D84040]" />
                <span className="text-[#D84040] font-medium">Delete File from Disk...</span>
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
                  color: '#8E1616',
                  '&.Mui-checked': {
                    color: '#D84040'
                  }
                }}
              />
            }
            label={
              <span className="text-xs text-[#EEEEEE]/90">
                Also permanently delete the downloaded file from disk
              </span>
            }
          />
        </DialogContent>
        <DialogActions className="!px-6 !py-3 !border-t !border-[#8E1616]/30">
          <Button
            size="small"
            onClick={() => setDeleteModal({ open: false, task: null, deleteDisk: false })}
            className="!text-[#b8a5a5] hover:!text-white"
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            className="!bg-[#8E1616] hover:!bg-[#D84040] !text-[#EEEEEE] !font-medium"
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
            backgroundColor: '#1D1616',
            color: '#EEEEEE',
            border: '1px solid rgba(216, 64, 64, 0.5)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)'
          }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold backdrop-blur-md"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[#EEEEEE]">{toast.message}</span>
        </div>
      </Snackbar>
    </div>
  );
}
